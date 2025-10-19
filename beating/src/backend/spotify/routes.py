from flask import request, jsonify
from spotify.client import spotify_client
import spotipy  # ← Añadir esta importación

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
            if code:
                token_info = spotify_client.sp_oauth.get_access_token(code)
                spotify_client.sp_user = spotipy.Spotify(auth=token_info['access_token'])
                spotify_client.user_id = spotify_client.sp_user.me()['id']
                return jsonify({"message": "Autenticación exitosa", "user_id": spotify_client.user_id}), 200
            else:
                return jsonify({"error": "No se recibió código de autorización"}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/buscar', methods=['GET'])
    def buscar():
        query = request.args.get('q')
        if not query:
            return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

        try:
            # CORREGIDO: Usar sp_search del cliente de Spotify
            if not spotify_client.sp_search:
                return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                
            resultados = spotify_client.sp_search.search(q=query, type="track", limit=10)
            canciones = []

            for track in resultados["tracks"]["items"]:
                canciones.append({
                    "name": track["name"],
                    "uri": track["uri"],
                    "artists": [artist["name"] for artist in track["artists"]],
                    "id": track["id"],  # ← Añadir ID
                    "album": track["album"]["name"],  # ← Añadir álbum
                    "duration_ms": track["duration_ms"],  # ← Añadir duración
                    "preview_url": track.get("preview_url"),  # ← Añadir preview
                    "album_image": track["album"]["images"][0]["url"] if track["album"].get("images") else None  # ← Añadir imagen
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
            # CORREGIDO: Usar spotify_client.sp_search en lugar de sp_search
            if not spotify_client.sp_search:
                return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                
            # Obtener información del artista
            artist_info = spotify_client.sp_search.artist(artist_id)
            print(f"🎤 Artista: {artist_info['name']}")
            
            # Obtener top tracks
            top_tracks = spotify_client.sp_search.artist_top_tracks(artist_id)
            print(f"📊 Top tracks encontrados: {len(top_tracks['tracks'])}")
            
            # Obtener álbumes del artista
            albums = spotify_client.sp_search.artist_albums(
                artist_id, 
                album_type='album,single,compilation',
                limit=20
            )
            print(f"💿 Álbumes encontrados: {len(albums['items'])}")
            
            canciones = []
            
            # Procesar top tracks
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
            
            # Procesar canciones de álbumes
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
            
            # Ordenar canciones
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

    # Añadir endpoint para obtener información del usuario autenticado
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

    # Añadir endpoint para crear playlist
    @app.route('/create-playlist', methods=['POST'])
    def create_playlist():
        try:
            if not spotify_client.sp_user:
                return jsonify({"error": "Usuario no autenticado"}), 401
                
            data = request.get_json()
            name = data.get('name')
            description = data.get('description', '')
            public = data.get('public', True)
            tracks = data.get('tracks', [])
            
            if not name:
                return jsonify({"error": "El nombre de la playlist es requerido"}), 400
                
            # Crear playlist
            playlist = spotify_client.sp_user.user_playlist_create(
                user=spotify_client.user_id,
                name=name,
                public=public,
                description=description
            )
            
            # Añadir tracks si se proporcionaron
            if tracks:
                spotify_client.sp_user.playlist_add_items(playlist['id'], tracks)
                
            return jsonify({
                "success": True,
                "playlist": {
                    "id": playlist['id'],
                    "name": playlist['name'],
                    "url": playlist['external_urls']['spotify'],
                    "tracks_added": len(tracks)
                }
            }), 201
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500