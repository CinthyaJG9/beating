from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import psycopg2
import datetime
from functools import wraps
from psycopg2 import pool
import requests
import base64
from textblob import TextBlob
import spotipy
from spotipy.oauth2 import SpotifyOAuth

from collections import Counter
import matplotlib.pyplot as plt
from wordcloud import WordCloud
from io import BytesIO
import base64
import numpy as np
from transformers import pipeline
import torch

app = Flask(__name__)
CORS(app)

SPOTIFY_CLIENT_ID = "a8cb712fca1e44c585da79f7cdce491b"
SPOTIFY_CLIENT_SECRET = "0986552cf1904162b347518da7779ee5"
SPOTIFY_REDIRECT_URI = "http://localhost:8888/callback"
SPOTIFY_SCOPE = "playlist-modify-public playlist-modify-private"
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri=SPOTIFY_REDIRECT_URI,
    scope=SPOTIFY_SCOPE
))
auth_manager = SpotifyClientCredentials(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET
)
sp = spotipy.Spotify(auth_manager=auth_manager)
# Configuracion BD
app.config['SECRET_KEY'] = 'tu_clave_super_secreta'
app.config['POSTGRES_POOL'] = psycopg2.pool.SimpleConnectionPool(
    1, 20,
    database="beating_bd",
    user="postgres",
    password="admin",
    host="localhost",
    port="5432"
)

def get_db_connection():
    return app.config['POSTGRES_POOL'].getconn()

def close_db_connection(conn):
    app.config['POSTGRES_POOL'].putconn(conn)

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
            device = 0 if torch.cuda.is_available() else -1
            sentiment_analyzer = pipeline(
                "text-classification",
                model="finiteautomata/beto-sentiment-analysis",
                device=0 if torch.cuda.is_available() else -1,
                truncation=True
            )


            app.logger.info("Analizador de sentimientos inicializado correctamente")
        except Exception as e:
            app.logger.error(f"Error inicializando analizador: {str(e)}")
            raise RuntimeError("No se pudo inicializar el analizador de sentimientos")

# Llamar esta función al inicio de la aplicación
inicializar_analizador()

def analizar_sentimiento_transformers(texto):
    try:
        inicializar_analizador()
        resultado = sentiment_analyzer(texto)[0]
        etiqueta_raw = resultado['label'].lower()
        
        if etiqueta_raw in ['pos', 'positive']:
            return 'positivo', round(float(resultado['score']), 2)
        elif etiqueta_raw in ['neg', 'negative']:
            return 'negativo', round(float(-resultado['score']), 2)
        else:
            return 'neutral', 0.0
    except Exception as e:
        print(f"Error en análisis con transformers: {str(e)}")
        return 'neutral', 0.0


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    correo = data.get("email")
    contrasena = data.get("password")

    if not correo or not contrasena:
        return jsonify({"error": "Faltan datos"}), 400

    try:
        conn = get_db_connection()
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
        cur = conn.cursor()

        cur.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
        if cur.fetchone():
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

def buscar_o_insertar_cancion(nombre, artista, conn):
    results = sp.search(q=f"{nombre} {artista}", type="track", limit=1)
    if not results['tracks']['items']:
        raise Exception("No se encontró la canción en Spotify")

    track = results['tracks']['items'][0]
    titulo = track['name']
    artista = track['artists'][0]['name']
    duracion = round(track['duration_ms'] / 1000)
    uri = track['uri']

    cur = conn.cursor()
    cur.execute("SELECT id_cancion FROM canciones WHERE titulo = %s AND artista = %s", (titulo, artista))
    row = cur.fetchone()
    if row:
        cur.close()
        return row[0]

    cur.execute(
        "INSERT INTO canciones (titulo, artista, duracion_segundos, spotify_uri) VALUES (%s, %s, %s, %s) RETURNING id_cancion",
        (titulo, artista, duracion, uri)
    )
    id_cancion = cur.fetchone()[0]
    conn.commit()
    cur.close()
    return id_cancion

