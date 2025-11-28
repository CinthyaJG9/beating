from flask import jsonify, request
from database.connection import db

def init_comunidad_routes(app):
    
    @app.route('/comunidad', methods=['GET'])
    def get_community_users():
        conn = db.get_connection()
        cur = None 
        
        if not conn:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
            
        try:
            # Obtener user_id desde los parámetros de la query
            current_user_id = request.args.get('exclude_user_id', type=int)
            
            cur = conn.cursor()
            
            # Consulta SQL CORRECTA para tu base de datos
            sql_query = """
                SELECT 
                    u.id_usuario, 
                    u.nombre_usuario, 
                    COUNT(DISTINCT r.id_resena) AS resenas,
                    COALESCE((
                        SELECT COUNT(*) 
                        FROM seguimientos s 
                        WHERE s.id_seguido = u.id_usuario
                    ), 0) AS seguidores,
                    COALESCE(
                        ARRAY(
                            SELECT DISTINCT g.nombre_genero 
                            FROM resenas r2 
                            JOIN canciones c ON r2.id_cancion = c.id_cancion
                            JOIN canciones_generos cg ON c.id_cancion = cg.id_cancion
                            JOIN generos g ON cg.id_genero = g.id_genero
                            WHERE r2.id_usuario = u.id_usuario 
                            AND g.nombre_genero IS NOT NULL
                            LIMIT 3
                        ), 
                        ARRAY['Música General']::text[]
                    ) as generos
                FROM usuarios u
                LEFT JOIN resenas r ON u.id_usuario = r.id_usuario
            """
            
            # Agregar condición WHERE si hay un usuario autenticado
            if current_user_id:
                sql_query += " WHERE u.id_usuario != %s"
                params = (current_user_id,)
            else:
                params = ()
            
            sql_query += """
                GROUP BY u.id_usuario, u.nombre_usuario
                ORDER BY resenas DESC, seguidores DESC
                LIMIT 20
            """
            
            print(f"📊 Ejecutando consulta SQL para PostgreSQL")
            print(f"📊 Excluyendo usuario: {current_user_id}")
            
            cur.execute(sql_query, params)
            
            users_data = []
            for row in cur.fetchall():
                print(f"📊 Usuario encontrado: {row[1]} - Reseñas: {row[2]} - Seguidores: {row[3]}")
                users_data.append({
                    'id': row[0], 
                    'nombre_usuario': row[1],
                    'resenas': int(row[2]) if row[2] else 0,
                    'seguidores': int(row[3]) if row[3] else 0,
                    'genres': list(row[4]) if row[4] and row[4][0] is not None else ['Música General']
                })

            print(f"✅ Total usuarios encontrados: {len(users_data)}")
            return jsonify({"users": users_data}), 200

        except Exception as e:
            print(f"❌ Error cargando usuarios de la comunidad: {str(e)}")
            import traceback
            print(f"❌ Traceback completo: {traceback.format_exc()}")
            return jsonify({
                "error": "Error interno al cargar la comunidad",
                "details": str(e) 
            }), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)