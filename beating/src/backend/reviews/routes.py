from flask import request, jsonify
from functools import wraps
import jwt
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import spacy
from wordcloud import WordCloud, STOPWORDS
import numpy as np

from database.connection import db
from reviews.sentiment import sentiment_analyzer
from spotify.client import spotify_client
from config import APP_CONFIG

try:
    nlp = spacy.load("es_core_news_sm")
except OSError:
    print("El modelo de SpaCy 'es_core_news_sm' no se encontró. Asegúrate de haber ejecutado 'python -m spacy download es_core_news_sm'")
    nlp = None 

def color_func_beating(word, font_size, position, orientation, random_state=None, **kwargs):
    """Función de colores con la paleta de Beating mejorada"""
    colores_beating = [
        (236, 72, 153),   # Rosa Beating (#ec4899)
        (168, 85, 247),   # Purple-500 (#a855f7)
        (139, 92, 246),   # Purple-600 (#8b5cf6)
        (217, 70, 239),   # Pink-500 (#d946ef)
        (245, 158, 11),   # Amber-500 (#f59e0b)
        (16, 185, 129),   # Emerald-500 (#10b981)
        (99, 102, 241),   # Indigo-500 (#6366f1)
        (249, 115, 22),   # Orange-500 (#f97316)
    ]
    import random
    r, g, b = random.choice(colores_beating)
    # Variar ligeramente el color basado en la posición para más dinamismo
    variation = random.randint(-10, 10)
    r = max(0, min(255, r + variation))
    g = max(0, min(255, g + variation))
    b = max(0, min(255, b + variation))
    return f"rgb({r}, {g}, {b})"

