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

app = Flask(__name__)
CORS(app)

SPOTIFY_CLIENT_ID = "a8cb712fca1e44c585da79f7cdce491b"
SPOTIFY_CLIENT_SECRET = "0986552cf1904162b347518da7779ee5"
SPOTIFY_REDIRECT_URI = "http://localhost:8888/callback"
SPOTIFY_SCOPE = "playlist-modify-public playlist-modify-private"

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri=SPOTIFY_REDIRECT_URI,
    scope=SPOTIFY_SCOPE
))

# Configuracion BD
app.config['SECRET_KEY'] = 'tu_clave_super_secreta'
app.config['POSTGRES_POOL'] = psycopg2.pool.SimpleConnectionPool(
    1, 20,
    database="beating_bd",
    user="postgres",
    password="856595J",
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

def analizar_sentimiento(texto):
    blob = TextBlob(texto)
    polaridad = blob.sentiment.polarity
    if polaridad > 0.1:
        return 'positivo', round(polaridad, 2)
    elif polaridad < -0.1:
        return 'negativo', round(abs(polaridad), 2)
    else:
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

@app.route('/resenas', methods=['POST'])
def subir_resena():
    try:
        data = request.get_json()
        nombre = data.get('nombre')
        artista = data.get('artista')
        contenido = data.get('contenido')
        tipo = data.get('tipo')

        if not nombre or not artista or not contenido or not tipo:
            return jsonify({"error": "Faltan datos"}), 400

        sentimiento, puntuacion = analizar_sentimiento(contenido)

        conn = get_db_connection()
        cur = conn.cursor()

        if tipo == "cancion":
            id_cancion = buscar_o_insertar_cancion(nombre, artista, conn)
            cur.execute("INSERT INTO resenas (id_usuario, id_cancion, texto_resena) VALUES (%s, %s, %s) RETURNING id_resena", (1, id_cancion, contenido))

        elif tipo == "album":
            cur.execute("SELECT id_album FROM albumes WHERE titulo = %s AND artista = %s", (nombre, artista))
            row = cur.fetchone()
            if row:
                id_album = row[0]
            else:
                cur.execute("INSERT INTO albumes (titulo, artista, anio_lanzamiento) VALUES (%s, %s, %s) RETURNING id_album", (nombre, artista, 2024))
                id_album = cur.fetchone()[0]

            cur.execute("INSERT INTO resenas (id_usuario, id_album, texto_resena) VALUES (%s, %s, %s) RETURNING id_resena", (1, id_album, contenido))

        id_resena = cur.fetchone()[0]
        cur.execute("INSERT INTO sentimientos (id_resena, etiqueta, puntuacion) VALUES (%s, %s, %s)", (id_resena, sentimiento, puntuacion))
        conn.commit()

        if tipo == "cancion":
            try:
                requests.post("http://localhost:5000/crear_playlist")
            except Exception as e:
                print("Error al actualizar playlist:", e)

        cur.close()
        close_db_connection(conn)

        return jsonify({"message": "Reseña registrada con análisis de sentimiento"}), 201

    except Exception as e:
        print("Error en /resenas:", e)
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/crear_playlist', methods=['POST'])
def crear_playlist():
    user_id = sp.me()['id']
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        SELECT c.spotify_uri
        FROM canciones c
        JOIN resenas r ON c.id_cancion = r.id_cancion
        JOIN sentimientos s ON r.id_resena = s.id_resena
        WHERE c.spotify_uri IS NOT NULL
        GROUP BY c.id_cancion, c.spotify_uri
        ORDER BY AVG(s.puntuacion) DESC
        LIMIT 10
    ''')
    uris = [row[0] for row in cur.fetchall() if row[0]]
    cur.close()
    close_db_connection(conn)

    if not uris:
        return jsonify({"error": "No hay canciones válidas para la playlist"}), 400

    playlists = sp.current_user_playlists()
    nombre_objetivo = "Top Beating"
    playlist_id = None

    for playlist in playlists['items']:
        if playlist['name'] == nombre_objetivo:
            playlist_id = playlist['id']
            break

    if playlist_id:
        sp.playlist_replace_items(playlist_id, uris)
        mensaje = "Playlist actualizada"
    else:
        playlist = sp.user_playlist_create(
            user=user_id,
            name=nombre_objetivo,
            public=False,
            description="Playlist generada automáticamente por Beating"
        )
        playlist_id = playlist['id']
        sp.playlist_add_items(playlist_id, uris)
        mensaje = "Playlist creada"

    return jsonify({"message": mensaje, "playlist_url": f"https://open.spotify.com/playlist/{playlist_id}"}), 201

if __name__ == '__main__':
    app.run(debug=True)
