from flask import jsonify
from database.connection import db

def init_comunidad_routes(app):
    
    @app.route('/comunidad', methods=['GET'])
    def get_community_users():
        conn = db.get_connection()
        cur = None 
        
        if not conn:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
            
        try:
            cur = conn.cursor()
            
            cur.execute("""
                SELECT 
                    u.id_usuario, 
                    u.nombre_usuario, 
                    -- Contar reseñas
                    COUNT(r.id_resena) AS resenas,
                    -- Contar seguidores (cuántas veces este usuario es "seguido")
                    COALESCE(s.count, 0) AS seguidores
                FROM usuarios u
                LEFT JOIN resenas r ON u.id_usuario = r.id_usuario
                
                -- JOIN para contar seguidores (subconsulta o CTE es más limpio, pero LEFT JOIN funciona)
                LEFT JOIN (
                    SELECT 
                        id_seguido, 
                        COUNT(id_seguidor) as count 
                    FROM seguimientos 
                    GROUP BY id_seguido
                ) s ON u.id_usuario = s.id_seguido
                
                GROUP BY u.id_usuario, u.nombre_usuario, s.count
                ORDER BY resenas DESC, seguidores DESC
                LIMIT 10
            """)
            
            users_data = []
            for row in cur.fetchall():
                users_data.append({
                    'id': row[0], 
                    'nombre_usuario': row[1],
                    'resenas': int(row[2]) if row[2] else 0,
                    'seguidores': int(row[3]) if row[3] else 0 
                })

            return jsonify({"users": users_data}), 200

        except Exception as e:
            print(f"Error cargando usuarios de la comunidad (SQL): {str(e)}")
            return jsonify({
                "error": "Error interno al cargar la comunidad (Error SQL)",
                "details": str(e) 
            }), 500
        finally:
            if cur:
                cur.close()
            if conn:
                db.close_connection(conn)