from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import psycopg2
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import datetime
from functools import wraps
from psycopg2 import pool
import requests
import base64
from textblob import TextBlob
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy.oauth2 import SpotifyClientCredentials
from collections import Counter
import matplotlib.pyplot as plt
from wordcloud import WordCloud
from io import BytesIO
import base64
import numpy as np
import os

SPOTIFY_USER_ID = None  # global

project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

from transformers import pipeline
import torch

app = Flask(__name__)
CORS(app)

# NUEVAS CREDENCIALES DE SPOTIFY
SPOTIFY_CLIENT_ID = "02cb14984f5f49ebb2be0901e2f0eaf1"
SPOTIFY_CLIENT_SECRET = "8c39e4ac87fa47aa8d4122b1567afb5e"
SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8888/callback"  

SPOTIFY_SCOPE = "playlist-modify-public playlist-modify-private user-read-private user-read-email"

# Configuración de la base de datos - CORREGIDA
try:
    # Usar DSN string para evitar problemas de codificación
    dsn = "dbname=beating user=postgres password=admin host=localhost port=5432"
    app.config['POSTGRES_POOL'] = psycopg2.pool.SimpleConnectionPool(1, 20, dsn)
    print("✅ Pool de conexiones PostgreSQL creado exitosamente")
except Exception as e:
    print(f"❌ Error creando pool de conexiones: {e}")
    app.config['POSTGRES_POOL'] = None

def get_db_connection():
    if app.config['POSTGRES_POOL']:
        return app.config['POSTGRES_POOL'].getconn()
    else:
        # Fallback a conexión directa
        try:
            return psycopg2.connect(
                dbname="beating",
                user="postgres",
                password="admin",
                host="localhost",
                port="5432"
            )
        except Exception as e:
            print(f"❌ Error de conexión directa: {e}")
            return None

def close_db_connection(conn):
    if conn:
        if app.config['POSTGRES_POOL']:
            app.config['POSTGRES_POOL'].putconn(conn)
        else:
            conn.close()

# Configuración de Spotify OAuth - CORREGIDA
try:
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=SPOTIFY_SCOPE,
        open_browser=False  # Cambiado a False para evitar problemas
    )
    
    # Obtener token de acceso
    token_info = sp_oauth.get_cached_token()
    if not token_info:
        print("⚠️ No hay token en caché. Se necesitará autenticación.")
        sp = None
        sp_user = None
    else:
        sp = spotipy.Spotify(auth=token_info['access_token'])
        sp_user = sp
        SPOTIFY_USER_ID = sp_user.me()['id'] if sp_user else None
        print("✅ Spotify autenticado correctamente")
        
except Exception as e:
    print(f"❌ Error en configuración de Spotify: {e}")
    sp = None
    sp_user = None

# Cliente para búsquedas públicas (no requiere autenticación de usuario)
try:
    sp_search = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))
    print("✅ Cliente de búsqueda de Spotify configurado")
except Exception as e:
    print(f"❌ Error configurando cliente de búsqueda: {e}")
    sp_search = None

app.config['SECRET_KEY'] = 'tu_clave_super_secreta'

def get_spotify_token(client_id, client_secret):
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    headers = {"Authorization": f"Basic {b64_auth}"}
    data = {"grant_type": "client_credentials"}
    r = requests.post("https://accounts.spotify.com/api/token", headers=headers, data=data)
    return r.json()["access_token"]

sentiment_analyzer = None

def inicializar_analizador():
    global sentiment_analyzer
    if sentiment_analyzer is None:
        try:
            device_id = 0 if torch.cuda.is_available() else -1
            sentiment_analyzer = pipeline(
                "text-classification",
                model="finiteautomata/beto-sentiment-analysis",
                device=device_id,
                truncation=True
            )
            app.logger.info("Analizador de sentimientos inicializado correctamente")
        except Exception as e:
            app.logger.error(f"Error inicializando analizador: {e}")
            raise RuntimeError("No se pudo inicializar el analizador de sentimientos")

inicializar_analizador()

def analizar_sentimiento_transformers(texto):
    try:
        inicializar_analizador()
        resultado = sentiment_analyzer(texto)[0]
        etiqueta_raw = resultado['label'].lower()
        score = float(resultado['score'])
        
        if etiqueta_raw in ['pos', 'positive']:
            # Positivo: score alto (0.5-1.0)
            normalized_score = 0.5 + (score * 0.5)  # Convertir 0-1 a 0.5-1.0
            return 'positivo', round(normalized_score, 2)
        elif etiqueta_raw in ['neg', 'negative']:
            # Negativo: score bajo (0.0-0.5)
            normalized_score = score * 0.5  # Convertir 0-1 a 0.0-0.5
            return 'negativo', round(normalized_score, 2)
        else:
            return 'neutral', 0.5  # Neutral en el medio
    except Exception as e:
        print(f"Error en análisis con transformers: {str(e)}")
        return 'neutral', 0.5

