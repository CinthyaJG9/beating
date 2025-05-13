from flask import Blueprint, request, jsonify
from db import get_connection
import jwt
import os
from datetime import datetime, timedelta

auth_routes = Blueprint('auth', __name__)

def create_token(email):
    payload = {
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")

@auth_routes.route('/login', methods=['POST'])
def login():
    data = request.json
    correo = data.get("email")
    password = data.get("password") 

    conn = get_connection()
    cur = conn.cursor()

    # Buscar si el correo existe en la BD
    cur.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
    user = cur.fetchone()

    cur.close()
    conn.close()

    if user:
        token = create_token(correo)
        return jsonify({"token": token}), 200
    else:
        return jsonify({"message": "Credenciales incorrectas"}), 401
