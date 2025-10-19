from flask import request, jsonify
import jwt
import datetime
from database.connection import db
from config import APP_CONFIG

def init_auth_routes(app):
    
    @app.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        correo = data.get("email")
        contrasena = data.get("password")

        if not correo or not contrasena:
            return jsonify({"error": "Faltan datos"}), 400

        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()

            cur.execute(
                "SELECT id_usuario, nombre_usuario FROM usuarios WHERE correo = %s AND contrasena = %s",
                (correo, contrasena)
            )
            user = cur.fetchone()
            cur.close()
            db.close_connection(conn)

            if user:
                payload = {
                    "user_id": user[0],
                    "username": user[1],
                    "email": correo,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
                }
                token = jwt.encode(payload, APP_CONFIG['secret_key'], algorithm="HS256")
                return jsonify({"token": token, "user_id": user[0], "username": user[1]}), 200
            else:
                return jsonify({"error": "Credenciales inválidas"}), 401

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/register', methods=['POST'])
    def register():
        data = request.get_json()
        nombre = data.get("nombre_usuario")
        correo = data.get("correo")
        contrasena = data.get("contrasena")

        if not nombre or not correo or not contrasena:
            return jsonify({"error": "Faltan datos"}), 400

        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()

            cur.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
            if cur.fetchone():
                cur.close()
                db.close_connection(conn)
                return jsonify({"error": "Correo ya registrado"}), 409

            cur.execute(
                "INSERT INTO usuarios (nombre_usuario, correo, contrasena) VALUES (%s, %s, %s) RETURNING id_usuario",
                (nombre, correo, contrasena)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            db.close_connection(conn)

            return jsonify({"message": "Usuario registrado", "user_id": user_id}), 201

        except Exception as e:
            return jsonify({"error": str(e)}), 500