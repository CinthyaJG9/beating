import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
from config import SPOTIFY_CONFIG

class SpotifyClient:
    def __init__(self):
        self.sp_oauth = None
        self.sp_user = None
        self.sp_search = None
        self.user_id = None
        self.init_clients()
        self.token_info = None
    
    def init_clients(self):

        try:
            # 🔥 CORREGIR: Usar LOCALHOST y el puerto correcto
            redirect_uri = "http://127.0.0.1:5000/callback" 
            
            self.sp_oauth = SpotifyOAuth(
                client_id=SPOTIFY_CONFIG['client_id'],
                client_secret=SPOTIFY_CONFIG['client_secret'],
                redirect_uri="http://127.0.0.1:5000/callback",
                scope=SPOTIFY_CONFIG['scope'],
                open_browser=False
            )
            
            print(f"🔗 Spotify OAuth configurado con Redirect URI: {self.sp_oauth.redirect_uri}")
            
            token_info = self.sp_oauth.get_cached_token()
            if token_info:
                self.sp_user = spotipy.Spotify(auth=token_info['access_token'])
                self.user_id = self.sp_user.me()['id']
                print("✅ Spotify autenticado correctamente")
            else:
                print("⚠️ No hay token en caché. Se necesitará autenticación.")
                
        except Exception as e:
            print(f"❌ Error en configuración de Spotify OAuth: {e}")
        
        # Cliente para búsquedas públicas
        try:
            self.sp_search = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
                client_id=SPOTIFY_CONFIG['client_id'],
                client_secret=SPOTIFY_CONFIG['client_secret']
            ))
            print("✅ Cliente de búsqueda de Spotify configurado")
        except Exception as e:
            print(f"❌ Error configurando cliente de búsqueda: {e}")

    def is_user_authenticated(self):
        """Verifica si el usuario está autenticado y refresca el token si es necesario"""
        try:
            if not self.sp_oauth:
                print("❌ sp_oauth no está configurado")
                return False
                
            # Verificar si hay token en caché
            self.token_info = self.sp_oauth.get_cached_token()
            
            if not self.token_info:
                print("❌ No hay token en caché")
                return False
                
            # Verificar si el token expiró y refrescar
            if self.sp_oauth.is_token_expired(self.token_info):
                print("🔄 Token expirado, refrescando...")
                self.token_info = self.sp_oauth.refresh_access_token(self.token_info['refresh_token'])
            
            # Recrear cliente de Spotify con token actualizado
            self.sp_user = spotipy.Spotify(auth=self.token_info['access_token'])
            
            # Verificar que el token funcione
            user_test = self.sp_user.me()
            self.user_id = user_test['id']
            
            print(f"✅ Usuario autenticado: {self.user_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error en verificación de autenticación: {e}")
            return False


# Instancia global de Spotify
spotify_client = SpotifyClient()