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
    
    def init_clients(self):
        # Cliente para autenticación de usuario
        try:
            self.sp_oauth = SpotifyOAuth(
                client_id=SPOTIFY_CONFIG['client_id'],
                client_secret=SPOTIFY_CONFIG['client_secret'],
                redirect_uri=SPOTIFY_CONFIG['redirect_uri'],
                scope=SPOTIFY_CONFIG['scope'],
                open_browser=False
            )
            
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

# Instancia global de Spotify
spotify_client = SpotifyClient()