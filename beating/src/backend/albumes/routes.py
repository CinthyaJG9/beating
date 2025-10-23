from flask import request, jsonify
from database.connection import db

def init_albumes_routes(app):
    
    @app.route('/api/albumes', methods=['GET'])
    def get_albumes():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT id_album, titulo, artista, anio_lanzamiento 
                FROM albumes 
                ORDER BY anio_lanzamiento DESC, titulo
            """)
            albumes = cur.fetchall()
            
            return jsonify([{
                'id_album': a[0],
                'titulo': a[1],
                'artista': a[2],
                'anio_lanzamiento': a[3]
            } for a in albumes]), 200

        except Exception as e:
            print(f"Error en /api/albumes: {e}")
            return jsonify({'error': 'Error al obtener álbumes'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/albumes/<int:id_album>', methods=['GET'])
    def get_album(id_album):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Obtener información del álbum
            cur.execute("""
                SELECT id_album, titulo, artista, anio_lanzamiento 
                FROM albumes 
                WHERE id_album = %s
            """, (id_album,))
            
            album = cur.fetchone()
            if not album:
                return jsonify({'error': 'Álbum no encontrado'}), 404
            
            # Obtener canciones del álbum
            cur.execute("""
                SELECT id_cancion, titulo, artista, duracion_segundos
                FROM canciones
                WHERE id_album = %s
                ORDER BY id_cancion
            """, (id_album,))
            
            canciones = cur.fetchall()
            
            # Obtener reseñas del álbum
            cur.execute("""
                SELECT r.id_resena, r.texto_resena, r.fecha_creacion, 
                       u.nombre_usuario, s.etiqueta, s.puntuacion
                FROM resenas r
                JOIN usuarios u ON r.id_usuario = u.id_usuario
                LEFT JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE r.id_album = %s
                ORDER BY r.fecha_creacion DESC
            """, (id_album,))
            
            reseñas = cur.fetchall()
            
            return jsonify({
                'id_album': album[0],
                'titulo': album[1],
                'artista': album[2],
                'anio_lanzamiento': album[3],
                'canciones': [{
                    'id_cancion': c[0],
                    'titulo': c[1],
                    'artista': c[2],
                    'duracion_segundos': c[3],
                    'duracion_formateada': f"{c[3]//60}:{c[3]%60:02d}" if c[3] else None
                } for c in canciones],
                'reseñas': [{
                    'id_resena': r[0],
                    'texto_resena': r[1],
                    'fecha_creacion': r[2].isoformat() if r[2] else None,
                    'nombre_usuario': r[3],
                    'sentimiento': r[4],
                    'puntuacion': float(r[5]) if r[5] else None
                } for r in reseñas]
            }), 200

        except Exception as e:
            print(f"Error en /api/albumes/{id_album}: {e}")
            return jsonify({'error': 'Error al obtener álbum'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/albumes', methods=['POST'])
    def create_album():
        conn = None
        try:
            data = request.get_json()
            titulo = data.get('titulo')
            artista = data.get('artista')
            anio_lanzamiento = data.get('anio_lanzamiento')
            
            if not titulo or not artista:
                return jsonify({'error': 'Título y artista son obligatorios'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO albumes (titulo, artista, anio_lanzamiento) 
                VALUES (%s, %s, %s) 
                RETURNING id_album
            """, (titulo, artista, anio_lanzamiento))
            
            nuevo_album = cur.fetchone()
            conn.commit()
            
            return jsonify({
                'id_album': nuevo_album[0],
                'message': 'Álbum creado exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/albumes POST: {e}")
            return jsonify({'error': 'Error al crear álbum'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)