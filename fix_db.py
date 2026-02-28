"""Fix zombie experiment stuck in 'running' state."""
import asyncio
from sqlalchemy import update, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DB_URL = "postgresql+asyncpg://postgres:Vcsprint%401234@34.14.144.170:5432/postgres"

async def main():
    engine = create_async_engine(DB_URL, echo=False)
    async with engine.begin() as conn:
        # Mark zombie experiment as failed
        result = await conn.execute(
            text("""
                UPDATE experiments 
                SET status = 'failed', 
                    error_message = 'Killed: server restarted while experiment was running',
                    completed_at = NOW()
                WHERE id = '2c50b5f2-d575-4be1-b9a2-ec72b86c09a3'
                AND status = 'running'
            """)
        )
        print(f"Updated {result.rowcount} row(s)")
        
        # Show all experiments
        rows = await conn.execute(text("SELECT id, name, status, error_message FROM experiments ORDER BY created_at DESC"))
        for r in rows:
            print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}")
    
    await engine.dispose()

asyncio.run(main())
