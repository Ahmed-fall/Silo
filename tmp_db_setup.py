import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

con = psycopg2.connect(dbname='postgres', user='postgres', password='postgres', host='localhost', port='5432')
con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = con.cursor()

queries = [
    "CREATE USER silo_user WITH PASSWORD 'silo_pass'",
    "ALTER USER silo_user CREATEDB",
    "CREATE DATABASE silo_db OWNER silo_user",
    "GRANT ALL PRIVILEGES ON DATABASE silo_db TO silo_user"
]

for q in queries:
    try:
        cur.execute(q)
        print(f"Executed: {q}")
    except Exception as e:
        print(f"Skipped/error on {q}: {e}")

cur.close()
con.close()
