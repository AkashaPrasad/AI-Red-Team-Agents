"""Mark stuck experiments as failed."""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://postgres:Vcsprint%401234@34.14.144.170:5432/postgres"

async def main():
    engine = create_async_engine(DB_URL, echo=False)
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                UPDATE experiments 
                SET status = 'failed', 
                    error_message = 'Server killed while experiment was running',
                    completed_at = NOW()
                WHERE status = 'running'
            """)
        )
        print(f"Updated {result.rowcount} stuck experiment(s)")
        
        rows = await conn.execute(text("SELECT id, name, status, progress_completed, progress_total, error_message FROM experiments ORDER BY created_at DESC"))
        for r in rows:
            print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}/{r[4]} | {r[5]}")
    await engine.dispose()

asyncio.run(main())
