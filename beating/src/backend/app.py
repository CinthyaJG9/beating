from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import psycopg2

app = Flask(__name__)
CORS(app)

# Conexión a PostgreSQL
conn = psycopg2.connect(database="beating_bd", user="postgres", password="admin", host="localhost", port="5432")
cursor = conn.cursor()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # Verificamos si el usuario existe y coincide la contraseña
    cur = conn.cursor()
    cur.execute("SELECT * FROM usuarios WHERE correo = %s AND contrasena = %s", (email, password))
    user = cur.fetchone()
    cur.close()

    if user:
        token = jwt.encode({"user_id": user[0]}, "secreto", algorithm="HS256")
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Correo o contraseña incorrectos"}), 401
@app.route("/test-db", methods=["GET"])
def test_db():
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM usuarios;")
        usuarios = cur.fetchall()
        cur.close()
        return jsonify({"usuarios": usuarios})
    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == '__main__':
    app.run(debug=True)
