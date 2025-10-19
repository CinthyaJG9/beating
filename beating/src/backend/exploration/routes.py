from flask import request, jsonify
from database.connection import db  # ← Importación correcta
from spotify.client import spotify_client  # ← Importación correcta

def init_exploration_routes(app):
    
    @app.route('/api/top_songs', methods=['GET'])
    def top_songs():
        conn = None  # ← Inicializar conn
        try:
            # CORREGIDO: Usar db.get_connection()
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
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
                        # CORREGIDO: Usar spotify_client.sp_search
                        track_info = spotify_client.sp_search.track(track_id)
                        if track_info and track_info['album']['images']:
                            cancion['cover_url'] = track_info['album']['images'][0]['url']
                    except Exception as e:
                        print(f"Error obteniendo imagen para {row[1]}: {e}")
                
                # Obtener reseña real (priorizar positiva, luego reciente)
                reseña_real = obtener_mejor_resena_real(conn, cancion['id'], 'cancion', 'positiva')
                if not reseña_real:
                    reseña_real = obtener_mejor_resena_real(conn, cancion['id'], 'cancion', 'reciente')
                
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
            if cur:
                cur.close()
            # CORREGIDO: Usar db.close_connection()
            if conn:
                db.close_connection(conn)

    @app.route('/api/top_albums', methods=['GET'])
    def top_albums():
        conn = None  # ← Inicializar conn
        try:
            # CORREGIDO: Usar db.get_connection()
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
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
                    # CORREGIDO: Usar spotify_client.sp_search
                    results = spotify_client.sp_search.search(q=f"{row[1]} {row[2]}", type='album', limit=1)
                    if results['albums']['items']:
                        album_info = results['albums']['items'][0]
                        if album_info['images']:
                            album['cover_url'] = album_info['images'][0]['url']
                except Exception as e:
                    print(f"Error obteniendo imagen para álbum {row[1]}: {e}")
                
                # Obtener reseña real (priorizar positiva, luego reciente)
                reseña_real = obtener_mejor_resena_real(conn, album['id'], 'album', 'positiva')
                if not reseña_real:
                    reseña_real = obtener_mejor_resena_real(conn, album['id'], 'album', 'reciente')
                
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
            if cur:
                cur.close()
            # CORREGIDO: Usar db.close_connection()
            if conn:
                db.close_connection(conn)

# Añadir las funciones auxiliares que faltan
def obtener_mejor_resena_real(conn, item_id, tipo, criterio='positiva'):
    """Obtiene la mejor reseña real según el criterio especificado"""
    try:
        cur = conn.cursor()
        
        if tipo == 'cancion':
            if criterio == 'positiva':
                query = """
                    SELECT r.texto_resena, s.etiqueta, s.puntuacion, r.fecha_creacion
                    FROM resenas r
                    JOIN sentimientos s ON r.id_resena = s.id_resena
                    WHERE r.id_cancion = %s AND s.etiqueta = 'positivo'
                    ORDER BY s.puntuacion DESC, r.fecha_creacion DESC
                    LIMIT 1
                """
            else:  # reciente
                query = """
                    SELECT r.texto_resena, s.etiqueta, s.puntuacion, r.fecha_creacion
                    FROM resenas r
                    JOIN sentimientos s ON r.id_resena = s.id_resena
                    WHERE r.id_cancion = %s
                    ORDER BY r.fecha_creacion DESC
                    LIMIT 1
                """
        else:  # album
            if criterio == 'positiva':
                query = """
                    SELECT r.texto_resena, s.etiqueta, s.puntuacion, r.fecha_creacion
                    FROM resenas r
                    JOIN sentimientos s ON r.id_resena = s.id_resena
                    WHERE r.id_album = %s AND s.etiqueta = 'positivo'
                    ORDER BY s.puntuacion DESC, r.fecha_creacion DESC
                    LIMIT 1
                """
            else:  # reciente
                query = """
                    SELECT r.texto_resena, s.etiqueta, s.puntuacion, r.fecha_creacion
                    FROM resenas r
                    JOIN sentimientos s ON r.id_resena = s.id_resena
                    WHERE r.id_album = %s
                    ORDER BY r.fecha_creacion DESC
                    LIMIT 1
                """
        
        cur.execute(query, (item_id,))
        result = cur.fetchone()
        cur.close()
        
        if result:
            return {
                'texto': result[0],
                'sentimiento': result[1],
                'puntuacion': result[2],
                'fecha': result[3]
            }
        return None
        
    except Exception as e:
        print(f"Error obteniendo reseña real: {e}")
        return None

def formatear_resena_real(reseña, item, tipo):
    """Formatea una reseña real para mostrarla en la interfaz"""
    texto = reseña['texto']
    sentimiento = reseña['sentimiento']
    
    # Acortar el texto si es muy largo
    if len(texto) > 150:
        texto = texto[:147] + "..."
    
    highlight = f"★ {reseña['puntuacion']:.1f}/1.0 - Reseña {sentimiento}"
    
    return {
        'review': texto,
        'highlight': highlight,
        'sentimiento': sentimiento
    }