# src/backend/home/routes.py
from flask import jsonify
from database.connection import db

def init_home_routes(app):
    
    @app.route('/api/home/stats', methods=['GET'])
    def get_home_stats():
        """Obtiene estadísticas reales para el dashboard del Home"""
        conn = db.get_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = None
        try:
            cur = conn.cursor()
            
            # 1. Total de reseñas
            cur.execute("SELECT COUNT(*) FROM resenas")
            total_resenas = cur.fetchone()[0]
            
            # 2. Distribución de sentimientos
            cur.execute("""
                SELECT 
                    s.etiqueta,
                    COUNT(*) as cantidad
                FROM sentimientos s
                GROUP BY s.etiqueta
            """)
            
            sentimientos_data = {}
            for row in cur.fetchall():
                etiqueta, cantidad = row
                sentimientos_data[etiqueta] = cantidad
            
            # Calcular porcentaje de positivas
            positivas = sentimientos_data.get('positivo', 0)
            porcentaje_positivas = round((positivas / total_resenas) * 100) if total_resenas > 0 else 0
            
            # 3. Total de usuarios
            cur.execute("SELECT COUNT(*) FROM usuarios")
            total_usuarios = cur.fetchone()[0]
            
            # 4. Reseñas recientes (últimas 24 horas)
            cur.execute("""
                SELECT COUNT(*) 
                FROM resenas 
                WHERE fecha_creacion >= NOW() - INTERVAL '24 hours'
            """)
            resenas_recientes = cur.fetchone()[0]
            
            return jsonify({
                "total_resenas": total_resenas,
                "distribucion_sentimientos": sentimientos_data,
                "porcentaje_positivas": porcentaje_positivas,
                "total_usuarios": total_usuarios,
                "resenas_recientes": resenas_recientes,
                "positivas": positivas,
                "neutrales": sentimientos_data.get('neutral', 0),
                "negativas": sentimientos_data.get('negativo', 0)
            }), 200
            
        except Exception as e:
            print(f"Error obteniendo estadísticas del home: {str(e)}")
            return jsonify({
                "error": "Error interno al cargar estadísticas",
                "details": str(e)
            }), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)

    @app.route('/api/home/wordcloud', methods=['GET'])
    def get_home_wordcloud():
        """Endpoint específico para la nube de palabras del Home"""
        conn = db.get_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
            
        cur = None
        try:
            cur = conn.cursor()
            
            # Obtener texto de reseñas para wordcloud
            cur.execute("""
                SELECT r.texto_resena 
                FROM resenas r
                JOIN sentimientos s ON r.id_resena = s.id_resena
                ORDER BY r.fecha_creacion DESC
                LIMIT 200
            """)
            
            textos_resenas = [row[0] for row in cur.fetchall()]
            
            if not textos_resenas:
                return jsonify({
                    "wordcloud": None,
                    "message": "No hay suficientes reseñas para generar la nube de palabras"
                }), 200
            
            # Importar la función de wordcloud desde reviews
            from backend.reviews.routes import generar_wordcloud_beating
            
            # Generar wordcloud
            wordcloud_base64 = generar_wordcloud_beating(textos_resenas)
            
            return jsonify({
                "wordcloud": wordcloud_base64,
                "total_resenas_utilizadas": len(textos_resenas)
            }), 200
            
        except Exception as e:
            print(f"Error generando wordcloud para home: {str(e)}")
            return jsonify({
                "error": "Error generando nube de palabras",
                "details": str(e)
            }), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)