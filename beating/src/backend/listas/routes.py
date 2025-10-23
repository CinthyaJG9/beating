from flask import request, jsonify
from database.connection import db

def init_listas_routes(app):
    
    @app.route('/api/listas-reproduccion', methods=['GET'])
    def get_listas_reproduccion():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    l.id_lista, l.id_usuario, l.nombre_lista, l.fecha_creacion,
                    u.nombre_usuario,
                    COUNT(lc.id_cancion) as num_canciones
                FROM listas_reproduccion l
                JOIN usuarios u ON l.id_usuario = u.id_usuario
                LEFT JOIN listas_canciones lc ON l.id_lista = lc.id_lista
                GROUP BY l.id_lista, u.nombre_usuario
                ORDER BY l.fecha_creacion DESC
            """)
            listas = cur.fetchall()
            
            return jsonify([{
                'id_lista': l[0],
                'id_usuario': l[1],
                'nombre_lista': l[2],
                'fecha_creacion': l[3].isoformat() if l[3] else None,
                'nombre_usuario': l[4],
                'num_canciones': l[5]
            } for l in listas]), 200

        except Exception as e:
            print(f"Error en /api/listas-reproduccion: {e}")
            return jsonify({'error': 'Error al obtener listas de reproducción'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/listas-reproduccion/usuario/<int:id_usuario>', methods=['GET'])
    def get_listas_usuario(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    l.id_lista, l.nombre_lista, l.fecha_creacion,
                    COUNT(lc.id_cancion) as num_canciones
                FROM listas_reproduccion l
                LEFT JOIN listas_canciones lc ON l.id_lista = lc.id_lista
                WHERE l.id_usuario = %s
                GROUP BY l.id_lista
                ORDER BY l.fecha_creacion DESC
            """, (id_usuario,))
            
            listas = cur.fetchall()
            
            return jsonify([{
                'id_lista': l[0],
                'nombre_lista': l[1],
                'fecha_creacion': l[2].isoformat() if l[2] else None,
                'num_canciones': l[3]
            } for l in listas]), 200

        except Exception as e:
            print(f"Error en /api/listas-reproduccion/usuario/{id_usuario}: {e}")
            return jsonify({'error': 'Error al obtener listas del usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/listas-reproduccion/<int:id_lista>', methods=['GET'])
    def get_lista_detalle(id_lista):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Obtener información de la lista
            cur.execute("""
                SELECT l.id_lista, l.id_usuario, l.nombre_lista, l.fecha_creacion, u.nombre_usuario
                FROM listas_reproduccion l
                JOIN usuarios u ON l.id_usuario = u.id_usuario
                WHERE l.id_lista = %s
            """, (id_lista,))
            
            lista = cur.fetchone()
            if not lista:
                return jsonify({'error': 'Lista no encontrada'}), 404
            
            # Obtener canciones de la lista
            cur.execute("""
                SELECT c.id_cancion, c.titulo, c.artista, c.duracion_segundos, a.titulo as album_titulo
                FROM canciones c
                JOIN listas_canciones lc ON c.id_cancion = lc.id_cancion
                LEFT JOIN albumes a ON c.id_album = a.id_album
                WHERE lc.id_lista = %s
                ORDER BY lc.id_cancion
            """, (id_lista,))
            
            canciones = cur.fetchall()
            
            return jsonify({
                'id_lista': lista[0],
                'id_usuario': lista[1],
                'nombre_lista': lista[2],
                'fecha_creacion': lista[3].isoformat() if lista[3] else None,
                'nombre_usuario': lista[4],
                'canciones': [{
                    'id_cancion': c[0],
                    'titulo': c[1],
                    'artista': c[2],
                    'duracion_segundos': c[3],
                    'duracion_formateada': f"{c[3]//60}:{c[3]%60:02d}" if c[3] else None,
                    'album_titulo': c[4]
                } for c in canciones]
            }), 200

        except Exception as e:
            print(f"Error en /api/listas-reproduccion/{id_lista}: {e}")
            return jsonify({'error': 'Error al obtener lista'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/listas-reproduccion', methods=['POST'])
    def create_lista_reproduccion():
        conn = None
        try:
            data = request.get_json()
            id_usuario = data.get('id_usuario')
            nombre_lista = data.get('nombre_lista')
            
            if not id_usuario or not nombre_lista:
                return jsonify({'error': 'ID de usuario y nombre de lista son obligatorios'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO listas_reproduccion (id_usuario, nombre_lista) 
                VALUES (%s, %s) 
                RETURNING id_lista
            """, (id_usuario, nombre_lista))
            
            nueva_lista = cur.fetchone()
            conn.commit()
            
            return jsonify({
                'id_lista': nueva_lista[0],
                'message': 'Lista de reproducción creada exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/listas-reproduccion POST: {e}")
            return jsonify({'error': 'Error al crear lista de reproducción'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/listas-reproduccion/<int:id_lista>/canciones', methods=['POST'])
    def agregar_cancion_lista(id_lista):
        conn = None
        try:
            data = request.get_json()
            id_cancion = data.get('id_cancion')
            
            if not id_cancion:
                return jsonify({'error': 'ID de canción es obligatorio'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que la lista existe
            cur.execute("SELECT id_lista FROM listas_reproduccion WHERE id_lista = %s", (id_lista,))
            if not cur.fetchone():
                return jsonify({'error': 'Lista no encontrada'}), 404
            
            # Verificar que la canción existe
            cur.execute("SELECT id_cancion FROM canciones WHERE id_cancion = %s", (id_cancion,))
            if not cur.fetchone():
                return jsonify({'error': 'Canción no encontrada'}), 404
            
            # Verificar que la canción no está ya en la lista
            cur.execute("""
                SELECT id_lista FROM listas_canciones 
                WHERE id_lista = %s AND id_cancion = %s
            """, (id_lista, id_cancion))
            
            if cur.fetchone():
                return jsonify({'error': 'La canción ya está en la lista'}), 409
            
            # Agregar canción a la lista
            cur.execute("""
                INSERT INTO listas_canciones (id_lista, id_cancion) 
                VALUES (%s, %s)
            """, (id_lista, id_cancion))
            
            conn.commit()
            
            return jsonify({'message': 'Canción agregada a la lista exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/listas-reproduccion/{id_lista}/canciones POST: {e}")
            return jsonify({'error': 'Error al agregar canción a la lista'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/listas-reproduccion/<int:id_lista>/canciones/<int:id_cancion>', methods=['DELETE'])
    def eliminar_cancion_lista(id_lista, id_cancion):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                DELETE FROM listas_canciones 
                WHERE id_lista = %s AND id_cancion = %s
            """, (id_lista, id_cancion))
            
            if cur.rowcount == 0:
                return jsonify({'error': 'La canción no está en la lista'}), 404
            
            conn.commit()
            
            return jsonify({'message': 'Canción eliminada de la lista exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/listas-reproduccion/{id_lista}/canciones/{id_cancion} DELETE: {e}")
            return jsonify({'error': 'Error al eliminar canción de la lista'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)