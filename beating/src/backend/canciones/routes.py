from flask import request, jsonify
from database.connection import db
from spotify.client import spotify_client 
from collections import Counter 

def init_canciones_routes(app):
    
    @app.route('/api/canciones', methods=['GET'])
    def get_canciones():
        conn = None
        cur = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    c.id_cancion, c.titulo, c.artista, c.duracion_segundos, 
                    c.id_album, a.titulo as album_titulo
                FROM canciones c
                LEFT JOIN albumes a ON c.id_album = a.id_album
                ORDER BY c.titulo
            """)
            canciones = cur.fetchall()
            
            items = [{
                'id_cancion': c[0],
                'titulo': c[1],
                'artista': c[2],
                'duracion_segundos': c[3],
                'id_album': c[4],
                'album_titulo': c[5],
                'duracion_formateada': f"{c[3]//60}:{c[3]%60:02d}" if c[3] else None
            } for c in canciones]

            return jsonify(items), 200

        except Exception as e:
            print(f"Error en /api/canciones: {e}")
            return jsonify({'error': 'Error al obtener canciones'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/canciones/<int:id_cancion>', methods=['GET'])
    def get_cancion(id_cancion):
        conn = None
        cur = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                SELECT 
                    c.id_cancion, c.titulo, c.artista, c.duracion_segundos, 
                    c.id_album, a.titulo as album_titulo, a.artista as album_artista
                FROM canciones c
                LEFT JOIN albumes a ON c.id_album = a.id_album
                WHERE c.id_cancion = %s
            """, (id_cancion,))
            
            cancion = cur.fetchone()
            if not cancion:
                return jsonify({'error': 'Canción no encontrada'}), 404
            
            # géneros
            cur.execute("""
                SELECT g.id_genero, g.nombre_genero
                FROM generos g
                JOIN canciones_generos cg ON g.id_genero = cg.id_genero
                WHERE cg.id_cancion = %s
            """, (id_cancion,))
            generos = cur.fetchall()
            
            # reseñas
            cur.execute("""
                SELECT r.id_resena, r.texto_resena, r.fecha_creacion, 
                       u.nombre_usuario, s.etiqueta, s.puntuacion
                FROM resenas r
                JOIN usuarios u ON r.id_usuario = u.id_usuario
                LEFT JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE r.id_cancion = %s
                ORDER BY r.fecha_creacion DESC
            """, (id_cancion,))
            
            resenas = cur.fetchall()
            
            return jsonify({
                'id_cancion': cancion[0],
                'titulo': cancion[1],
                'artista': cancion[2],
                'duracion_segundos': cancion[3],
                'duracion_formateada': f"{cancion[3]//60}:{cancion[3]%60:02d}" if cancion[3] else None,
                'id_album': cancion[4],
                'album_titulo': cancion[5],
                'album_artista': cancion[6],
                'generos': [{'id_genero': g[0], 'nombre_genero': g[1]} for g in generos],
                'reseñas': [{
                    'id_resena': r[0],
                    'texto_resena': r[1],
                    'fecha_creacion': r[2].isoformat() if r[2] else None,
                    'nombre_usuario': r[3],
                    'sentimiento': r[4],
                    'puntuacion': float(r[5]) if r[5] else None
                } for r in resenas]
            }), 200

        except Exception as e:
            print(f"Error en /api/canciones/{id_cancion}: {e}")
            return jsonify({'error': 'Error al obtener canción'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/canciones', methods=['POST'])
    def create_cancion():
        conn = None
        cur = None
        try:
            data = request.get_json()
            titulo = data.get('titulo')
            artista = data.get('artista')
            duracion_segundos = data.get('duracion_segundos')
            id_album = data.get('id_album')
            
            if not titulo or not artista:
                return jsonify({'error': 'Título y artista son obligatorios'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO canciones (titulo, artista, duracion_segundos, id_album) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id_cancion
            """, (titulo, artista, duracion_segundos, id_album))
            
            nueva_cancion = cur.fetchone()
            conn.commit()
            
            return jsonify({
                'id_cancion': nueva_cancion[0],
                'message': 'Canción creada exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/canciones POST: {e}")
            return jsonify({'error': 'Error al crear canción'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/canciones/buscar', methods=['GET'])
    def buscar_canciones():
        try:
            print(f"🔍 DEBUG: Buscando canciones con término: '{request.args.get('q', '')}'")
            
            search_term = request.args.get('q', '').strip()
            limit = int(request.args.get('limit', 20))
            
            if search_term == "":
                return jsonify([]), 200
            
            # Verificar que Spotify está disponible
            if not spotify_client.sp_search:
                print("❌ ERROR: Spotify client no está disponible")
                return jsonify({'error': 'Servicio de Spotify no disponible'}), 500
            
            print("✅ Spotify client disponible, realizando búsqueda...")
            
            # Buscar en Spotify
            try:
                results = spotify_client.sp_search.search(
                    q=search_term, 
                    type='track', 
                    limit=limit
                )
                print(f"✅ Spotify retornó {len(results['tracks']['items'])} resultados")
            except Exception as spotify_error:
                print(f"❌ Error en búsqueda de Spotify: {spotify_error}")
                return jsonify({'error': f'Error en búsqueda de Spotify: {str(spotify_error)}'}), 500
            
            canciones_spotify = []
            
            for track in results['tracks']['items']:
                try:
                    # Extraer información de Spotify
                    cancion_info = {
                        'id_spotify': track['id'],
                        'titulo': track['name'],
                        'artista': track['artists'][0]['name'] if track['artists'] else 'Artista desconocido',
                        'duracion_segundos': track['duration_ms'] // 1000,
                        'duracion_formateada': f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02d}",
                        'album_titulo': track['album']['name'],
                        'imagen_url': track['album']['images'][0]['url'] if track['album']['images'] else None,
                        'preview_url': track.get('preview_url'),
                        'spotify_url': track['external_urls']['spotify'],
                        'popularidad': track['popularity'],
                        'existe_en_bd': False,  # Valor por defecto
                        'id_cancion': None,
                        'total_resenas': 0,
                        'rating_promedio': 0,
                        'reseñas_recientes': [],
                        'palabras_clave': []
                    }
                    
                    # Verificar si existe en nuestra base de datos
                    conn = db.get_connection()
                    if conn:
                        try:
                            cur = conn.cursor()
                            
                            # Buscar si ya tenemos esta canción
                            cur.execute("""
                                SELECT id_cancion FROM canciones 
                                WHERE titulo ILIKE %s AND artista ILIKE %s
                                LIMIT 1
                            """, (cancion_info['titulo'], cancion_info['artista']))
                            
                            existing_song = cur.fetchone()
                            
                            if existing_song:
                                cancion_id = existing_song[0]
                                cancion_info['id_cancion'] = cancion_id
                                cancion_info['existe_en_bd'] = True
                                
                                # Obtener reseñas de nuestra BD
                                cur.execute("""
                                    SELECT r.texto_resena, s.etiqueta, u.nombre_usuario, s.puntuacion
                                    FROM resenas r
                                    JOIN usuarios u ON r.id_usuario = u.id_usuario
                                    LEFT JOIN sentimientos s ON r.id_resena = s.id_resena
                                    WHERE r.id_cancion = %s
                                    ORDER BY r.fecha_creacion DESC
                                    LIMIT 3
                                """, (cancion_id,))
                                
                                reseñas_recientes = cur.fetchall()
                                
                                # Contar total de reseñas
                                cur.execute("SELECT COUNT(*) FROM resenas WHERE id_cancion = %s", (cancion_id,))
                                total_resenas = cur.fetchone()[0]
                                cancion_info['total_resenas'] = total_resenas
                                
                                # Calcular rating promedio
                                cur.execute("""
                                    SELECT AVG(s.puntuacion) FROM sentimientos s
                                    JOIN resenas r ON s.id_resena = r.id_resena
                                    WHERE r.id_cancion = %s
                                """, (cancion_id,))
                                rating_result = cur.fetchone()
                                cancion_info['rating_promedio'] = float(rating_result[0]) if rating_result[0] else 0
                                
                                # Extraer palabras clave
                                cancion_info['palabras_clave'] = extraer_palabras_clave(conn, cancion_id)
                                cancion_info['reseñas_recientes'] = [{
                                    'texto': r[0],
                                    'sentimiento': r[1],
                                    'usuario': r[2],
                                    'puntuacion': float(r[3]) if r[3] else None
                                } for r in reseñas_recientes]
                                
                            cur.close()
                            
                        except Exception as db_error:
                            print(f"❌ Error en consulta BD para {cancion_info['titulo']}: {db_error}")
                        finally:
                            db.close_connection(conn)
                    
                    canciones_spotify.append(cancion_info)
                    
                except Exception as track_error:
                    print(f"❌ Error procesando track {track.get('name', 'unknown')}: {track_error}")
                    continue
            
            print(f"✅ Retornando {len(canciones_spotify)} canciones")
            return jsonify(canciones_spotify), 200

        except Exception as e:
            print(f"❌ ERROR GENERAL en /api/canciones/buscar: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Error interno del servidor'}), 500

    @app.route('/api/canciones/agregar-desde-spotify', methods=['POST'])
    def agregar_cancion_desde_spotify():
        conn = None
        cur = None
        try:
            data = request.get_json()
            titulo = data.get('titulo')
            artista = data.get('artista')
            duracion_segundos = data.get('duracion_segundos')
            album_titulo = data.get('album_titulo')
            
            if not titulo or not artista:
                return jsonify({'error': 'Título y artista son obligatorios'}), 400
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar si el álbum existe, si no, crearlo
            cur.execute("SELECT id_album FROM albumes WHERE titulo = %s AND artista = %s", 
                       (album_titulo, artista))
            album = cur.fetchone()
            
            id_album = None
            if album:
                id_album = album[0]
            elif album_titulo:
                cur.execute("""
                    INSERT INTO albumes (titulo, artista) 
                    VALUES (%s, %s) 
                    RETURNING id_album
                """, (album_titulo, artista))
                id_album = cur.fetchone()[0]
            
            # Insertar la canción
            cur.execute("""
                INSERT INTO canciones (titulo, artista, duracion_segundos, id_album) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id_cancion
            """, (titulo, artista, duracion_segundos, id_album))
            
            nueva_cancion_id = cur.fetchone()[0]
            conn.commit()
            
            return jsonify({
                'id_cancion': nueva_cancion_id,
                'message': 'Canción agregada exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error en /api/canciones/agregar-desde-spotify: {e}")
            return jsonify({'error': 'Error al agregar canción'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    # Función auxiliar para extraer palabras clave
    def extraer_palabras_clave(conn, id_cancion):
        cur = None
        try:
            cur = conn.cursor()
            cur.execute("SELECT texto_resena FROM resenas WHERE id_cancion = %s", (id_cancion,))
            
            res = cur.fetchall()
            if not res:
                return []
            
            texto_completo = ' '.join([r[0] for r in res if r[0]])
            
            stop_words = {'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 
                        'y', 'o', 'pero', 'porque', 'como', 'que', 'en', 'a', 'con', 'sin',
                        'sobre', 'bajo', 'entre', 'hacia', 'desde', 'muy', 'mucho', 'poco',
                        'tan', 'tanto', 'esto', 'esta', 'ese', 'esa', 'aquello', 'aquella',
                        'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
                        'me', 'te', 'le', 'nos', 'os', 'les', 'mi', 'tu', 'su', 'nuestro',
                        'vuestro', 'su', 'mío', 'tuyo', 'suyo', 'para', 'por', 'se', 'lo'}
            
            palabras = texto_completo.lower().split()
            palabras_filtradas = [p.strip(".,;:¡!¿?()[]\"'") for p in palabras if len(p) > 3 and p not in stop_words]
            
            contador = Counter(palabras_filtradas)
            palabras_comunes = contador.most_common(5)
            
            return [palabra for palabra, count in palabras_comunes]
            
        except Exception as e:
            print(f"Error extrayendo palabras clave: {e}")
            return []
        finally:
            if cur:
                cur.close()