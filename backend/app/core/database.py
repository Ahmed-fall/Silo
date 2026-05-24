import asyncpg
from app.core.config import settings

pool: asyncpg.Pool | None = None


async def init_db() -> None:
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=10,
    )
    print("Database pool created successfully.")


async def close_db() -> None:
    global pool
    if pool:
        await pool.close()
        print("Database pool closed.")


async def get_db() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool is not initialized.")
    return pool