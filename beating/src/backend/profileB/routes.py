from flask import Blueprint, jsonify, request
from functools import wraps
import jwt
import datetime

try:
    from config import APP_CONFIG
except ImportError:
    APP_CONFIG = {'secret_key': 'mi_clave_secreta_super_segura_12345'}

class AuthUser:
    def __init__(self, payload):
        self.id = str(payload.get("user_id")) 
        self.username = payload.get("username")
        self.email = payload.get("email")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'message': 'Authorization required: Token missing'}), 401
        
        try:
            payload = jwt.decode(token, APP_CONFIG['secret_key'], algorithms=["HS256"])
            current_user = AuthUser(payload)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token ha expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido o mal formado'}), 401
        except Exception:
            return jsonify({'message': 'Error desconocido en la autenticación'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

MOCK_USER_ID = "123" # ID que usamos para mostrar los datos simulados

def get_mock_user_info(user_id):
    """Simula obtener la info básica del usuario."""
    # Solo devolvemos datos si el ID del token coincide con el ID mock
    if str(user_id) == MOCK_USER_ID:
        return {
            "id": MOCK_USER_ID,
            "nombre_usuario": "AuraBeatX",
            "correo": "aura.beat@music.com",
            "fecha_creacion": "2023-01-15T12:00:00Z" # Formato ISO para React
        }
    # En una aplicación real, aquí buscarías el usuario por user_id en la DB
    return None 

def get_mock_user_reviews(user_id):
    """Simula obtener las reseñas del usuario."""
    if str(user_id) == MOCK_USER_ID:
        return [
            {
                "id_resena": 101, "tipo": "canción", "cancion_titulo": "Midnight Serenade",
                "album_titulo": None, "texto_resena": "Una pieza de ensueño.",
                "sentimiento": "positivo", "puntuacion": 0.9,
                "fecha_creacion": "2024-09-28T15:30:00Z"
            },
            {
                "id_resena": 102, "tipo": "album", "cancion_titulo": None,
                "album_titulo": "Neon Dreams Vol. 2", "texto_resena": "El álbum es desigual, se siente apresurado.",
                "sentimiento": "negativo", "puntuacion": 0.4,
                "fecha_creacion": "2024-09-25T11:00:00Z"
            }
        ]
    return []

# ... (El resto de las funciones mock no necesitan cambios) ...
def get_mock_user_following(user_id):
    """Simula obtener la lista de usuarios seguidos."""
    if str(user_id) == MOCK_USER_ID:
        return [
            {
                "id_seguido": 201, "nombre_usuario": "DjRhythm",
                "correo": "djrhythm@beat.com", "fecha_seguimiento": "2024-01-10T09:00:00Z"
            },
            {
                "id_seguido": 202, "nombre_usuario": "MusicLover99",
                "correo": "lover@beat.com", "fecha_seguimiento": "2023-11-20T18:00:00Z"
            }
        ]
    return []

def get_mock_user_stats(user_id):
    """Simula obtener las estadísticas del perfil."""
    if str(user_id) == MOCK_USER_ID:
        return {
            "seguidores": 450,
            "seguidos": 2,
            "resenas": 12,
            "listas_reproduccion": 5
        }
    return None

# ----------------------------------------------------
# BLUEPRINT Y RUTAS
# ----------------------------------------------------

profileB_routes = Blueprint('profileB_routes', __name__)

# 1. Ruta para obtener la información básica del usuario:
# URL: /api/usuarios/{userId}
@profileB_routes.route('/api/usuarios/<string:user_id>', methods=['GET'])
@token_required
def get_user_info(current_user, user_id):
    """GET: /api/usuarios/<id> -> Devuelve info básica del usuario."""
    
    # IMPORTANTE: Aquí verificarías que user_id sea igual a current_user.id 
    # si es el perfil propio, o si el usuario tiene permiso para ver el perfil.
    
    user_info = get_mock_user_info(user_id)
    if user_info:
        return jsonify(user_info), 200
    return jsonify({"message": "Usuario no encontrado"}), 404

# 2. Ruta para obtener las reseñas del usuario:
# URL: /api/resenas/usuario/{userId}
@profileB_routes.route('/api/resenas/usuario/<string:user_id>', methods=['GET'])
@token_required
def get_user_reviews_route(current_user, user_id):
    """GET: /api/resenas/usuario/<id> -> Devuelve la lista de reseñas."""
    resenas = get_mock_user_reviews(user_id)
    return jsonify(resenas), 200

# 3. Ruta para obtener la lista de seguidos:
# URL: /api/usuarios/{userId}/seguidos
@profileB_routes.route('/api/usuarios/<string:user_id>/seguidos', methods=['GET'])
@token_required
def get_user_following_route(current_user, user_id):
    """GET: /api/usuarios/<id>/seguidos -> Devuelve la lista de seguidos."""
    seguidos = get_mock_user_following(user_id)
    return jsonify(seguidos), 200

# 4. Ruta para obtener las estadísticas:
# URL: /api/usuarios/{userId}/estadisticas
@profileB_routes.route('/api/usuarios/<string:user_id>/estadisticas', methods=['GET'])
@token_required
def get_user_stats_route(current_user, user_id):
    """GET: /api/usuarios/<id>/estadisticas -> Devuelve el objeto de estadísticas."""
    stats = get_mock_user_stats(user_id)
    if stats:
        # El frontend espera un objeto con una clave 'estadisticas'
        return jsonify({"estadisticas": stats}), 200
    return jsonify({"message": "Estadísticas no encontradas"}), 404
