from flask import request, jsonify
from database.connection import db

def init_seguimientos_routes(app):
    
    @app.route('/api/seguimientos', methods=['POST'])
    def seguir_usuario():
        conn = None
        try:
            data = request.get_json()
            id_seguidor = data.get('id_seguidor')
            id_seguido = data.get('id_seguido')
            
            if not id_seguidor or not id_seguido:
                return jsonify({'error': 'ID de seguidor y seguido son obligatorios'}), 400
            
            if id_seguidor == id_seguido:
                return jsonify({'error': 'No puedes seguirte a ti mismo'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que ambos usuarios existen
            cur.execute("SELECT id_usuario FROM usuarios WHERE id_usuario IN (%s, %s)", 
                       (id_seguidor, id_seguido))
            usuarios = cur.fetchall()
            
            if len(usuarios) != 2:
                return jsonify({'error': 'Uno o ambos usuarios no existen'}), 404
            
            # Verificar que no sigue ya al usuario
            cur.execute("""
                SELECT id_seguidor FROM seguimientos 
                WHERE id_seguidor = %s AND id_seguido = %s
            """, (id_seguidor, id_seguido))
            
            if cur.fetchone():
                return jsonify({'error': 'Ya sigues a este usuario'}), 409
            
            # Crear seguimiento
            cur.execute("""
                INSERT INTO seguimientos (id_seguidor, id_seguido) 
                VALUES (%s, %s)
            """, (id_seguidor, id_seguido))
            
            conn.commit()
            
            return jsonify({'message': 'Usuario seguido exitosamente'}), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/seguimientos POST: {e}")
            return jsonify({'error': 'Error al seguir usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/seguimientos/<int:id_seguidor>/<int:id_seguido>', methods=['DELETE'])
    def dejar_seguir(id_seguidor, id_seguido):
        conn = None
        try:
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