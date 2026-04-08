import asyncio
import asyncpg


async def fix():
    # Connect as the postgres superuser
    conn = await asyncpg.connect(
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )

    # Drop old db, recreate owned by silo_user
    await conn.execute("DROP DATABASE IF EXISTS silo_db WITH (FORCE);")
    await conn.execute("CREATE DATABASE silo_db OWNER silo_user;")

    await conn.close()

    # Connect to the new DB as postgres (since silo_user may not work yet)
    conn2 = await asyncpg.connect(
        "postgresql://postgres:postgres@localhost:5432/silo_db"
    )

    # Grant privileges on public schema (PG15+ requirement)
    await conn2.execute("GRANT ALL ON SCHEMA public TO silo_user;")

    await conn2.close()

    print("Done. Now run: alembic upgrade head")


asyncio.run(fix())