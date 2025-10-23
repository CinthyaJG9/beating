from flask import request, jsonify
from database.connection import db
from spotify.client import spotify_client

def init_exploration_routes(app):
    
    @app.route('/api/top_songs', methods=['GET'])
    def top_songs():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Obtener parámetros de filtro
            sentiment_filter = request.args.get('sentiment', 'all')
            limit = int(request.args.get('limit', 10))
            
            # Query base
            base_query = """
                SELECT 
                    c.id_cancion as id,
                    c.titulo as title,
                    c.artista as artist,
                    c.spotify_uri,
                    ROUND(AVG(s.puntuacion), 3) AS rating,
                    COUNT(s.id_sentimiento) AS total_reviews,
                    s.etiqueta as sentiment
                FROM canciones c
                JOIN resenas r ON r.id_cancion = c.id_cancion
                JOIN sentimientos s ON s.id_resena = r.id_resena
                WHERE s.puntuacion IS NOT NULL
            """
            
            # Aplicar filtro de sentimiento
            if sentiment_filter != 'all':
                sentiment_map = {'positive': 'positivo', 'negative': 'negativo', 'neutral': 'neutral'}
                base_query += f" AND s.etiqueta = '{sentiment_map.get(sentiment_filter, 'positivo')}'"
            
            # Completar query
            base_query += """
                GROUP BY c.id_cancion, c.titulo, c.artista, c.spotify_uri, s.etiqueta
                HAVING COUNT(s.id_sentimiento) >= 1
                ORDER BY rating DESC, total_reviews DESC
                LIMIT %s;
            """
            
            cur.execute(base_query, (limit,))
            resultados = cur.fetchall()

            if not resultados:
                return jsonify([]), 200

            # Convertir a lista de diccionarios
            canciones_mejoradas = []
            for row in resultados:
                cancion = {
                    'id': row[0],
                    'title': row[1],
                    'artist': row[2],
                    'spotify_uri': row[3],
                    'rating': round(float(row[4]) * 5, 1),  # Escalado a 0-5
                    'total_reviews': row[5],
                    'review_sentiment': row[6],  # Sentimiento real
                    'cover_url': None
                }
                
                # Obtener imagen de Spotify
                if row[3]:
                    try:
                        track_id = row[3].split(':')[-1]
                        track_info = spotify_client.sp_search.track(track_id)
                        if track_info and track_info['album']['images']:
                            cancion['cover_url'] = track_info['album']['images'][0]['url']
                    except Exception as e:
                        print(f"Error obteniendo imagen para {row[1]}: {e}")
                
                # Obtener reseña real
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
                    cancion['review'] = f"'{cancion['title']}' ha sido valorada positivamente por la comunidad con una calificación de {cancion['rating']}/5.0."
                    cancion['review_highlight'] = f"★ Calificación promedio: {cancion['rating']}/5.0"
                    cancion['review_type'] = 'generic'
                    cancion['review_sentiment'] = 'positivo'  # Default para reseñas genéricas
                
                canciones_mejoradas.append(cancion)

            return jsonify(canciones_mejoradas), 200

        except Exception as e:
            print(f"Error en /api/top_songs: {e}")
            return jsonify({'error': 'Error al obtener las mejores canciones'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/top_albums', methods=['GET'])
    def top_albums():
        conn = None
        try:
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()
            
            # Obtener parámetros de filtro
            sentiment_filter = request.args.get('sentiment', 'all')
            limit = int(request.args.get('limit', 10))
            
            # Primero verificar si hay reseñas de álbumes
            cur.execute("SELECT COUNT(*) FROM resenas WHERE id_album IS NOT NULL")
            count_albums = cur.fetchone()[0]
            
            if count_albums == 0:
                return jsonify([]), 200

            # Query base para álbumes
            base_query = """
                SELECT 
                    a.id_album as id,
                    a.titulo as title,
                    a.artista as artist,
                    ROUND(AVG(s.puntuacion), 3) AS rating,
                    COUNT(s.id_sentimiento) AS total_reviews,
                    s.etiqueta as sentiment
                FROM resenas r
                JOIN albumes a ON a.id_album = r.id_album
                JOIN sentimientos s ON s.id_resena = r.id_resena
                WHERE r.id_album IS NOT NULL AND s.puntuacion IS NOT NULL
            """
            
            # Aplicar filtro de sentimiento
            if sentiment_filter != 'all':
                sentiment_map = {'positive': 'positivo', 'negative': 'negativo', 'neutral': 'neutral'}
                base_query += f" AND s.etiqueta = '{sentiment_map.get(sentiment_filter, 'positivo')}'"
            
            # Completar query
            base_query += """
                GROUP BY a.id_album, a.titulo, a.artista, s.etiqueta
                HAVING COUNT(s.id_sentimiento) >= 1
                ORDER BY rating DESC, total_reviews DESC
                LIMIT %s;
            """
            
            cur.execute(base_query, (limit,))
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
                    'rating': round(float(row[3]) * 5, 1),
                    'total_reviews': row[4],
                    'review_sentiment': row[5],  # Sentimiento real
                    'cover_url': None
                }
                
                # Obtener imagen de Spotify
                try:
                    results = spotify_client.sp_search.search(q=f"{row[1]} {row[2]}", type='album', limit=1)
                    if results['albums']['items']:
                        album_info = results['albums']['items'][0]
                        if album_info['images']:
                            album['cover_url'] = album_info['images'][0]['url']
                except Exception as e:
                    print(f"Error obteniendo imagen para álbum {row[1]}: {e}")
                
                # Obtener reseña real
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
                    album['review'] = f"El álbum '{album['title']}' ha recibido críticas positivas con una calificación promedio de {album['rating']}/5.0."
                    album['review_highlight'] = f"★ Calificación: {album['rating']}/5.0"
                    album['review_type'] = 'generic'
                    album['review_sentiment'] = 'positivo'  # Default para reseñas genéricas
                
                albumes_mejorados.append(album)

            return jsonify(albumes_mejorados), 200

        except Exception as e:
            print(f"Error en /api/top_albums: {e}")
            return jsonify({'error': 'Error al obtener los mejores álbumes'}), 500
        finally:
            if cur:
                cur.close()
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
    
    highlight = f"★ {reseña['puntuacion'] * 5:.1f}/5.0 - Reseña {sentimiento}"
    
    return {
        'review': texto,
        'highlight': highlight,
        'sentimiento': sentimiento
    }