def generar_wordcloud_beating(textos):
    """Genera una nube de palabras con menos palabras y mejor legibilidad"""
    if nlp is None: 
        return base64.b64encode(b"").decode('utf-8') 
    
    if isinstance(textos, list):
        texto_completo = " ".join(textos)
    else:
        texto_completo = textos

    # Procesar texto con spaCy - enfoque en las palabras más significativas
    doc = nlp(texto_completo) 
    allowed_pos = {'NOUN', 'ADJ'}  # Solo adjetivos y sustantivos para palabras más relevantes
    
    filtered_words = [
        token.lemma_.lower()
        for token in doc 
        if (token.pos_ in allowed_pos and 
            not token.is_stop and 
            token.is_alpha and
            len(token.lemma_) > 3)  # Filtrar palabras más largas para mejor significado
    ]
    
    texto_filtrado = " ".join(filtered_words)
    
    if not texto_filtrado.strip():
        print("No hay texto filtrado para generar la nube de palabras")
        return base64.b64encode(b"").decode('utf-8')
    
    print(f"Texto procesado: {len(filtered_words)} palabras únicas")
    
    # Stopwords mejoradas y expandidas
    spanish_stopwords = set(STOPWORDS)
    
    domain_stopwords = {
        'cancion', 'álbum', 'artista', 'track', 'song', 'pegadecer', 
        'contenido', 'algo', 'crecer', 'letra', 'musical', 'lirica', 
        'lirico', 'cotidiano', 'obra', 'divertir', 'complementar', 
        'canción', 'situaciones', 'banda', 'canciones', 'album', 'jazz',
        'pop', 'año', 'barreras', 'vogue', 'combinación', 'modelo', 'cotorra',
        'labioso', 'auditivo', 'musica', 'música', 'escuchar', 'sonido',
        'ritmo', 'melodia', 'melodía', 'verso', 'coro', 'estribillo',
        'hacer', 'tener', 'poder', 'decir', 'ver', 'dar', 'saber', 'ir',
        'ser', 'estar', 'haber', 'poder', 'querer', 'parecer', 'gente',
        'tiempo', 'vez', 'parte', 'forma', 'caso', 'manera', 'momento','instrumento',
        'sicario', 'llegadoro', 'mediocre', 'melancolía', 'persona', 'aburrido', 'qiue', 
        'electrónico', 'aburrido', 'barrera', 'burla', 'cuandotodo', 'batería', 'concierto',
        'conforme', 'vocalista', 'sobrellevar', 'quelar', 'pasar', 'género', 'terminar',
        'primo', 'llegar', 'él', 'general', 'recuerdaar', 'turner', 'termino',
        'escuche', 'cabra', 'sonar', 'pegadecer', 'tristeza', 'nostalgia',
        'preocupación', 'lleno', 'dueto', 'espera', 'regresa'
    }
    
    all_stopwords = spanish_stopwords.union(domain_stopwords)

    try:
        # Configurar WordCloud con MENOS palabras para mejor legibilidad
        wordcloud = WordCloud(
            width=800,  # Tamaño más compacto
            height=500,  # Tamaño más compacto
            background_color='#1e1626',
            color_func=color_func_beating,
            max_words=80,  # MENOS PALABRAS - máximo 80
            stopwords=all_stopwords,
            relative_scaling=0.8,  # Más énfasis en las palabras más frecuentes
            prefer_horizontal=0.8,  # Más palabras horizontales para mejor lectura
            scale=1.5,
            min_font_size=14,  # Tamaño mínimo más grande
            max_font_size=120,  # Tamaño máximo más pequeño
            collocations=False,
            random_state=42,
            margin=1,  # Menos margen
            contour_width=0,
            colormap='plasma'  # Colormap con mejor contraste
        ).generate(texto_filtrado)

        # Generar imagen con estilo Beating
        plt.figure(figsize=(12, 8), facecolor='#1e1626')
        plt.imshow(wordcloud, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        
        # Agregar título sutil
        plt.figtext(0.5, 0.95, 'Tus Emociones Musicales', 
                   ha='center', va='top', 
                   fontsize=20, color='white', fontweight='bold',
                   bbox=dict(boxstyle="round,pad=0.4", facecolor='#ec4899', alpha=0.8))
        
        # Convertir a base64
        img = BytesIO()
        plt.savefig(
            img, 
            format='PNG', 
            bbox_inches='tight', 
            dpi=120,  # DPI estándar
            facecolor='#1e1626',
            transparent=False,
            pad_inches=0
        )
        plt.close()
        
        img_base64 = base64.b64encode(img.getvalue()).decode('utf-8')
        print(f"Nube de palabras generada exitosamente con {len(wordcloud.words_)} palabras")
        return img_base64
        
    except Exception as e:
        print(f"Error generando wordcloud: {str(e)}")
        # Fallback a wordcloud simple con aún menos palabras
        try:
            wordcloud_fallback = WordCloud(
                width=600,
                height=400,
                background_color='#1e1626',
                color_func=color_func_beating,
                max_words=60,  # Aún menos palabras en fallback
                stopwords=all_stopwords,
                random_state=42
            ).generate(texto_filtrado)
            
            plt.figure(figsize=(10, 6), facecolor='#1e1626')
            plt.imshow(wordcloud_fallback, interpolation='bilinear')
            plt.axis('off')
            plt.tight_layout(pad=0)
            
            img = BytesIO()
            plt.savefig(
                img, 
                format='PNG', 
                bbox_inches='tight', 
                dpi=100,
                facecolor='#1e1626'
            )
            plt.close()
            
            return base64.b64encode(img.getvalue()).decode('utf-8')
        except Exception as fallback_error:
            print(f"Error incluso en fallback: {str(fallback_error)}")
            return base64.b64encode(b"").decode('utf-8')

def generar_grafico_sentimientos_beating(datos):
    """Genera un gráfico de sentimientos con estilo Beating"""
    if not datos:
        return None
        
    plt.figure(figsize=(10, 8))
    
    # Filtrar datos con cantidad > 0
    datos_validos = [d for d in datos if d['cantidad'] > 0]
    if not datos_validos:
        return None
        
    labels = [d['etiqueta'].capitalize() for d in datos_validos]
    sizes = [d['cantidad'] for d in datos_validos]
    
    # Colores del tema Beating
    colors = []
    color_map = {
        'positivo': '#10b981',
        'neutral': '#f59e0b',
        'negativo': '#ef4444'
    }
    
    for d in datos_validos:
        colors.append(color_map.get(d['etiqueta'], '#6b7280'))
    
    # Crear pie chart con estilo Beating
    wedges, texts, autotexts = plt.pie(
        sizes, 
        labels=labels, 
        colors=colors, 
        autopct='%1.1f%%',
        startangle=90,
        shadow=True,
        explode=[0.05] * len(sizes),
        textprops={'fontsize': 12}
    )
    
    # Mejorar estilo de los textos
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontweight('bold')
        autotext.set_fontsize(11)
    
    for text in texts:
        text.set_fontsize(14)
        text.set_fontweight('bold')
        text.set_color('#e5e7eb')
    
    # Mejorar estilo de las cuñas
    for wedge in wedges:
        wedge.set_edgecolor('#1e1626')
        wedge.set_linewidth(2)
    
    plt.title('Distribución de Sentimientos', 
              fontsize=18, 
              fontweight='bold', 
              color='white',
              pad=20)
    
    # Fondo que coincide con el tema Beating
    plt.gcf().patch.set_facecolor('#1e1626')
    plt.gca().set_facecolor('#1e1626')
    
    img = BytesIO()
    plt.savefig(
        img, 
        format='PNG', 
        bbox_inches='tight', 
        dpi=100,
        facecolor='#1e1626'
    )
    plt.close()
    return base64.b64encode(img.getvalue()).decode('utf-8')

def generar_grafico_top_canciones_beating(datos):
    """Genera un gráfico de top canciones con estilo Beating"""
    if not datos:
        return None
        
    plt.figure(figsize=(14, 10))
    
    nombres = [f"{d['titulo']}\n{d['artista']}" for d in datos]
    puntuaciones = [d['puntuacion'] for d in datos]
    
    # Usar colores del tema Beating según la puntuación
    colors = []
    for score in puntuaciones:
        if score > 0.7:
            colors.append('#10b981')
        elif score > 0.4:
            colors.append('#f59e0b')
        elif score > 0:
            colors.append('#f97316')
        elif score == 0:
            colors.append('#6b7280')
        else:
            colors.append('#ef4444')
    
    bars = plt.barh(nombres, puntuaciones, color=colors, height=0.7, alpha=0.9, edgecolor='white', linewidth=1)
    plt.gca().invert_yaxis()
    
    # Estilizar el gráfico con tema Beating
    plt.title('Top Canciones Mejor Calificadas', 
              fontsize=20, 
              fontweight='bold', 
              color='white',
              pad=30)
    plt.xlabel('Puntuación Promedio', fontsize=14, color='white', fontweight='bold')
    
    # Configurar colores de ejes y fondo
    plt.gca().set_facecolor('#1e1626')
    plt.gcf().patch.set_facecolor('#1e1626')
    plt.gca().tick_params(colors='white', labelsize=12)
    plt.gca().spines['bottom'].set_color('#ec4899')
    plt.gca().spines['left'].set_color('#ec4899')
    plt.gca().spines['top'].set_color('none')
    plt.gca().spines['right'].set_color('none')
    
    # Agregar valores en las barras con mejor estilo
    for bar in bars:
        width = bar.get_width()
        plt.text(width + 0.01, bar.get_y() + bar.get_height()/2, 
                f'{width:.2f}', 
                ha='left', va='center', 
                color='white', fontweight='bold', fontsize=11,
                bbox=dict(boxstyle="round,pad=0.3", facecolor='#1e1626', alpha=0.9, edgecolor='#ec4899'))
    
    # Agregar grid sutil
    plt.grid(axis='x', alpha=0.2, color='#ec4899', linestyle='--')
    
    # Mejorar el eje X
    plt.xlim(0, max(puntuaciones) * 1.15)
    
    plt.tight_layout()
    
    img = BytesIO()
    plt.savefig(
        img, 
        format='PNG', 
        bbox_inches='tight',
        dpi=100,
        facecolor='#1e1626'
    )
    plt.close()
    return base64.b64encode(img.getvalue()).decode('utf-8')

# ... (el resto del código permanece igual - token_required e init_reviews_routes)

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

def init_reviews_routes(app):
    
    @app.route('/resenas', methods=['POST'])
    @token_required
    def subir_resena():
        try:
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

            sentimiento, puntuacion = sentiment_analyzer.analyze_text(contenido)
            user_id = request.user_id

            conn = db.get_connection()
            if not conn:
                return jsonify({"error": "Error de conexión a la base de datos"}), 500
                
            cur = conn.cursor()

            try:
                if tipo == "cancion":
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

                    cur.execute("SELECT id_cancion FROM canciones WHERE titulo = %s AND artista = %s", 
                            (titulo, artista_spotify))
                    cancion = cur.fetchone()

                    if cancion:
                        id_cancion = cancion[0]
                        cur.execute("""
                            UPDATE canciones SET
                                duracion_segundos = %s,
                                spotify_uri = %s
                            WHERE id_cancion = %s
                        """, (duracion, spotify_uri, id_cancion))
                    else:
                        cur.execute("""
                            INSERT INTO canciones 
                            (titulo, artista, duracion_segundos, spotify_uri) 
                            VALUES (%s, %s, %s, %s)
                            RETURNING id_cancion
                        """, (titulo, artista_spotify, duracion, spotify_uri))
                        id_cancion = cur.fetchone()[0]

                    cur.execute("""
                        INSERT INTO resenas 
                        (id_usuario, id_cancion, texto_resena) 
                        VALUES (%s, %s, %s)
                        RETURNING id_resena
                    """, (user_id, id_cancion, contenido))

                elif tipo == "album":
                    if not spotify_client.sp_search:
                        return jsonify({"error": "Servicio de búsqueda no disponible"}), 500
                        
                    results = spotify_client.sp_search.search(q=f"{nombre} {artista}", type="album", limit=1)
                    if not results['albums']['items']:
                        return jsonify({"error": "Álbum no encontrado en Spotify"}), 404

                    album = results['albums']['items'][0]
                    titulo = album['name']
                    artista_spotify = album['artists'][0]['name']
                    fecha_lanzamiento = album['release_date']
                    
                    # Extraer año de lanzamiento
                    anio_lanzamiento = fecha_lanzamiento[:4] if fecha_lanzamiento else None

                    cur.execute("SELECT id_album FROM albumes WHERE titulo = %s AND artista = %s", 
                            (titulo, artista_spotify))
                    album_db = cur.fetchone()

                    if album_db:
                        id_album = album_db[0]
                        # Actualizar información si es necesario
                        cur.execute("""
                            UPDATE albumes SET
                                anio_lanzamiento = %s
                            WHERE id_album = %s
                        """, (anio_lanzamiento, id_album))
                    else:
                        cur.execute("""
                            INSERT INTO albumes 
                            (titulo, artista, anio_lanzamiento) 
                            VALUES (%s, %s, %s)
                            RETURNING id_album
                        """, (titulo, artista_spotify, anio_lanzamiento))
                        id_album = cur.fetchone()[0]

                    cur.execute("""
                        INSERT INTO resenas 
                        (id_usuario, id_album, texto_resena) 
                        VALUES (%s, %s, %s)
                        RETURNING id_resena
                    """, (user_id, id_album, contenido))

                id_resena = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO sentimientos 
                    (id_resena, etiqueta, puntuacion) 
                    VALUES (%s, %s, %s)
                """, (id_resena, sentimiento, float(puntuacion)))

                conn.commit()

                try:
                    app.logger.info(f"""
                        Reseña registrada:
                        - Texto: {contenido[:50]}...
                        - Sentimiento: {sentimiento}
                        - Puntuación: {puntuacion}
                        - Tipo: {tipo}
                        - Artista: {artista_spotify}
                        - Título: {titulo}
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
                        "artista": artista_spotify,
                        "titulo": titulo,
                        "modelo": "beto-sentiment-analysis"
                    }
                }), 201

            except Exception as e:
                conn.rollback()
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
                    db.close_connection(conn)

        except Exception as e:
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
        conn = db.get_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = conn.cursor()
        
        try:
            import matplotlib
            matplotlib.use('Agg')
            plt.switch_backend('Agg')
            
            # Configurar estilo global de matplotlib para que coincida con Beating
            plt.rcParams['figure.facecolor'] = '#1e1626'
            plt.rcParams['axes.facecolor'] = '#1e1626'
            plt.rcParams['text.color'] = 'white'
            plt.rcParams['axes.labelcolor'] = 'white'
            plt.rcParams['xtick.color'] = 'white'
            plt.rcParams['ytick.color'] = 'white'
            plt.rcParams['font.size'] = 12
            
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

            # 3. Obtener texto para nube de palabras
            cur.execute("""
                SELECT r.texto_resena 
                FROM resenas r
                JOIN sentimientos s ON r.id_resena = s.id_resena
                LIMIT 300  
            """)
            textos_resenas = [row[0] for row in cur.fetchall()]

            # Generar gráficos mejorados
            response_data = {
                'mejores_canciones': mejores_canciones,
                'distribucion_sentimientos': sentimientos_data,
                'total_resenas_analizadas': len(textos_resenas)
            }

            if any(s['cantidad'] > 0 for s in sentimientos_data):
                response_data['sentiment_dist'] = generar_grafico_sentimientos_beating(sentimientos_data)
            
            if mejores_canciones:
                response_data['top_songs'] = generar_grafico_top_canciones_beating(mejores_canciones)

            if textos_resenas:
                response_data['wordcloud'] = generar_wordcloud_beating(textos_resenas)
                response_data['wordcloud_info'] = f"Generado con {len(textos_resenas)} reseñas"

            return jsonify(response_data), 200

        except Exception as e:
            print(f"Error en análisis: {str(e)}")
            return jsonify({'error': str(e)}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)