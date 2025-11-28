from flask import request, jsonify
from database.connection import db
from functools import wraps
import jwt
from config import APP_CONFIG

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({"error": "Token de autorización faltante"}), 401
        
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({"error": "Formato de token inválido. Use: Bearer <token>"}), 401
                
            token = parts[1]
            # Decodificación del token para obtener el ID del usuario
            data = jwt.decode(token, APP_CONFIG['secret_key'], algorithms=['HS256'])
            # 🛑 ESTABLECEMOS EL ID DEL SEGUIDOR DESDE EL TOKEN
            request.user_id = data['user_id']
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401
        except Exception:
            return jsonify({"error": "Error procesando token"}), 401
            
        return f(*args, **kwargs)
    return decorated

def init_seguimientos_routes(app):
    
    @app.route('/api/seguimientos', methods=['POST'])
    @token_required
    def seguir_usuario():
        conn = None
        cur = None
        try:
            id_seguidor = request.user_id 
            data = request.get_json()
            id_seguido = data.get('id_seguido')
            
            if not id_seguidor or not id_seguido:
                return jsonify({'error': 'ID de seguidor y seguido son obligatorios'}), 400
            
            if int(id_seguidor) == int(id_seguido):
                return jsonify({'error': 'No puedes seguirte a ti mismo'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # 1. Verificar si ya existe el seguimiento
            cur.execute("""
                SELECT id_seguidor FROM seguimientos 
                WHERE id_seguidor = %s AND id_seguido = %s
            """, (id_seguidor, id_seguido))
            
            if cur.fetchone():
                return jsonify({'error': 'Ya sigues a este usuario'}), 409
            
            # Opcional: Verificar que el usuario a seguir existe
            # Nota: Si id_seguido es una FK, la inserción fallará automáticamente si no existe.
            
            # 2. 🛑 CORRECCIÓN: INSERTAR el nuevo seguimiento
            cur.execute("""
                INSERT INTO seguimientos (id_seguidor, id_seguido) 
                VALUES (%s, %s)
            """, (id_seguidor, id_seguido))
            
            # 3. Guardar los cambios en la base de datos
            conn.commit()

            return jsonify({'message': 'Usuario seguido exitosamente'}), 201
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/seguimientos POST: {e}")
            # Si la inserción falló (e.g., por una FK), puedes retornar un error más específico.
            return jsonify({'error': 'Error al seguir usuario (posiblemente ID no existe)'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/seguimientos/<int:id_seguido>', methods=['DELETE'])
    @token_required
    def dejar_seguir(id_seguido):
        conn = None
        cur = None
        try:
            id_seguidor = request.user_id 
            conn = db.get_connection()

            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                DELETE FROM seguimientos 
                WHERE id_seguidor = %s AND id_seguido = %s
            """, (id_seguidor, id_seguido))
            
            if cur.rowcount == 0:
                return jsonify({'error': 'No sigues a este usuario'}), 404
            
            conn.commit()
            
            return jsonify({'message': 'Dejado de seguir exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/seguimientos/{id_seguidor}/{id_seguido} DELETE: {e}")
            return jsonify({'error': 'Error al dejar de seguir usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/seguimientos/estado/<int:id_seguido>', methods=['GET'])
    @token_required # 🛑 PROTEGIDO
    def verificar_seguimiento(id_seguido):
        conn = None
        cur = None
        try:
            id_seguidor = request.user_id
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
            cur = conn.cursor()
            
            cur.execute("""
                SELECT COUNT(*) FROM seguimientos 
                WHERE id_seguidor = %s AND id_seguido = %s
            """, (id_seguidor, id_seguido))
            
            is_following = cur.fetchone()[0] > 0
            
            return jsonify({'is_following': is_following}), 200
            
        except Exception as e:
            print(f"Error en /api/seguimientos/estado: {e}")
            return jsonify({'error': 'Error al verificar seguimiento'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>/seguidores', methods=['GET'])
    def get_seguidores(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    s.id_seguidor, s.fecha_seguimiento,
                    u.nombre_usuario, u.correo
                FROM seguimientos s
                JOIN usuarios u ON s.id_seguidor = u.id_usuario
                WHERE s.id_seguido = %s
                ORDER BY s.fecha_seguimiento DESC
            """, (id_usuario,))
            
            seguidores = cur.fetchall()
            
            return jsonify([{
                'id_seguidor': s[0],
                'fecha_seguimiento': s[1].isoformat() if s[1] else None,
                'nombre_usuario': s[2],
                'correo': s[3]
            } for s in seguidores]), 200

        except Exception as e:
            print(f"Error en /api/usuarios/{id_usuario}/seguidores: {e}")
            return jsonify({'error': 'Error al obtener seguidores'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>/seguidos', methods=['GET'])
    def get_seguidos(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    s.id_seguido, s.fecha_seguimiento,
                    u.nombre_usuario, u.correo
                FROM seguimientos s
                JOIN usuarios u ON s.id_seguido = u.id_usuario
                WHERE s.id_seguidor = %s
                ORDER BY s.fecha_seguimiento DESC
            """, (id_usuario,))
            
            seguidos = cur.fetchall()
            
            return jsonify([{
                'id_seguido': s[0],
                'fecha_seguimiento': s[1].isoformat() if s[1] else None,
                'nombre_usuario': s[2],
                'correo': s[3]
            } for s in seguidos]), 200

        except Exception as e:
            print(f"Error en /api/usuarios/{id_usuario}/seguidos: {e}")
            return jsonify({'error': 'Error al obtener usuarios seguidos'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/usuarios/<int:id_usuario>/estadisticas', methods=['GET'])
    def get_estadisticas_usuario(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Contar seguidores
            cur.execute("SELECT COUNT(*) FROM seguimientos WHERE id_seguido = %s", (id_usuario,))
            num_seguidores = cur.fetchone()[0]
            
            # Contar seguidos
            cur.execute("SELECT COUNT(*) FROM seguimientos WHERE id_seguidor = %s", (id_usuario,))
            num_seguidos = cur.fetchone()[0]
            
            # Contar reseñas
            cur.execute("SELECT COUNT(*) FROM resenas WHERE id_usuario = %s", (id_usuario,))
            num_resenas = cur.fetchone()[0]
            
            # Contar listas de reproducción
            cur.execute("SELECT COUNT(*) FROM listas_reproduccion WHERE id_usuario = %s", (id_usuario,))
            num_listas = cur.fetchone()[0]
            
            return jsonify({
                'id_usuario': id_usuario,
                'estadisticas': {
                    'seguidores': num_seguidores,
                    'seguidos': num_seguidos,
                    'resenas': num_resenas,
                    'listas_reproduccion': num_listas
                }
            }), 200

        except Exception as e:
            print(f"Error en /api/usuarios/{id_usuario}/estadisticas: {e}")
            return jsonify({'error': 'Error al obtener estadísticas'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)