# Endpoint para obtener URL de autenticación de Spotify
@app.route('/spotify-auth-url', methods=['GET'])
def get_spotify_auth_url():
    try:
        auth_url = sp_oauth.get_authorize_url()
        return jsonify({"auth_url": auth_url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoint para manejar el callback de Spotify
@app.route('/callback')
def spotify_callback():
    try:
        code = request.args.get('code')
        if code:
            token_info = sp_oauth.get_access_token(code)
            global sp, sp_user, SPOTIFY_USER_ID
            sp = spotipy.Spotify(auth=token_info['access_token'])
            sp_user = sp
            SPOTIFY_USER_ID = sp_user.me()['id']
            return jsonify({"message": "Autenticación exitosa", "user_id": SPOTIFY_USER_ID}), 200
        else:
            return jsonify({"error": "No se recibió código de autorización"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    correo = data.get("email")
    contrasena = data.get("password")

    if not correo or not contrasena:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()

        cur.execute(
            "SELECT id_usuario, nombre_usuario FROM usuarios WHERE correo = %s AND contrasena = %s",
            (correo, contrasena)
        )
        user = cur.fetchone()
        cur.close()
        close_db_connection(conn)

        if user:
            payload = {
                "user_id": user[0],
                "username": user[1],
                "email": correo,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
            }
            token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")
            return jsonify({"token": token, "user_id": user[0], "username": user[1]}), 200
        else:
            return jsonify({"error": "Credenciales inválidas"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nombre = data.get("nombre_usuario")
    correo = data.get("correo")
    contrasena = data.get("contrasena")

    if not nombre or not correo or not contrasena:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()

        cur.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
        if cur.fetchone():
            cur.close()
            close_db_connection(conn)
            return jsonify({"error": "Correo ya registrado"}), 409

        cur.execute(
            "INSERT INTO usuarios (nombre_usuario, correo, contrasena) VALUES (%s, %s, %s) RETURNING id_usuario",
            (nombre, correo, contrasena)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        close_db_connection(conn)

        return jsonify({"message": "Usuario registrado", "user_id": user_id}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Primero agregamos esta columna si no existe (ejecutar una sola vez)
def agregar_columna_spotify_uri():
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("""
                ALTER TABLE canciones 
                ADD COLUMN IF NOT EXISTS spotify_uri VARCHAR(200)
            """)
            conn.commit()
            cur.close()
            close_db_connection(conn)
    except Exception as e:
        print("Error al agregar columna spotify_uri:", e)

# Ejecutar al inicio (opcional, puedes hacerlo manualmente en la BD)
agregar_columna_spotify_uri()

# Decorador para endpoints que requieren autenticación
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            app.logger.error("No Authorization header found")
            return jsonify({"error": "Token de autorización faltante"}), 401
        
        try:
            # Separar 'Bearer' del token
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                app.logger.error("Formato de token inválido")
                return jsonify({"error": "Formato de token inválido. Use: Bearer <token>"}), 401
                
            token = parts[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user_id = data['user_id']
            
        except jwt.ExpiredSignatureError:
            app.logger.error("Token expirado")
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError as e:
            app.logger.error(f"Token inválido: {str(e)}")
            return jsonify({"error": "Token inválido"}), 401
        except Exception as e:
            app.logger.error(f"Error procesando token: {str(e)}")
            return jsonify({"error": "Error procesando token"}), 401
            
        return f(*args, **kwargs)
    return decorated

@app.route('/resenas', methods=['POST'])
@token_required
def subir_resena():
    try:
        # Validación básica de la solicitud
        if not request.is_json:
            return jsonify({"error": "Se esperaba formato JSON"}), 400

        data = request.get_json()
        required_fields = ['nombre', 'artista', 'contenido', 'tipo']
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Faltan campos requeridos"}), 400

        nombre = data['nombre'].strip()
        artista = data['artista'].strip()
        contenido = data['contenido'].strip()
        tipo = data['tipo'].lower().strip()

        if tipo not in ['cancion', 'album']:
            return jsonify({"error": "Tipo debe ser 'cancion' o 'album'"}), 400

        if len(contenido) < 10:
            return jsonify({"error": "La reseña debe tener al menos 10 caracteres"}), 400

        sentimiento, puntuacion = analizar_sentimiento_transformers(contenido)
        user_id = request.user_id

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()

        try:
            if tipo == "cancion":
                # Usar el cliente de búsqueda pública
                if not sp_search:
                    return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                    
                results = sp_search.search(q=f"{nombre} {artista}", type="track", limit=1)
                if not results['tracks']['items']:
                    return jsonify({"error": "Canción no encontrada en Spotify"}), 404

                track = results['tracks']['items'][0]
                titulo = track['name']
                artista_spotify = track['artists'][0]['name']
                duracion = round(track['duration_ms'] / 1000)
                spotify_uri = track['uri']

                # Buscar o insertar canción
                cur.execute("SELECT id_cancion FROM canciones WHERE titulo = %s AND artista = %s", 
                          (titulo, artista_spotify))
                cancion = cur.fetchone()

                if cancion:
                    id_cancion = cancion[0]
                    # Actualizar campos
                    cur.execute("""
                        UPDATE canciones SET
                            duracion_segundos = %s,
                            spotify_uri = %s
                        WHERE id_cancion = %s
                    """, (duracion, spotify_uri, id_cancion))
                else:
                    # Insertar nueva canción
                    cur.execute("""
                        INSERT INTO canciones 
                        (titulo, artista, duracion_segundos, spotify_uri) 
                        VALUES (%s, %s, %s, %s)
                        RETURNING id_cancion
                    """, (titulo, artista_spotify, duracion, spotify_uri))
                    id_cancion = cur.fetchone()[0]

                # Insertar reseña
                cur.execute("""
                    INSERT INTO resenas 
                    (id_usuario, id_cancion, texto_resena) 
                    VALUES (%s, %s, %s)
                    RETURNING id_resena
                """, (user_id, id_cancion, contenido))

            elif tipo == "album":
                return jsonify({"error": "Funcionalidad para álbumes no implementada aún"}), 501

            id_resena = cur.fetchone()[0]

            # Insertar análisis de sentimiento
            cur.execute("""
                INSERT INTO sentimientos 
                (id_resena, etiqueta, puntuacion) 
                VALUES (%s, %s, %s)
            """, (id_resena, sentimiento, float(puntuacion)))

            conn.commit()

            app.logger.info(f"""
                Reseña registrada:
                - Texto: {contenido[:50]}...
                - Sentimiento: {sentimiento}
                - Puntuación: {puntuacion}
                - Tipo: {tipo}
                - Artista: {artista_spotify if tipo == 'cancion' else artista}
            """)

            return jsonify({
                "success": True,
                "message": "Reseña registrada exitosamente",
                "data": {
                    "sentimiento": sentimiento,
                    "puntuacion": puntuacion,
                    "tipo": tipo,
                    "artista": artista_spotify if tipo == "cancion" else artista,
                    "titulo": titulo if tipo == "cancion" else nombre,
                    "modelo": "beto-sentiment-analysis"
                }
            }), 201

        except Exception as e:
            conn.rollback()
            app.logger.error(f"Error en base de datos: {str(e)}", exc_info=True)
            return jsonify({
                "error": "Error al procesar reseña",
                "details": str(e)
            }), 500

        finally:
            if cur:
                cur.close()
            if conn:
                close_db_connection(conn)

    except Exception as e:
        app.logger.error(f"Error general en subir_resena: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Error interno del servidor",
            "details": str(e)
        }), 500

@app.route('/crear_playlist', methods=['POST'])
def crear_playlist():
    try:
        if not sp_user or not SPOTIFY_USER_ID:
            return jsonify({"error": "No autenticado con Spotify. Primero inicia sesión en Spotify."}), 401

        user_id = SPOTIFY_USER_ID

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()
        cur.execute('''
            SELECT
                c.spotify_uri,
                AVG(s.puntuacion) AS promedio,
                COUNT(r.id_resena) AS total
            FROM canciones c
            JOIN resenas r  ON c.id_cancion  = r.id_cancion
            JOIN sentimientos s ON r.id_resena = s.id_resena
            WHERE c.spotify_uri IS NOT NULL
            GROUP BY c.id_cancion, c.spotify_uri
            ORDER BY promedio DESC, total DESC
            LIMIT 25                                               
        ''')
        resultados = cur.fetchall()
        cur.close()
        close_db_connection(conn)

        uris = [uri for uri, promedio, _ in resultados if promedio > 0]
        if not uris:
            return jsonify({"error": "No hay canciones con reseñas positivas"}), 400

        playlist_name = "Top Beating"
        playlist_id = encontrar_playlist_existente_por_nombre(sp_user, playlist_name)

        if playlist_id:
            sp_user.playlist_replace_items(playlist_id, [])
            sp_user.playlist_add_items(playlist_id, uris)
            mensaje = "Playlist actualizada exitosamente"
        else:
            nueva_playlist = sp_user.user_playlist_create(
                user=user_id,
                name=playlist_name,
                public=False,
                description="Playlist generada automáticamente por Beating."
            )
            playlist_id = nueva_playlist['id']
            sp_user.playlist_add_items(playlist_id, uris)
            mensaje = "Playlist creada exitosamente"

        return jsonify({
            "success": True,
            "message": mensaje,
            "playlist_id": playlist_id,
            "tracks_added": len(uris),
            "playlist_url": f"https://open.spotify.com/playlist/{playlist_id}"
        }), 201

    except Exception as e:
        app.logger.error(f"Error en crear_playlist: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
def encontrar_playlist_existente_por_nombre(sp, nombre_objetivo):
    try:
        user_id = sp.me()['id']
        nombre_objetivo = nombre_objetivo.strip().lower()

        playlists = []
        offset = 0

        while True:
            current_page = sp.current_user_playlists(limit=50, offset=offset)
            playlists.extend(current_page['items'])
            if current_page['next']:
                offset += 50
            else:
                break

        for playlist in playlists:
            nombre_actual = playlist['name'].strip().lower()
            owner_actual = playlist['owner']['id']
            if nombre_actual == nombre_objetivo and owner_actual == user_id:
                return playlist['id']

        return None

    except Exception as e:
        return None

@app.route('/buscar', methods=['GET'])
def buscar():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

    try:
        if not sp_search:
            return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
            
        resultados = sp_search.search(q=query, type="track", limit=10)
        canciones = []

        for track in resultados["tracks"]["items"]:
            canciones.append({
                "name": track["name"],
                "uri": track["uri"],
                "artists": [artist["name"] for artist in track["artists"]],
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
        if not sp_search:
            return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
            
        results = sp_search.search(q=query, type='artist', limit=5)

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
        if not sp_search:
            return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
            
        # Obtener información del artista
        artist_info = sp_search.artist(artist_id)
        print(f"🎤 Artista: {artist_info['name']}")
        
        # Obtener top tracks
        top_tracks = sp_search.artist_top_tracks(artist_id)
        print(f"📊 Top tracks encontrados: {len(top_tracks['tracks'])}")
        
        # Obtener álbumes del artista
        albums = sp_search.artist_albums(
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
                tracks = sp_search.album_tracks(album['id'])
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

# Endpoint para obtener datos de análisis
@app.route('/analisis-resenas', methods=['GET'])
def analisis_resenas():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cur = conn.cursor()
    
    try:
        # Configurar matplotlib para no usar GUI
        import matplotlib
        matplotlib.use('Agg')
        plt.switch_backend('Agg')
        
        # 1. Obtener datos REALES de sentimientos
        cur.execute("""
            SELECT 
                s.etiqueta, 
                COUNT(*) as cantidad, 
                AVG(s.puntuacion) as promedio
            FROM sentimientos s
            GROUP BY s.etiqueta
        """)
        sentimientos_data = []
        for row in cur.fetchall():
            etiqueta, cantidad, promedio = row
            sentimientos_data.append({
                'etiqueta': etiqueta,
                'cantidad': cantidad,
                'puntuacion_promedio': float(promedio) if promedio else 0.0
            })

        # 2. Obtener mejores canciones con puntuaciones REALES
        cur.execute("""
            SELECT 
                c.titulo, 
                c.artista, 
                AVG(s.puntuacion) as promedio, 
                COUNT(r.id_resena) as cantidad
            FROM canciones c
            JOIN resenas r ON c.id_cancion = r.id_cancion
            JOIN sentimientos s ON r.id_resena = s.id_resena
            GROUP BY c.id_cancion, c.titulo, c.artista
            ORDER BY promedio DESC
            LIMIT 10
        """)
        mejores_canciones = []
        for row in cur.fetchall():
            titulo, artista, promedio, cantidad = row
            mejores_canciones.append({
                'titulo': titulo,
                'artista': artista,
                'puntuacion': float(promedio) if promedio else 0.0,
                'reseñas': cantidad
            })

        # 3. Obtener texto para nube de palabras (solo reseñas positivas)
        cur.execute("""
            SELECT r.texto_resena 
            FROM resenas r
            JOIN sentimientos s ON r.id_resena = s.id_resena
            WHERE s.etiqueta = 'positivo'
            LIMIT 100
        """)
        textos_positivos = [row[0] for row in cur.fetchall()]

        # Generar gráficos solo si hay datos
        response_data = {
            'mejores_canciones': mejores_canciones,
            'distribucion_sentimientos': sentimientos_data
        }

        if any(s['cantidad'] > 0 for s in sentimientos_data):
            response_data['sentiment_dist'] = generar_grafico_sentimientos(sentimientos_data)
        
        if mejores_canciones:
            response_data['top_songs'] = generar_grafico_top_canciones(mejores_canciones)

        if textos_positivos:
            response_data['wordcloud'] = generar_wordcloud(textos_positivos)

        return jsonify(response_data), 200

    except Exception as e:
        app.logger.error(f"Error en análisis: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        close_db_connection(conn)

def generar_wordcloud(textos):
    from wordcloud import WordCloud
    from io import BytesIO
    import base64
    
    # Unir todos los textos
    texto_completo = ' '.join(textos)
    
    # Configurar la nube de palabras
    wordcloud = WordCloud(
        width=800,
        height=400,
        background_color='white',
        colormap='viridis',
        max_words=100,
        stopwords=['la', 'el', 'los', 'las', 'un', 'una', 'es', 'de', 'en', 'y']
    ).generate(texto_completo)
    
    # Generar imagen
    plt.figure(figsize=(10, 5))
    plt.imshow(wordcloud, interpolation='bilinear')
    plt.axis('off')
    
    # Convertir a base64
    img = BytesIO()
    plt.savefig(img, format='PNG', bbox_inches='tight', dpi=100)
    plt.close()
    return base64.b64encode(img.getvalue()).decode('utf-8')

def generar_grafico_sentimientos(datos):
    plt.figure(figsize=(8, 8))
    
    # Filtrar datos con cantidad > 0
    datos_validos = [d for d in datos if d['cantidad'] > 0]
    if not datos_validos:
        return None
        
    labels = [d['etiqueta'] for d in datos_validos]
    sizes = [d['cantidad'] for d in datos_validos]
    
    # Colores fijos según el tipo de sentimiento
    colors = []
    for label in labels:
        if label == 'positivo':
            colors.append('#4CAF50')  # Verde
        elif label == 'neutral':
            colors.append('#FFC107')  # Amarillo
        else:
            colors.append('#F44336')  # Rojo
    
    plt.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%',
            shadow=True, startangle=140)
    plt.title('Distribución de Sentimientos')
    
    img = BytesIO()
    plt.savefig(img, format='PNG', bbox_inches='tight', dpi=100)
    plt.close()
    return base64.b64encode(img.getvalue()).decode('utf-8')

def generar_grafico_top_canciones(datos):
    plt.figure(figsize=(10, 6))
    nombres = [f"{d['titulo']}\n({d['artista']})" for d in datos]
    puntuaciones = [d['puntuacion'] for d in datos]
    
    # Usar colores según la puntuación
    colors = []
    for score in puntuaciones:
        if score > 0.5:
            colors.append('#4CAF50')  # Verde para muy positivas
        elif score > 0:
            colors.append('#8BC34A')  # Verde claro para positivas
        elif score == 0:
            colors.append('#FFC107')  # Amarillo para neutrales
        else:
            colors.append('#F44336')  # Rojo para negativas
    
    bars = plt.barh(nombres, puntuaciones, color=colors)
    plt.gca().invert_yaxis()
    plt.title('Top 10 Canciones Mejor Calificadas')
    plt.xlabel('Puntuación Promedio')
    plt.tight_layout()
    
    for bar in bars:
        width = bar.get_width()
        plt.text(width, bar.get_y() + bar.get_height()/2, f'{width:.2f}', 
                ha='left', va='center')
    
    img = BytesIO()
    plt.savefig(img, format='PNG', bbox_inches='tight')
    plt.close()
    return base64.b64encode(img.getvalue()).decode('utf-8')

@app.route('/debug-sentimientos', methods=['GET'])
def debug_sentimientos():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cur = conn.cursor()
    
    try:
        # Ver las últimas 10 reseñas con su análisis
        cur.execute("""
            SELECT r.texto_resena, s.etiqueta, s.puntuacion 
            FROM resenas r
            JOIN sentimientos s ON r.id_resena = s.id_resena
            ORDER BY r.id_resena DESC
            LIMIT 10
        """)
        resultados = cur.fetchall()
        
        # Analizar los mismos textos nuevamente para comparar
        comparacion = []
        for texto, etiqueta_db, puntuacion_db in resultados:
            nueva_etiqueta, nueva_puntuacion = analizar_sentimiento_transformers(texto)
            comparacion.append({
                'texto': texto,
                'etiqueta_db': etiqueta_db,
                'puntuacion_db': puntuacion_db,
                'nueva_etiqueta': nueva_etiqueta,
                'nueva_puntuacion': nueva_puntuacion
            })
        
        return jsonify({'data': comparacion}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        close_db_connection(conn)

@app.route('/actualizar-sentimientos', methods=['POST'])
def actualizar_sentimientos():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()
        
        cur.execute("""
            SELECT r.id_resena, r.texto_resena, s.etiqueta, s.puntuacion 
            FROM resenas r
            JOIN sentimientos s ON r.id_resena = s.id_resena
            ORDER BY r.id_resena
        """)
        reseñas = cur.fetchall()
        
        if not reseñas:
            return jsonify({"message": "No hay reseñas para actualizar", "actualizadas": 0}), 200
        
        actualizadas = 0
        problemas = 0

        # Función para analizar sentimiento
        def analizar_sentimiento(texto):
            from textblob import TextBlob
            from textblob.sentiments import PatternAnalyzer
            try:
                blob = TextBlob(texto, analyzer=PatternAnalyzer())
                polaridad = blob.sentiment.polarity
                if polaridad >= 0.01:
                    return 'positivo', round(polaridad, 3)
                elif polaridad <= -0.01:
                    return 'negativo', round(polaridad, 3)
                else:
                    return 'neutral', round(polaridad, 3)
            except Exception as e:
                app.logger.error(f"Error en análisis de sentimiento: {str(e)}")
                return 'neutral', 0.0

        # Recorremos todas las reseñas
        for id_resena, texto, etiqueta_antigua, puntuacion_antigua in reseñas:
            try:
                nueva_etiqueta, nueva_puntuacion = analizar_sentimiento(texto)

                if (nueva_etiqueta != etiqueta_antigua) or (abs(nueva_puntuacion - float(puntuacion_antigua)) > 0.01):
                    try:
                        cur.execute("""
                            UPDATE sentimientos
                            SET etiqueta = %s, puntuacion = %s
                            WHERE id_resena = %s
                        """, (nueva_etiqueta, nueva_puntuacion, id_resena))
                        actualizadas += 1
                    except Exception as update_error:
                        problemas += 1
                        continue
            except Exception as e:
                problemas += 1
                continue

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Proceso de actualización completado",
            "resumen": {
                "total_reseñas": len(reseñas),
                "actualizadas": actualizadas,
                "sin_cambios": len(reseñas) - actualizadas - problemas,
                "con_errores": problemas
            }
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            close_db_connection(conn)

# Endpoint de prueba
@app.route('/')
def home():
    return jsonify({
        "message": "Beating API está funcionando", 
        "status": "OK",
        "spotify_authenticated": sp_user is not None,
        "database_connected": app.config['POSTGRES_POOL'] is not None
    })

@app.route('/test-db')
def test_db():
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT version()")
            version = cur.fetchone()
            cur.close()
            close_db_connection(conn)
            return jsonify({"database": "Conectado", "version": version[0]})
        else:
            return jsonify({"database": "Error de conexión"})
    except Exception as e:
        return jsonify({"database": f"Error: {str(e)}"})
    

# =============================================
# NUEVA FUNCIONALIDAD: OBTENER RESEÑAS REALES
# =============================================

def obtener_mejor_resena_real(item_id, tipo, criterio='reciente'):
    """
    Obtiene la mejor reseña real según el criterio especificado
    criterio: 'reciente', 'positiva', 'polaridad'
    """
    conn = get_db_connection()
    if not conn:
        return None
        
    try:
        cur = conn.cursor()
        
        if tipo == 'cancion':
            base_query = """
                SELECT r.texto_resena, s.puntuacion, s.etiqueta, r.fecha_creacion
                FROM resenas r
                JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE r.id_cancion = %s
            """
        else:  # album
            base_query = """
                SELECT r.texto_resena, s.puntuacion, s.etiqueta, r.fecha_creacion
                FROM resenas r
                JOIN sentimientos s ON r.id_resena = s.id_resena
                WHERE r.id_album = %s
            """
        
        # Aplicar criterio de ordenamiento
        if criterio == 'reciente':
            query = base_query + " ORDER BY r.fecha_creacion DESC LIMIT 1"
        elif criterio == 'positiva':
            query = base_query + " ORDER BY s.puntuacion DESC LIMIT 1"
        elif criterio == 'polaridad':
            # Para polaridad, calculamos la distancia desde 0.5 (neutral)
            query = base_query + " ORDER BY ABS(s.puntuacion - 0.5) DESC LIMIT 1"
        else:
            query = base_query + " ORDER BY r.fecha_creacion DESC LIMIT 1"
        
        cur.execute(query, (item_id,))
        resultado = cur.fetchone()
        
        if resultado:
            texto, puntuacion, etiqueta, fecha = resultado
            return {
                'texto_resena': texto,
                'puntuacion': float(puntuacion),
                'etiqueta': etiqueta,
                'fecha': fecha.strftime('%Y-%m-%d') if fecha else None,
                'criterio': criterio
            }
        return None
        
    except Exception as e:
        print(f"Error obteniendo reseña real: {e}")
        return None
    finally:
        if cur:
            cur.close()
        close_db_connection(conn)

def formatear_resena_real(resena_real, item, tipo):
    """
    Formatea la reseña real para mostrarla en la interfaz
    """
    if not resena_real:
        return None
    
    # Acortar texto si es muy largo
    texto = resena_real['texto_resena']
    if len(texto) > 150:
        texto = texto[:147] + "..."
    
    # Determinar el highlight según el criterio
    if resena_real['criterio'] == 'reciente':
        highlight = f"📅 Reseña más reciente - {resena_real['puntuacion']}/1.0"
    elif resena_real['criterio'] == 'positiva':
        highlight = f"⭐ Mejor valorada - {resena_real['puntuacion']}/1.0"
    elif resena_real['criterio'] == 'polaridad':
        if resena_real['puntuacion'] > 0.5:
            highlight = f"🔥 Más positiva - {resena_real['puntuacion']}/1.0"
        else:
            highlight = f"💬 Opinión fuerte - {resena_real['puntuacion']}/1.0"
    else:
        highlight = f"★ {resena_real['puntuacion']}/1.0"
    
    return {
        'review': texto,
        'highlight': highlight,
        'sentimiento': resena_real['etiqueta'],
        'es_real': True,
        'criterio': resena_real['criterio']
    }

# =============================================
# ENDPOINTS ACTUALIZADOS CON RESEÑAS REALES
# =============================================

@app.route('/api/top_songs', methods=['GET'])
def top_songs():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cur = conn.cursor()
    try:
        query = """
            SELECT 
                c.id_cancion as id,
                c.titulo as title,
                c.artista as artist,
                c.spotify_uri,
                ROUND(AVG(s.puntuacion), 3) AS rating,
                COUNT(s.id_sentimiento) AS total_reviews
            FROM canciones c
            JOIN resenas r ON r.id_cancion = c.id_cancion
            JOIN sentimientos s ON s.id_resena = r.id_resena
            WHERE s.puntuacion IS NOT NULL
            GROUP BY c.id_cancion, c.titulo, c.artista, c.spotify_uri
            HAVING COUNT(s.id_sentimiento) >= 1
            ORDER BY rating DESC, total_reviews DESC
            LIMIT 10;
        """
        cur.execute(query)
        resultados = cur.fetchall()

        if not resultados:
            return jsonify([]), 200

        # Convertir a lista de diccionarios y obtener imágenes de Spotify
        canciones_mejoradas = []
        for row in resultados:
            cancion = {
                'id': row[0],
                'title': row[1],
                'artist': row[2],
                'spotify_uri': row[3],
                'rating': float(row[4]),
                'total_reviews': row[5],
                'cover_url': None
            }
            
            # Intentar obtener imagen de Spotify
            if row[3]:  # Si tiene spotify_uri
                try:
                    track_id = row[3].split(':')[-1]  # Extraer ID de la URI
                    track_info = sp_search.track(track_id)
                    if track_info and track_info['album']['images']:
                        cancion['cover_url'] = track_info['album']['images'][0]['url']
                except Exception as e:
                    print(f"Error obteniendo imagen para {row[1]}: {e}")
            
            # Obtener reseña real (priorizar positiva, luego reciente)
            reseña_real = obtener_mejor_resena_real(cancion['id'], 'cancion', 'positiva')
            if not reseña_real:
                reseña_real = obtener_mejor_resena_real(cancion['id'], 'cancion', 'reciente')
            
            if reseña_real:
                reseña_formateada = formatear_resena_real(reseña_real, cancion, 'cancion')
                cancion['review'] = reseña_formateada['review']
                cancion['review_highlight'] = reseña_formateada['highlight']
                cancion['review_sentiment'] = reseña_formateada['sentimiento']
                cancion['review_type'] = 'real'
            else:
                # Fallback a reseña generica si no hay reseñas reales
                cancion['review'] = f"'{cancion['title']}' ha sido valorada positivamente por la comunidad con una calificación de {cancion['rating']}/1.0."
                cancion['review_highlight'] = f"★ Calificación promedio: {cancion['rating']}/1.0"
                cancion['review_type'] = 'generic'
            
            canciones_mejoradas.append(cancion)

        return jsonify(canciones_mejoradas), 200

    except Exception as e:
        print(f"Error en /api/top_songs: {e}")
        return jsonify({'error': 'Error al obtener las mejores canciones'}), 500
    finally:
        cur.close()
        close_db_connection(conn)

@app.route('/api/top_albums', methods=['GET'])
def top_albums():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cur = conn.cursor()
    try:
        # Primero verificar si hay reseñas de álbumes
        cur.execute("SELECT COUNT(*) FROM resenas WHERE id_album IS NOT NULL")
        count_albums = cur.fetchone()[0]
        
        if count_albums == 0:
            return jsonify([]), 200

        query = """
            SELECT 
                a.id_album as id,
                a.titulo as title,
                a.artista as artist,
                ROUND(AVG(s.puntuacion), 3) AS rating,
                COUNT(s.id_sentimiento) AS total_reviews
            FROM resenas r
            JOIN albumes a ON a.id_album = r.id_album
            JOIN sentimientos s ON s.id_resena = r.id_resena
            WHERE r.id_album IS NOT NULL AND s.puntuacion IS NOT NULL
            GROUP BY a.id_album, a.titulo, a.artista
            HAVING COUNT(s.id_sentimiento) >= 1
            ORDER BY rating DESC, total_reviews DESC
            LIMIT 10;
        """
        cur.execute(query)
        resultados = cur.fetchall()

        if not resultados:
            return jsonify([]), 200

        # Convertir a lista de diccionarios
        albumes_mejorados = []
        for row in resultados:
            album = {
                'id': row[0],
                'title': row[1],
                'artist': row[2],
                'rating': float(row[3]),
                'total_reviews': row[4],
                'cover_url': None
            }
            
            # Intentar obtener imagen de Spotify buscando el álbum
            try:
                results = sp_search.search(q=f"{row[1]} {row[2]}", type='album', limit=1)
                if results['albums']['items']:
                    album_info = results['albums']['items'][0]
                    if album_info['images']:
                        album['cover_url'] = album_info['images'][0]['url']
            except Exception as e:
                print(f"Error obteniendo imagen para álbum {row[1]}: {e}")
            
            # Obtener reseña real (priorizar positiva, luego reciente)
            reseña_real = obtener_mejor_resena_real(album['id'], 'album', 'positiva')
            if not reseña_real:
                reseña_real = obtener_mejor_resena_real(album['id'], 'album', 'reciente')
            
            if reseña_real:
                reseña_formateada = formatear_resena_real(reseña_real, album, 'album')
                album['review'] = reseña_formateada['review']
                album['review_highlight'] = reseña_formateada['highlight']
                album['review_sentiment'] = reseña_formateada['sentimiento']
                album['review_type'] = 'real'
            else:
                # Fallback a reseña generica si no hay reseñas reales
                album['review'] = f"El álbum '{album['title']}' ha recibido críticas positivas con una calificación promedio de {album['rating']}/1.0."
                album['review_highlight'] = f"★ Calificación: {album['rating']}/1.0"
                album['review_type'] = 'generic'
            
            albumes_mejorados.append(album)

        return jsonify(albumes_mejorados), 200

    except Exception as e:
        print(f"Error en /api/top_albums: {e}")
        return jsonify({'error': 'Error al obtener los mejores álbumes'}), 500
    finally:
        cur.close()
        close_db_connection(conn)

# =============================================
# NUEVO ENDPOINT PARA OBTENER RESEÑAS ESPECÍFICAS
# =============================================

@app.route('/api/item-reviews/<int:item_id>', methods=['GET'])
def get_item_reviews(item_id):
    """
    Obtiene diferentes tipos de reseñas para un item específico
    """
    try:
        item_type = request.args.get('type', 'cancion')  # 'cancion' o 'album'
        criterio = request.args.get('criterio', 'reciente')  # 'reciente', 'positiva', 'polaridad'
        
        reseña_real = obtener_mejor_resena_real(item_id, item_type, criterio)
        
        if reseña_real:
            return jsonify({
                "success": True,
                "review": reseña_real,
                "criterio": criterio
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "No se encontraron reseñas para este item"
            }), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
    print("🚀 Iniciando servidor Beating...")
    print(f"📊 Base de datos: {'✅ Conectada' if app.config['POSTGRES_POOL'] else '❌ Error'}")
    print(f"🎵 Spotify: {'✅ Configurado' if sp_search else '❌ Error'}")
    print(f"🔐 Spotify User: {'✅ Autenticado' if sp_user else '⚠️ Necesita autenticación'}")
    print("🌐 Servidor corriendo en: http://localhost:5000")
    app.run(debug=True, port=5000)