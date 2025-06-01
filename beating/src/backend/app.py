from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import psycopg2
import datetime
from functools import wraps
from psycopg2 import pool

app = Flask(__name__)
CORS(app)

# Configuracion
app.config['SECRET_KEY'] = 'tu_clave_super_secreta'
app.config['POSTGRES_POOL'] = psycopg2.pool.SimpleConnectionPool(
    1, 20,
    database="beating_bd",
    user="postgres",
    password="856595J",
    host="localhost",
    port="5432"
)

def get_db_connection():
    return app.config['POSTGRES_POOL'].getconn()

def close_db_connection(conn):
    app.config['POSTGRES_POOL'].putconn(conn)

# Decorador JWT (sin cambios)
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Obtener token del header 'Authorization'
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token faltante!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # Añadimos los datos del usuario al request para usarlos en las rutas
            request.user = data
        except Exception as e:
            return jsonify({'message': 'Token inválido!', 'error': str(e)}), 401
            
        return f(*args, **kwargs)
    return decorated

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Consulta corregida (usa id_usuario y verifica nombre_usuario si es necesario)
        cur.execute(
            """SELECT id_usuario, nombre_usuario, correo 
               FROM usuarios 
               WHERE correo = %s AND contrasena = %s""", 
            (email, password)
        )
        user = cur.fetchone()
        cur.close()

        if user:
            payload = {
                "user_id": user[0],  # id_usuario
                "username": user[1], # nombre_usuario
                "email": user[2],   # correo
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
            }
            token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify({
                "token": token,
                "user_id": user[0],
                "username": user[1]
            })
        return jsonify({"error": "Credenciales inválidas"}), 401
        
    except Exception as e:
        if conn:
            conn.rollback()
        app.logger.error(f"Error en login: {str(e)}")
        return jsonify({"error": "Error en el servidor"}), 500
    finally:
        if conn:
            close_db_connection(conn)

#Funcion de registro
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nombre_usuario = data.get('nombre_usuario')
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    if not nombre_usuario or not correo or not contrasena:
        return jsonify({"error": "Faltan campos por llenar"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
        if cur.fetchone():
            cur.close()
            return jsonify({"error": "El e-mail ya ha sido registrado, intenta inciar sesión"}), 409

        cur.execute(
            "INSERT INTO usuarios (nombre_usuario, correo, contrasena) VALUES (%s, %s, %s) RETURNING id_usuario",
            (nombre_usuario, correo, contrasena)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()

        return jsonify({
            "message": "Usuario registrado, disfruta Beating",
            "user_id": user_id
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Error del servidor: {str(e)}"}), 500
    finally:
        if conn:
            close_db_connection(conn)

@app.route('/resenas', methods=['POST'])
def subir_resena():
    data = request.get_json()
    contenido = data.get('contenido')
    tipo = data.get('tipo') #Album o cancion

    if not contenido or not tipo:
        return jsonify({"error": "Nos faltan datos para procesar tu reseña:()"}), 400

    try:
        with open("resenas.csv", "a", encoding="utf-8") as f:
            f.write(f'"{tipo}","{contenido.replace(chr(34), chr(39))}"\n')
        return jsonify({"message": "Reseña guardada"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/perfil', methods=['GET'])
@token_required
def perfil():
    return jsonify({
        "mensaje": "Acceso autorizado",
        "usuario": request.user
    })

if __name__ == '__main__':
    app.run(debug=True)