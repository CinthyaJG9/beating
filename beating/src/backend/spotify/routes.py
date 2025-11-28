from flask import request, jsonify, redirect  # 👈 Añadir 'redirect'
from spotify.client import spotify_client
import spotipy
from database.connection import db

def init_spotify_routes(app):
    
    @app.route('/spotify-auth-url', methods=['GET'])
    def get_spotify_auth_url():
        try:
            auth_url = spotify_client.sp_oauth.get_authorize_url()
            return jsonify({"auth_url": auth_url}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/callback')
    def spotify_callback():
        try:
            code = request.args.get('code')
            print(f"🔄 Recibiendo callback de Spotify con código: {code}")
            
            if code:
                token_info = spotify_client.sp_oauth.get_access_token(code)
                spotify_client.sp_user = spotipy.Spotify(auth=token_info['access_token'])
                spotify_client.user_id = spotify_client.sp_user.me()['id']
                
                print(f"✅ Spotify autenticado exitosamente para usuario: {spotify_client.user_id}")
                
                # 🔥 IMPORTANTE: Redirigir al frontend, no devolver JSON
                return redirect('http://localhost:5173/resenas?spotify_auth=success&user_id=' + spotify_client.user_id)
            else:
                print("❌ No se recibió código de autorización")
                return redirect('http://localhost:5173/resenas?spotify_auth=error')
                
        except Exception as e:
            print(f"❌ Error en callback de Spotify: {str(e)}")
            return redirect('http://localhost:5173/resenas?spotify_auth=error')

    @app.route('/buscar', methods=['GET'])
    def buscar():
        query = request.args.get('q')
        if not query:
            return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

        try:
            if not spotify_client.sp_search:
                return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                
            resultados = spotify_client.sp_search.search(q=query, type="track", limit=10)
            canciones = []

            for track in resultados["tracks"]["items"]:
                canciones.append({
                    "name": track["name"],
                    "uri": track["uri"],
                    "artists": [artist["name"] for artist in track["artists"]],
                    "id": track["id"],
                    "album": track["album"]["name"],
                    "duration_ms": track["duration_ms"],
                    "preview_url": track.get("preview_url"),
                    "album_image": track["album"]["images"][0]["url"] if track["album"].get("images") else None
                })

            return jsonify({"tracks": canciones})

        except Exception as e:
            print("Error en búsqueda:", e)
            return jsonify({"error": str(e)}), 500

    @app.route('/buscar-artista', methods=['GET'])
    def buscar_artista():
        query = request.args.get('q')
        if not query:
            return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

        try:
            if not spotify_client.sp_search:
                return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                
            results = spotify_client.sp_search.search(q=query, type='artist', limit=5)

            if 'artists' not in results:
                return jsonify({"error": "Formato de respuesta inesperado"}), 500

            artistas = [{
                "id": item['id'],
                "name": item['name'],
                "image": item['images'][0]['url'] if item.get('images') else None,
                "genres": item.get('genres', [])[:3]  
            } for item in results['artists']['items']]
            
            return jsonify({"artists": artistas}), 200

        except Exception as e:
            return jsonify({
                "error": "Error al buscar artista",
                "details": str(e)
            }), 500

    @app.route('/canciones-artista', methods=['GET'])
    def canciones_por_artista():
        artist_id = request.args.get('id')
        print(f"🎵 Solicitando canciones para artista ID: {artist_id}")
        
        if not artist_id:
            return jsonify({"error": "Falta el id del artista"}), 400

        try:
            if not spotify_client.sp_search:
                return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                
            artist_info = spotify_client.sp_search.artist(artist_id)
            print(f"🎤 Artista: {artist_info['name']}")
            
            top_tracks = spotify_client.sp_search.artist_top_tracks(artist_id)
            print(f"📊 Top tracks encontrados: {len(top_tracks['tracks'])}")
            
            albums = spotify_client.sp_search.artist_albums(
                artist_id, 
                album_type='album,single,compilation',
                limit=20
            )
            print(f"💿 Álbumes encontrados: {len(albums['items'])}")
            
            canciones = []
            
            for track in top_tracks['tracks']:
                canciones.append({
                    "uri": track['uri'],
                    "id": track['id'],
                    "name": track['name'],
                    "album": track['album']['name'],
                    "album_image": track['album']['images'][0]['url'] if track['album'].get('images') else None,
                    "artists": [artist['name'] for artist in track['artists']],
                    "duration_ms": track['duration_ms'],
                    "popularity": track.get('popularity', 0),
                    "preview_url": track.get('preview_url'),
                    "is_top_track": True
                })
            
            seen_tracks = set([track['id'] for track in canciones])
            total_album_tracks = 0
            
            for album in albums['items']:
                try:
                    tracks = spotify_client.sp_search.album_tracks(album['id'])
                    album_track_count = 0
                    
                    for track in tracks['items']:
                        track_id = track['id']
                        if track_id not in seen_tracks:
                            seen_tracks.add(track_id)
                            album_track_count += 1
                            canciones.append({
                                "uri": track['uri'],
                                "id": track['id'],
                                "name": track['name'],
                                "album": album['name'],
                                "album_image": album['images'][0]['url'] if album.get('images') else None,
                                "artists": [artist['name'] for artist in track['artists']],
                                "duration_ms": track['duration_ms'],
                                "popularity": 0,
                                "preview_url": None,
                                "is_top_track": False
                            })
                    
                    total_album_tracks += album_track_count
                    print(f"   - Álbum '{album['name']}': {album_track_count} canciones")
                    
                except Exception as e:
                    print(f"   ❌ Error en álbum {album['name']}: {e}")
                    continue
            
            print(f"🎵 Total canciones procesadas: {len(canciones)} (Top: {len(top_tracks['tracks'])}, Álbumes: {total_album_tracks})")
            
            canciones.sort(key=lambda x: (-x['popularity'], x['name']))
            
            return jsonify({
                "artist": {
                    "name": artist_info['name'],
                    "image": artist_info['images'][0]['url'] if artist_info.get('images') else None,
                    "genres": artist_info.get('genres', []),
                    "followers": artist_info.get('followers', {}).get('total', 0)
                },
                "tracks": canciones,
                "total_tracks": len(canciones),
                "debug_info": {
                    "top_tracks_count": len(top_tracks['tracks']),
                    "album_tracks_count": total_album_tracks,
                    "albums_processed": len(albums['items'])
                }
            }), 200
            
        except Exception as e:
            print(f"❌ Error grave en canciones-artista: {str(e)}")
            app.logger.error(f"Error en canciones-artista: {str(e)}")
            return jsonify({"error": f"Error al obtener canciones: {str(e)}"}), 500

    @app.route('/user-info', methods=['GET'])
    def get_user_info():
        try:
            if not spotify_client.sp_user:
                return jsonify({"error": "Usuario no autenticado"}), 401
                
            user_info = spotify_client.sp_user.me()
            return jsonify({
                "user_id": user_info['id'],
                "display_name": user_info.get('display_name', ''),
                "email": user_info.get('email', ''),
                "country": user_info.get('country', ''),
                "product": user_info.get('product', '')
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/create-playlist', methods=['POST'])
    def create_playlist():
        try:
            print("🎵 Iniciando creación de playlist...")
            
            # 👇 VERIFICACIÓN MEJORADA DE AUTENTICACIÓN
            print("🔍 Verificando autenticación de Spotify...")
            
            if not spotify_client.is_user_authenticated():
                print("❌ Usuario no autenticado - generando URL de auth")
                try:
                    auth_url = spotify_client.sp_oauth.get_authorize_url()
                    print(f"🔗 URL de autenticación generada: {auth_url}")
                    
                    return jsonify({
                        "error": "Usuario no autenticado con Spotify",
                        "auth_required": True,
                        "auth_url": auth_url,
                        "message": "Por favor autentícate con Spotify primero"
                    }), 401
                except Exception as auth_error:
                    print(f"❌ Error generando auth URL: {auth_error}")
                    return jsonify({
                        "error": "Error de autenticación con Spotify",
                        "details": str(auth_error)
                    }), 500
            
            # Si llegamos aquí, el usuario está autenticado
            user_info = spotify_client.sp_user.me()
            user_id = user_info['id']
            print(f"✅ Usuario de Spotify autenticado: {user_id}")
            
            # Obtener conexión a la base de datos
            conn = db.get_connection()
            if not conn:
                print("❌ Error de conexión a BD")
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # SOLO CANCIONES CON SENTIMIENTO POSITIVO, ordenadas por puntuación DESC
            print("🔍 Buscando canciones positivas en BD...")
            cur.execute('''
                SELECT c.spotify_uri, AVG(s.puntuacion) as promedio_positividad
                FROM canciones c
                JOIN resenas r ON c.id_cancion = r.id_cancion
                JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE c.spotify_uri IS NOT NULL 
                AND s.etiqueta = 'positivo'  -- FILTRAR SOLO POSITIVOS
                GROUP BY c.id_cancion, c.spotify_uri
                ORDER BY promedio_positividad DESC  -- LAS MÁS POSITIVAS PRIMERO
                LIMIT 15  -- Un poco más por si hay URIs inválidas
            ''')
            
            resultados = cur.fetchall()
            cur.close()
            db.close_connection(conn)

            print(f"📊 Resultados de BD: {len(resultados)} canciones encontradas")
            
            # Filtrar URIs válidas
            uris = [row[0] for row in resultados if row[0] and row[0].startswith('spotify:track:')]
            
            print(f"🎵 URIs válidas: {len(uris)}")
            
            if not uris:
                print("❌ No hay URIs válidas")
                return jsonify({"error": "No hay canciones positivas para crear la playlist"}), 400

            # Buscar playlist existente o crear nueva
            print("🔍 Buscando playlists existentes...")
            playlists = spotify_client.sp_user.current_user_playlists()
            nombre_playlist = "Top Beating"
            playlist_id = None

            for playlist in playlists['items']:
                if playlist['name'] == nombre_playlist:
                    playlist_id = playlist['id']
                    print(f"✅ Playlist existente encontrada: {playlist_id}")
                    break

            if playlist_id:
                # Reemplazar con nuevas canciones positivas
                print("🔄 Actualizando playlist existente...")
                spotify_client.sp_user.playlist_replace_items(playlist_id, uris)
                mensaje = "Playlist de canciones positivas actualizada"
            else:
                # Crear nueva playlist
                print("🆕 Creando nueva playlist...")
                playlist = spotify_client.sp_user.user_playlist_create(
                    user=user_id,
                    name=nombre_playlist,
                    public=True,
                    description="🎵 Tus canciones más positivas según Beating - Generada automáticamente basada en análisis de sentimientos"
                )
                playlist_id = playlist['id']
                print(f"✅ Nueva playlist creada: {playlist_id}")
                spotify_client.sp_user.playlist_add_items(playlist_id, uris)
                mensaje = "Playlist de canciones positivas creada"

            print(f"✅ Playlist procesada exitosamente: {playlist_id}")

            return jsonify({
                "message": mensaje, 
                "playlist_url": f"https://open.spotify.com/playlist/{playlist_id}",
                "canciones_incluidas": len(uris),
                "criterio": "sentimiento positivo (mayor puntuación primero)"
            }), 201
            
        except Exception as e:
            print(f"❌ ERROR en create-playlist: {str(e)}")
            import traceback
            print(f"❌ TRACEBACK: {traceback.format_exc()}")
            return jsonify({
                "error": "Error al crear la playlist",
                "details": str(e)
            }), 500