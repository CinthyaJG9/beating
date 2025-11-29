from flask import request, jsonify
from database.connection import db
import re

def init_resenas_routes(app):
    
    @app.route('/api/resenas', methods=['GET'])
    def get_resenas():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    r.id_resena, r.id_usuario, r.id_cancion, r.id_album,
                    r.texto_resena, r.fecha_creacion,
                    u.nombre_usuario,
                    c.titulo as cancion_titulo,
                    a.titulo as album_titulo,
                    s.etiqueta, s.puntuacion
                FROM resenas r
                JOIN usuarios u ON r.id_usuario = u.id_usuario
                LEFT JOIN canciones c ON r.id_cancion = c.id_cancion
                LEFT JOIN albumes a ON r.id_album = a.id_album
                LEFT JOIN sentimientos s ON r.id_resena = s.id_resena
                ORDER BY r.fecha_creacion DESC
            """)
            resenas = cur.fetchall()
            
            return jsonify([{
                'id_resena': r[0],
                'id_usuario': r[1],
                'id_cancion': r[2],
                'id_album': r[3],
                'texto_resena': r[4],
                'fecha_creacion': r[5].isoformat() if r[5] else None,
                'nombre_usuario': r[6],
                'cancion_titulo': r[7],
                'album_titulo': r[8],
                'sentimiento': r[9],
                'puntuacion': float(r[10]) if r[10] else None,
                'tipo': 'canción' if r[2] else 'álbum'
            } for r in resenas]), 200

        except Exception as e:
            print(f"Error en /api/resenas: {e}")
            return jsonify({'error': 'Error al obtener reseñas'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/resenas', methods=['POST'])
    def create_resena():
        conn = None
        try:
            data = request.get_json()
            id_usuario = data.get('id_usuario')
            id_cancion = data.get('id_cancion')
            id_album = data.get('id_album')
            texto_resena = data.get('texto_resena')
            
            if not id_usuario or not texto_resena:
                return jsonify({'error': 'ID de usuario y texto de reseña son obligatorios'}), 400
            
            # Validar que solo se reseñe canción o álbum, no ambos
            if not ((id_cancion and not id_album) or (not id_cancion and id_album)):
                return jsonify({'error': 'Debe proporcionar id_cancion O id_album, no ambos'}), 400
            
            # NUEVO: Detectar idioma y emojis
            emojis_presentes = re.findall(r'[^\w\s,.]', texto_resena)
            tiene_ingles = bool(re.search(r'[a-zA-Z]', texto_resena)) and not bool(re.search(r'[áéíóúñ]', texto_resena))
            idioma = 'inglés' if tiene_ingles else 'español'
            
            print(f"📝 Nueva reseña - Idioma: {idioma}, Emojis: {len(emojis_presentes)}")
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que no existe ya una reseña del mismo usuario para la misma entidad
            cur.execute("""
                SELECT id_resena FROM resenas 
                WHERE id_usuario = %s AND 
                      ((id_cancion = %s AND %s IS NOT NULL) OR 
                       (id_album = %s AND %s IS NOT NULL))
            """, (id_usuario, id_cancion, id_cancion, id_album, id_album))
            
            if cur.fetchone():
                return jsonify({'error': 'Ya existe una reseña de este usuario para esta entidad'}), 409
            
            # Insertar nueva reseña
            cur.execute("""
                INSERT INTO resenas (id_usuario, id_cancion, id_album, texto_resena) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id_resena
            """, (id_usuario, id_cancion, id_album, texto_resena))
            
            nueva_resena = cur.fetchone()
            
            # NUEVO: Usar el analizador de sentimientos multilingüe
            try:
                from reviews.sentiment import sentiment_analyzer
                sentimiento, puntuacion = sentiment_analyzer.analyze_text(texto_resena)
                print(f"🎭 Sentimiento detectado: {sentimiento}, Puntuación: {puntuacion}")
            except Exception as e:
                print(f"⚠️ Error en análisis de sentimientos, usando neutral: {e}")
                sentimiento, puntuacion = 'neutral', 0.5
            
            # Insertar sentimiento (ahora con análisis real)
            cur.execute("""
                INSERT INTO sentimientos (id_resena, etiqueta, puntuacion) 
                VALUES (%s, %s, %s)
            """, (nueva_resena[0], sentimiento, puntuacion))
            
            conn.commit()
            
            return jsonify({
                'id_resena': nueva_resena[0],
                'message': 'Reseña creada exitosamente',
                'sentimiento': sentimiento,
                'puntuacion': puntuacion,
                'idioma': idioma,
                'emojis_detectados': len(emojis_presentes)
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/resenas POST: {e}")
            return jsonify({'error': 'Error al crear reseña'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/resenas/<int:id_resena>', methods=['DELETE'])
    def delete_resena(id_resena):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar que la reseña existe
            cur.execute("SELECT id_resena FROM resenas WHERE id_resena = %s", (id_resena,))
            if not cur.fetchone():
                return jsonify({'error': 'Reseña no encontrada'}), 404
            
            cur.execute("DELETE FROM resenas WHERE id_resena = %s", (id_resena,))
            conn.commit()
            
            return jsonify({'message': 'Reseña eliminada exitosamente'}), 200

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/resenas/{id_resena} DELETE: {e}")
            return jsonify({'error': 'Error al eliminar reseña'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/resenas/usuario/<int:id_usuario>', methods=['GET'])
    def get_resenas_usuario(id_usuario):
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    r.id_resena, r.id_cancion, r.id_album,
                    r.texto_resena, r.fecha_creacion,
                    c.titulo as cancion_titulo, c.artista as cancion_artista,
                    a.titulo as album_titulo, a.artista as album_artista,
                    s.etiqueta, s.puntuacion
                FROM resenas r
                LEFT JOIN canciones c ON r.id_cancion = c.id_cancion
                LEFT JOIN albumes a ON r.id_album = a.id_album
                LEFT JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE r.id_usuario = %s
                ORDER BY r.fecha_creacion DESC
            """, (id_usuario,))
            
            resenas = cur.fetchall()
            
            return jsonify([{
                'id_resena': r[0],
                'id_cancion': r[1],
                'id_album': r[2],
                'texto_resena': r[3],
                'fecha_creacion': r[4].isoformat() if r[4] else None,
                'cancion_titulo': r[5],
                'cancion_artista': r[6],
                'album_titulo': r[7],
                'album_artista': r[8],
                'sentimiento': r[9],
                'puntuacion': float(r[10]) if r[10] else None,
                'tipo': 'canción' if r[1] else 'álbum'
            } for r in resenas]), 200

        except Exception as e:
            print(f"Error en /api/resenas/usuario/{id_usuario}: {e}")
            return jsonify({'error': 'Error al obtener reseñas del usuario'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)