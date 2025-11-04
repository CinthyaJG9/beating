import os

# Configuración de la base de datos
DATABASE_CONFIG = {
    'dsn': "dbname=beatingbd user=postgres password=856595J host=localhost port=5432",
    'pool_min': 1,
    'pool_max': 20
}

# Configuración de Spotify
SPOTIFY_CONFIG = {
    'client_id': "02cb14984f5f49ebb2be0901e2f0eaf1",
    'client_secret': "8c39e4ac87fa47aa8d4122b1567afb5e",
    'redirect_uri': "http://127.0.0.1:8888/callback",
    'scope': "playlist-modify-public playlist-modify-private user-read-private user-read-email"
}

# Configuración de la aplicación
APP_CONFIG = {
    'secret_key': 'tu_clave_super_secreta',
    'debug': True,
    'port': 5000
}