# Primero agregamos esta columna si no existe (ejecutar una sola vez)
def agregar_columna_spotify_uri():
    try:
        conn = get_db_connection()
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

        # Análisis del sentimiento con transformers
        def analizar_sentimiento(texto):
            try:
                inicializar_analizador()
                resultado = sentiment_analyzer(texto)[0]
                etiqueta = resultado['label'].lower()
                puntuacion = resultado['score']
                
                # Convertir a nuestro formato
                if etiqueta == 'positive':
                    return 'positivo', round(float(puntuacion), 3)
                elif etiqueta == 'negative':
                    return 'negativo', round(float(-puntuacion), 3)
                else:
                    return 'neutral', 0.0
            except Exception as e:
                app.logger.error(f"Error en análisis de sentimiento: {str(e)}")
                return 'neutral', 0.0

        sentimiento, puntuacion = analizar_sentimiento_transformers(contenido)

        user_id = request.user_id

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            if tipo == "cancion":
                # Buscar canción en Spotify
                results = sp.search(q=f"{nombre} {artista}", type="track", limit=1)
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

            # Debug información
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
        # Obtener información del usuario actual de Spotify
        try:
            current_user = sp.me()
            user_id = current_user['id']
            print(f"\nUsuario de Spotify: {user_id} ({current_user.get('display_name', 'sin nombre')})")
        except Exception as e:
            print(f"\nError obteniendo usuario de Spotify: {str(e)}")
            return jsonify({"error": "Error de autenticación con Spotify"}), 500

        # Obtener canciones para la playlist
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            SELECT 
                c.spotify_uri,
                c.titulo,
                c.artista,
                AVG(s.puntuacion) as promedio,
                COUNT(r.id_resena) as total_resenas
            FROM canciones c
            JOIN resenas r ON c.id_cancion = r.id_cancion
            JOIN sentimientos s ON r.id_resena = s.id_resena
            WHERE c.spotify_uri IS NOT NULL
            AND s.etiqueta = 'positivo'
            GROUP BY c.id_cancion, c.spotify_uri, c.titulo, c.artista
            ORDER BY promedio DESC, total_resenas DESC
            LIMIT 10
        ''')
        
        resultados = cur.fetchall()
        uris = [row[0] for row in resultados if row[0]]
        cur.close()
        close_db_connection(conn)

        print("\nCanciones seleccionadas para la playlist:")
        for idx, (uri, titulo, artista, promedio, resenas) in enumerate(resultados, 1):
            print(f"{idx}. {titulo} - {artista} | Puntuación: {promedio:.2f} | Reseñas: {resenas}")

        if not uris:
            print("\nNo hay canciones válidas para la playlist")
            return jsonify({"error": "No hay canciones con reseñas positivas"}), 400

        # Buscar playlist existente específica para este usuario
        playlist_name = f"Top Beating - {user_id[-4:]}"  # Usamos parte del ID para hacerla única
        playlists = sp.current_user_playlists(limit=50)
        playlist_id = None

        print("\nBuscando playlist existente...")
        for playlist in playlists['items']:
            print(f"Playlist encontrada: {playlist['name']} (ID: {playlist['id']})")
            if playlist['name'] == playlist_name:
                playlist_id = playlist['id']
                break

        # Crear o actualizar playlist
        if playlist_id:
            print(f"\nActualizando playlist existente: {playlist_id}")
            try:
                # Primero vaciar la playlist
                sp.playlist_replace_items(playlist_id, [])
                # Luego agregar las nuevas canciones
                sp.playlist_add_items(playlist_id, uris)
                mensaje = "Playlist actualizada exitosamente"
                print(mensaje)
            except Exception as e:
                print(f"\nError actualizando playlist: {str(e)}")
                return jsonify({"error": str(e)}), 500
        else:
            print("\nCreando nueva playlist...")
            try:
                playlist = sp.user_playlist_create(
                    user=user_id,
                    name=playlist_name,
                    public=False,
                    description=f"Top canciones con mejores reseñas (actualizada: {datetime.datetime.now().strftime('%Y-%m-%d')}"
                )
                playlist_id = playlist['id']
                sp.playlist_add_items(playlist_id, uris)
                mensaje = "Playlist creada exitosamente"
                print(mensaje)
            except Exception as e:
                print(f"\nError creando playlist: {str(e)}")
                return jsonify({"error": str(e)}), 500

        return jsonify({
            "success": True,
            "message": mensaje,
            "playlist_id": playlist_id,
            "playlist_url": f"https://open.spotify.com/playlist/{playlist_id}",
            "tracks_added": len(uris),
            "user_id": user_id
        }), 201

    except Exception as e:
        print(f"\nError en crear_playlist: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/buscar', methods=['GET'])
def buscar():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Falta el parámetro de búsqueda"}), 400

    try:
        resultados = sp.search(q=query, type="track", limit=10)
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
        # Forzar renovación del token si es necesario
        global sp
        try:
            results = sp.search(q=query, type='artist', limit=5, market='US')
        except Exception as e:
            print("Error en la solicitud, recreando cliente Spotify...")
            sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
                client_id=SPOTIFY_CLIENT_ID,
                client_secret=SPOTIFY_CLIENT_SECRET
            ))
            results = sp.search(q=query, type='artist', limit=5, market='US')

        if 'artists' not in results:
            return jsonify({"error": "Formato de respuesta inesperado"}), 500

        artistas = [{
            "id": item['id'],
            "name": item['name'],
            "image": item['images'][0]['url'] if item.get('images') else None,
            "genres": item.get('genres', [])[:3]  # Primeros 3 géneros
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
    if not artist_id:
        return jsonify({"error": "Falta el id del artista"}), 400

    try:
        # Obtener información básica del artista
        artist_info = sp.artist(artist_id)
        
        # Obtener top tracks
        top_tracks = sp.artist_top_tracks(artist_id, country='US')
        
        # Obtener álbumes del artista
        albums = sp.artist_albums(
            artist_id, 
            album_type='album,single,compilation',
            limit=50  # Aumentamos el límite para obtener más canciones
        )
        
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
        
        # Procesar canciones de álbumes (evitando duplicados)
        seen_tracks = set()
        for album in albums['items']:
            try:
                tracks = sp.album_tracks(album['id'])
                for track in tracks['items']:
                    track_id = track['id']
                    if track_id not in seen_tracks:
                        seen_tracks.add(track_id)
                        canciones.append({
                            "uri": track['uri'],
                            "id": track['id'],
                            "name": track['name'],
                            "album": album['name'],
                            "album_image": album['images'][0]['url'] if album.get('images') else None,
                            "artists": [artist['name'] for artist in track['artists']],
                            "duration_ms": track['duration_ms'],
                            "popularity": 0,  # No disponible en este endpoint
                            "preview_url": None,  # No disponible en este endpoint
                            "is_top_track": False
                        })
            except Exception as e:
                continue  # Si hay error con un álbum, continuamos con los demás
        
        # Ordenar canciones por popularidad (las más populares primero)
        canciones.sort(key=lambda x: x['popularity'], reverse=True)
        
        return jsonify({
            "artist": {
                "name": artist_info['name'],
                "image": artist_info['images'][0]['url'] if artist_info.get('images') else None,
                "genres": artist_info.get('genres', []),
                "followers": artist_info.get('followers', {}).get('total', 0)
            },
            "tracks": canciones
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Endpoint para obtener datos de análisis
@app.route('/analisis-resenas', methods=['GET'])
def analisis_resenas():
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Configurar matplotlib para no usar GUI
        import matplotlib
        matplotlib.use('Agg')  # Importantísimo para evitar problemas de hilos
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
            nueva_etiqueta, nueva_puntuacion = analizar_sentimiento(texto)
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
    
        # Definir analizar_sentimiento fuera del bucle para que esté disponible
        def analizar_sentimiento(texto):
            from textblob import TextBlob
            from textblob.sentiments import PatternAnalyzer
            
            # Configuración mejorada para español
            try:
                # Usar PatternAnalyzer con parámetros ajustados
                blob = TextBlob(texto, analyzer=PatternAnalyzer())
                
                # Obtener polaridad con más precisión
                polaridad = blob.sentiment.polarity
                
                # Umbrales más sensibles y manejo mejorado
                if polaridad >= 0.01:  # Más sensible para positivos
                    return 'positivo', round(polaridad, 3)  # Más decimales
                elif polaridad <= -0.01:  # Más sensible para negativos
                    return 'negativo', round(polaridad, 3)
                else:
                    return 'neutral', round(polaridad, 3)
                    
            except Exception as e:
                app.logger.error(f"Error en análisis de sentimiento: {str(e)}")
                return 'neutral', 0.0
    
            for id_resena, texto, etiqueta_antigua, puntuacion_antigua in reseñas:
                try:
                    nueva_etiqueta, nueva_puntuacion = analizar_sentimiento(texto)
                    
                    # LÍNEA CORREGIDA (paréntesis balanceados):
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

if __name__ == '__main__':
    app.run(debug=True)