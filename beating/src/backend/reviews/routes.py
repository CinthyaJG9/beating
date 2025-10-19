from flask import request, jsonify
from functools import wraps
import jwt
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from wordcloud import WordCloud
from database.connection import db
from reviews.sentiment import sentiment_analyzer
from spotify.client import spotify_client
from config import APP_CONFIG

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({"error": "Token de autorización faltante"}), 401
        
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({"error": "Formato de token inválido. Use: Bearer <token>"}), 401
                
            token = parts[1]
            data = jwt.decode(token, APP_CONFIG['secret_key'], algorithms=['HS256'])
            request.user_id = data['user_id']
            
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": "Token inválido"}), 401
        except Exception as e:
            return jsonify({"error": "Error procesando token"}), 401
            
        return f(*args, **kwargs)
    return decorated

# Funciones auxiliares para gráficos (mover a utils/helpers.py después)
def generar_wordcloud(textos):
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

def init_reviews_routes(app):
    
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

            # CORRECCIÓN: Usar el nuevo analizador
            sentimiento, puntuacion = sentiment_analyzer.analyze_text(contenido)
            user_id = request.user_id

            # CORRECCIÓN: Usar la nueva conexión a BD
            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()

            try:
                if tipo == "cancion":
                    # CORRECCIÓN: Usar el cliente de Spotify correcto
                    if not spotify_client.sp_search:
                        return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                        
                    results = spotify_client.sp_search.search(q=f"{nombre} {artista}", type="track", limit=1)
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

                # CORRECCIÓN: Usar app.logger si está disponible, sino print
                try:
                    app.logger.info(f"""
                        Reseña registrada:
                        - Texto: {contenido[:50]}...
                        - Sentimiento: {sentimiento}
                        - Puntuación: {puntuacion}
                        - Tipo: {tipo}
                        - Artista: {artista_spotify if tipo == 'cancion' else artista}
                    """)
                except:
                    print(f"Reseña registrada: {contenido[:50]}... - {sentimiento}")

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
                # CORRECCIÓN: Manejar logger
                try:
                    app.logger.error(f"Error en base de datos: {str(e)}", exc_info=True)
                except:
                    print(f"Error en base de datos: {str(e)}")
                return jsonify({
                    "error": "Error al procesar reseña",
                    "details": str(e)
                }), 500

            finally:
                if cur:
                    cur.close()
                if conn:
                    # CORRECCIÓN: Usar la nueva función de cierre
                    db.close_connection(conn)

        except Exception as e:
            # CORRECCIÓN: Manejar logger
            try:
                app.logger.error(f"Error general en subir_resena: {str(e)}", exc_info=True)
            except:
                print(f"Error general en subir_resena: {str(e)}")
            return jsonify({
                "error": "Error interno del servidor",
                "details": str(e)
            }), 500

    @app.route('/analisis-resenas', methods=['GET'])
    def analisis_resenas():
        # CORRECCIÓN: Usar la nueva conexión
        conn = db.get_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()
        
        try:
            # Configurar matplotlib para no usar GUI
            import matplotlib
            matplotlib.use('Agg')
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
            # CORRECCIÓN: Manejar logger
            try:
                app.logger.error(f"Error en análisis: {str(e)}")
            except:
                print(f"Error en análisis: {str(e)}")
            return jsonify({'error': str(e)}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                # CORRECCIÓN: Usar la nueva función de cierre
                db.close_connection(conn)