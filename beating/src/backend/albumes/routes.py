# src/routes/albumes.py (VERSIÓN CORREGIDA)
from flask import request, jsonify
from database.connection import db
from spotify.client import spotify_client

def init_albumes_routes(app):
    
    @app.route('/api/albumes/buscar', methods=['GET'])
    def buscar_albumes():
        try:
            search_term = request.args.get('q', '').strip()
            if not search_term:
                return jsonify([]), 200
            
            print(f"🔍 Buscando álbumes: '{search_term}'")
            
            # Buscar en Spotify
            results = spotify_client.sp_search.search(
                q=search_term, 
                type='album', 
                limit=20
            )
            
            print(f"✅ Resultados de Spotify: {len(results['albums']['items'])} álbumes")
            
            albumes_spotify = []
            
            for album in results['albums']['items']:  # CORRECCIÓN: 'albums' no 'albumes'
                try:
                    # Info básica de Spotify
                    album_info = {
                        'id_spotify': album['id'],
                        'titulo': album['name'],
                        'artista': album['artists'][0]['name'] if album['artists'] else 'Artista desconocido',
                        'imagen_url': album['images'][0]['url'] if album['images'] else None,
                        'fecha_lanzamiento': album['release_date'],
                        'total_canciones': album['total_tracks'],
                        'spotify_url': album['external_urls']['spotify'],
                        'popularidad': album.get('popularity', 0),
                        'existe_en_bd': False,  # Por defecto
                        'id_album': None,
                        'total_resenas': 0,
                        'rating_promedio': 0
                    }
                    
                    # Verificar si existe en nuestra BD (por título y artista)
                    conn = db.get_connection()
                    if conn:
                        try:
                            cur = conn.cursor()
                            cur.execute("""
                                SELECT id_album FROM albumes 
                                WHERE titulo ILIKE %s AND artista ILIKE %s
                                LIMIT 1
                            """, (album_info['titulo'], album_info['artista']))
                            
                            existing_album = cur.fetchone()
                            
                            if existing_album:
                                album_id = existing_album[0]
                                album_info['id_album'] = album_id
                                album_info['existe_en_bd'] = True
                                
                                # Contar reseñas del álbum
                                cur.execute("""
                                    SELECT COUNT(*) FROM resenas 
                                    WHERE id_album = %s
                                """, (album_id,))
                                total_resenas = cur.fetchone()[0]
                                album_info['total_resenas'] = total_resenas
                                
                                # Calcular rating promedio
                                cur.execute("""
                                    SELECT AVG(s.puntuacion) 
                                    FROM sentimientos s
                                    JOIN resenas r ON s.id_resena = r.id_resena
                                    WHERE r.id_album = %s
                                """, (album_id,))
                                rating_result = cur.fetchone()
                                album_info['rating_promedio'] = float(rating_result[0]) if rating_result[0] else 0
                                
                            cur.close()
                        except Exception as db_error:
                            print(f"Error en consulta BD: {db_error}")
                        finally:
                            db.close_connection(conn)
                    
                    albumes_spotify.append(album_info)
                    
                except Exception as album_error:
                    print(f"❌ Error procesando álbum: {album_error}")
                    continue
            
            print(f"✅ Retornando {len(albumes_spotify)} álbumes")
            return jsonify(albumes_spotify), 200
            
        except Exception as e:
            print(f"❌ ERROR en búsqueda de álbumes: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Error en búsqueda'}), 500

    @app.route('/api/albumes/agregar-desde-spotify', methods=['POST'])
    def agregar_album_desde_spotify():
        conn = None
        cur = None
        try:
            data = request.get_json()
            titulo = data.get('titulo')
            artista = data.get('artista')
            fecha_lanzamiento = data.get('fecha_lanzamiento')
            
            if not titulo or not artista:
                return jsonify({'error': 'Título y artista son obligatorios'}), 400
            
            # Extraer año de la fecha
            anio_lanzamiento = None
            if fecha_lanzamiento:
                anio_lanzamiento = fecha_lanzamiento[:4] if len(fecha_lanzamiento) >= 4 else None
            
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Verificar si ya existe
            cur.execute("""
                SELECT id_album FROM albumes 
                WHERE titulo ILIKE %s AND artista ILIKE %s
            """, (titulo, artista))
            
            existing_album = cur.fetchone()
            
            if existing_album:
                return jsonify({
                    'id_album': existing_album[0],
                    'message': 'Álbum ya existe en la base de datos'
                }), 200
            
            # Insertar nuevo álbum
            cur.execute("""
                INSERT INTO albumes (titulo, artista, anio_lanzamiento) 
                VALUES (%s, %s, %s) 
                RETURNING id_album
            """, (titulo, artista, anio_lanzamiento))
            
            nuevo_album_id = cur.fetchone()[0]
            conn.commit()
            
            return jsonify({
                'id_album': nuevo_album_id,
                'message': 'Álbum agregado exitosamente'
            }), 201

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error al agregar álbum: {e}")
            return jsonify({'error': 'Error al agregar álbum'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/albumes/<int:id_album>/detalles', methods=['GET'])
    def get_album_detalles(id_album):
        conn = None
        cur = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Obtener información básica del álbum desde nuestra BD
            cur.execute("""
                SELECT id_album, titulo, artista, anio_lanzamiento 
                FROM albumes 
                WHERE id_album = %s
            """, (id_album,))
            
            album_bd = cur.fetchone()
            if not album_bd:
                return jsonify({'error': 'Álbum no encontrado en la base de datos'}), 404
            
            # Buscar en Spotify para obtener información completa
            album_spotify = None
            canciones_spotify = []
            try:
                # Buscar álbum en Spotify por título y artista
                search_results = spotify_client.sp_search.search(
                    q=f"{album_bd[1]} {album_bd[2]}", 
                    type='album', 
                    limit=1
                )
                
                if search_results['albums']['items']:  # CORRECCIÓN: 'albums' no 'albumes'
                    album_spotify = search_results['albums']['items'][0]
                    # Obtener detalles completos
                    album_detalle = spotify_client.sp_search.album(album_spotify['id'])
                    
                    # Obtener canciones del álbum
                    for track in album_detalle['tracks']['items']:
                        canciones_spotify.append({
                            'id_spotify': track['id'],
                            'titulo': track['name'],
                            'artista': track['artists'][0]['name'] if track['artists'] else 'Artista desconocido',
                            'duracion_ms': track['duration_ms'],
                            'duracion_formateada': f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02d}",
                            'numero_pista': track['track_number'],
                            'preview_url': track.get('preview_url')
                        })
                    
            except Exception as spotify_error:
                print(f"Error obteniendo datos de Spotify: {spotify_error}")
            
            # Obtener reseñas de nuestra BD
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
            
            # Obtener canciones de nuestra BD (si existen)
            cur.execute("""
                SELECT id_cancion, titulo, artista, duracion_segundos
                FROM canciones
                WHERE id_album = %s
                ORDER BY id_cancion
            """, (id_album,))
            
            canciones_bd = cur.fetchall()
            
            response_data = {
                'id_album': album_bd[0],
                'titulo': album_bd[1],
                'artista': album_bd[2],
                'anio_lanzamiento': album_bd[3],
                'reseñas': [{
                    'id_resena': r[0],
                    'texto_resena': r[1],
                    'fecha_creacion': r[2].isoformat() if r[2] else None,
                    'nombre_usuario': r[3],
                    'sentimiento': r[4],
                    'puntuacion': float(r[5]) if r[5] else None
                } for r in reseñas],
                'canciones_bd': [{
                    'id_cancion': c[0],
                    'titulo': c[1],
                    'artista': c[2],
                    'duracion_segundos': c[3],
                    'duracion_formateada': f"{c[3]//60}:{c[3]%60:02d}" if c[3] else None
                } for c in canciones_bd]
            }
            
            # Agregar datos de Spotify si están disponibles
            if album_spotify:
                response_data.update({
                    'imagen_url': album_spotify['images'][0]['url'] if album_spotify['images'] else None,
                    'spotify_url': album_spotify['external_urls']['spotify'],
                    'canciones_spotify': canciones_spotify,
                    'popularidad': album_spotify.get('popularity', 0),
                    'fecha_lanzamiento_completa': album_spotify['release_date']
                })
                
                # Obtener géneros del álbum detallado
                try:
                    album_detalle = spotify_client.sp_search.album(album_spotify['id'])
                    response_data['generos'] = album_detalle.get('genres', [])
                except:
                    response_data['generos'] = []
            
            return jsonify(response_data), 200

        except Exception as e:
            print(f"Error obteniendo detalles del álbum: {e}")
            return jsonify({'error': 'Error al obtener detalles del álbum'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)