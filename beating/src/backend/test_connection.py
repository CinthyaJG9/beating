import psycopg2

try:
    conn = psycopg2.connect(
        database="beating_bd",
        user="postgres",
        password="admin",
        host="localhost",
        port="5432"
    )
    print("✅ Conexión exitosa a PostgreSQL")
    conn.close()
except psycopg2.OperationalError as e:
    print("❌ Error al conectar:")
    print(e.pgerror)      # Intenta mostrar mensaje del servidor
    print(str(e))         # Muestra descripción del error
except Exception as e:
    print("❌ Otro error:")
    print(str(e))
