import psycopg2
from psycopg2 import pool
from config import DATABASE_CONFIG

class Database:
    def __init__(self):
        self.pool = None
        self.init_pool()
    
    def init_pool(self):
        try:
            self.pool = psycopg2.pool.SimpleConnectionPool(
                DATABASE_CONFIG['pool_min'],
                DATABASE_CONFIG['pool_max'],
                DATABASE_CONFIG['dsn']
            )
            print("✅ Pool de conexiones PostgreSQL creado exitosamente")
        except Exception as e:
            print(f"❌ Error creando pool de conexiones: {e}")
            self.pool = None
    
    def get_connection(self):
        if self.pool:
            return self.pool.getconn()
        else:
            try:
                return psycopg2.connect(DATABASE_CONFIG['dsn'])
            except Exception as e:
                print(f"❌ Error de conexión directa: {e}")
                return None
    
    def close_connection(self, conn):
        if conn:
            if self.pool:
                self.pool.putconn(conn)
            else:
                conn.close()

# Instancia global de la base de datos
db = Database()