from flask import Flask, jsonify
from flask_cors import CORS
from config import APP_CONFIG
#from profileB import profileB_routes
from auth.routes import init_auth_routes

# Importar módulos
from database.connection import db
from spotify.client import spotify_client
from auth.routes import init_auth_routes
from spotify.routes import init_spotify_routes
from reviews.routes import init_reviews_routes
from exploration.routes import init_exploration_routes

# Importar nuevos módulos
from usuarios.routes import init_usuarios_routes
from canciones.routes import init_canciones_routes
from albumes.routes import init_albumes_routes
from resenas.routes import init_resenas_routes
from listas.routes import init_listas_routes
from seguimientos.routes import init_seguimientos_routes

app = Flask(__name__)
CORS(app)

# Configurar app
app.config['SECRET_KEY'] = APP_CONFIG['secret_key']

# Inicializar rutas
init_auth_routes(app)
init_spotify_routes(app)
init_reviews_routes(app)
init_exploration_routes(app)

# Inicializar nuevas rutas
init_usuarios_routes(app)
init_canciones_routes(app)
init_albumes_routes(app)
init_resenas_routes(app)
init_listas_routes(app)
init_seguimientos_routes(app)

# Rutas básicas
@app.route('/')
def home():
    return jsonify({
        "message": "Beating API está funcionando", 
        "status": "OK",
        "spotify_authenticated": spotify_client.sp_user is not None,
        "database_connected": db.pool is not None
    })

@app.route('/test-db')
def test_db():
    try:
        conn = db.get_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT version()")
            version = cur.fetchone()
            cur.close()
            db.close_connection(conn)
            return jsonify({"database": "Conectado", "version": version[0]})
        else:
            return jsonify({"database": "Error de conexión"})
    except Exception as e:
        return jsonify({"database": f"Error: {str(e)}"})

if __name__ == '__main__':
    print("🚀 Iniciando servidor Beating...")
    print(f"📊 Base de datos: {'✅ Conectada' if db.pool else '❌ Error'}")
    print(f"🎵 Spotify: {'✅ Configurado' if spotify_client.sp_search else '❌ Error'}")
    print(f"🔐 Spotify User: {'✅ Autenticado' if spotify_client.sp_user else '⚠️ Necesita autenticación'}")
    print(f"🌐 Servidor corriendo en: http://localhost:{APP_CONFIG['port']}")
    
    app.run(
        debug=APP_CONFIG['debug'], 
        port=APP_CONFIG['port']
    )