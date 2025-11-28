from flask import Flask, jsonify, request  # 👈 Añadir 'request' aquí
from config import APP_CONFIG

# Importar módulos
from database.connection import db
from spotify.client import spotify_client
from auth.routes import init_auth_routes
from spotify.routes import init_spotify_routes
from reviews.routes import init_reviews_routes
from exploration.routes import init_exploration_routes
from usuarios.routes import init_usuarios_routes
from canciones.routes import init_canciones_routes
from albumes.routes import init_albumes_routes
from resenas.routes import init_resenas_routes
from listas.routes import init_listas_routes
from seguimientos.routes import init_seguimientos_routes
from comunidad.routes import init_comunidad_routes
from home.routes import init_home_routes

app = Flask(__name__)

# 🔧 CONFIGURACIÓN CORREGIDA DE CORS
@app.after_request
def after_request(response):
    """Añadir headers CORS SOLO UNA VEZ"""
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.before_request
def handle_preflight():
    """Manejar OPTIONS requests - CORREGIDO"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "preflight"})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

# Configurar app
app.config['SECRET_KEY'] = APP_CONFIG['secret_key']

# Inicializar rutas
init_auth_routes(app)
init_spotify_routes(app)
init_reviews_routes(app)
init_exploration_routes(app)
init_usuarios_routes(app)
init_canciones_routes(app)
init_albumes_routes(app)
init_resenas_routes(app)
init_listas_routes(app)
init_seguimientos_routes(app)
init_comunidad_routes(app)
init_home_routes(app)

# 🏠 Rutas básicas
@app.route('/')
def home():
    return jsonify({
        "message": "🎵 Beating API está funcionando", 
        "status": "OK",
        "cors": "fixed"
    })

@app.route('/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "server": "running"
    })


if __name__ == '__main__':
    print("🚀 Iniciando servidor Beating...")
    print("=" * 50)
    print(f"📊 Base de datos: {'✅ Conectada' if db.pool else '❌ Error'}")
    print(f"🎵 Spotify Search: {'✅ Configurado' if spotify_client.sp_search else '❌ Error'}")
    print(f"🔐 Spotify User: {'✅ Autenticado' if spotify_client.sp_user else '⚠️  Necesita autenticación'}")
    print(f"🌐 CORS: ✅ Configurado para http://localhost:5000")
    print(f"🔧 Debug: {'✅ Activado' if APP_CONFIG['debug'] else '❌ Desactivado'}")
    print(f"🌐 Servidor corriendo en: http://localhost:{APP_CONFIG['port']}")
    print("=" * 50)
    
# En app.py, cambia esta línea:
app.run(
    debug=APP_CONFIG['debug'], 
    port=APP_CONFIG['port'],
    host='localhost',  # 👈 CAMBIAR a 'localhost'
    threaded=True
)