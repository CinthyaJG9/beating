from flask import request, jsonify
from database.connection import db
from werkzeug.security import generate_password_hash, check_password_hash

def init_usuarios_routes(app):
    
    @app.route('/api/usuarios', methods=['GET'])
    def get_usuarios():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT id_usuario, nombre_usuario, correo, fecha_creacion 
                FROM usuarios 
                ORDER BY fecha_creacion DESC
            """)
            usuarios = cur.fetchall()
            
            return jsonify([{
                'id_usuario': u[0],
                'nombre_usuario': u[1],
                'correo': u[2],
                'fecha_creacion': u[3].isoformat() if u[3] else None
            } for u in usuarios]), 200

        except Exception as e:
            print(f"Error en /api/usuarios: {e}")
            return jsonify({'error': 'Error al obtener usuarios'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>', methods=['GET'])
    def get_usuario(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT id_usuario, nombre_usuario, correo, fecha_creacion 
                FROM usuarios 
                WHERE id_usuario = %s
            """, (id_usuario,))
            usuario = cur.fetchone()
            
            if not usuario:
                return jsonify({'error': 'Usuario no encontrado'}), 404
                
            return jsonify({
                'id_usuario': usuario[0],
                'nombre_usuario': usuario[1],
                'correo': usuario[2],
                'fecha_creacion': usuario[3].isoformat() if usuario[3] else None
            }), 200

        except Exception as e:
            print(f"Error en /api/usuarios/{id_usuario}: {e}")
            return jsonify({'error': 'Error al obtener usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios', methods=['POST'])
    def create_usuario():
        conn = None
        try:
            data = request.get_json()
            nombre_usuario = data.get('nombre_usuario')
            correo = data.get('correo')
            contrasena = data.get('contrasena')
            
            if not nombre_usuario or not correo or not contrasena:
                return jsonify({'error': 'Faltan campos obligatorios'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar si el usuario o correo ya existen
            cur.execute("SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s OR correo = %s", 
                       (nombre_usuario, correo))
            if cur.fetchone():
                return jsonify({'error': 'El nombre de usuario o correo ya existe'}), 409
            
            # Hash de la contraseña
            contrasena_hash = generate_password_hash(contrasena)
            
            # Insertar nuevo usuario
            cur.execute("""
                INSERT INTO usuarios (nombre_usuario, correo, contrasena) 
                VALUES (%s, %s, %s) 
                RETURNING id_usuario, nombre_usuario, correo, fecha_creacion
            """, (nombre_usuario, correo, contrasena_hash))
            
            nuevo_usuario = cur.fetchone()
            conn.commit()
            
            return jsonify({
                'id_usuario': nuevo_usuario[0],
                'nombre_usuario': nuevo_usuario[1],
                'correo': nuevo_usuario[2],
                'fecha_creacion': nuevo_usuario[3].isoformat() if nuevo_usuario[3] else None,
                'message': 'Usuario creado exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/usuarios POST: {e}")
            return jsonify({'error': 'Error al crear usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>', methods=['PUT'])
    def update_usuario(id_usuario):
        conn = None
        try:
            data = request.get_json()
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que el usuario existe
            cur.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (id_usuario,))
            if not cur.fetchone():
                return jsonify({'error': 'Usuario no encontrado'}), 404
            
            update_fields = []
            values = []
            
            if 'nombre_usuario' in data:
                update_fields.append("nombre_usuario = %s")
                values.append(data['nombre_usuario'])
            
            if 'correo' in data:
                update_fields.append("correo = %s")
                values.append(data['correo'])
            
            if 'contrasena' in data:
                update_fields.append("contrasena = %s")
                values.append(generate_password_hash(data['contrasena']))
            
            if not update_fields:
                return jsonify({'error': 'No hay campos para actualizar'}), 400
            
            values.append(id_usuario)
            query = f"UPDATE usuarios SET {', '.join(update_fields)} WHERE id_usuario = %s"
            
            cur.execute(query, values)
            conn.commit()
            
            return jsonify({'message': 'Usuario actualizado exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/usuarios/{id_usuario} PUT: {e}")
            return jsonify({'error': 'Error al actualizar usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
    def delete_usuario(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que el usuario existe
            cur.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (id_usuario,))
            if not cur.fetchone():
                return jsonify({'error': 'Usuario no encontrado'}), 404
            
            cur.execute("DELETE FROM usuarios WHERE id_usuario = %s", (id_usuario,))
            conn.commit()
            
            return jsonify({'message': 'Usuario eliminado exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/usuarios/{id_usuario} DELETE: {e}")
            return jsonify({'error': 'Error al eliminar usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)