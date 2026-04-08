import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    con = psycopg2.connect(dbname='siloDb', user='postgres', password='postgres', host='localhost', port='5432')
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = con.cursor()
    cur.execute("GRANT ALL ON SCHEMA public TO silo_user")
    print("Schema permissions granted")
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")

