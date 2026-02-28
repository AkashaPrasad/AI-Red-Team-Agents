"""Delete all failed/cancelled experiments for the Groq provider so it can be deleted."""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://postgres:Vcsprint%401234@34.14.144.170:5432/postgres"

async def main():
    engine = create_async_engine(DB_URL, echo=False)
    async with engine.begin() as conn:
        # Show existing experiments
        rows = await conn.execute(text(
            "SELECT id, name, status FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'"
        ))
        print("Experiments linked to Groq provider:")
        for r in rows:
            print(f"  {r[0]} | {r[1]} | {r[2]}")

        # Delete results -> test_cases -> experiments (respecting FK order)
        r1 = await conn.execute(text("""
            DELETE FROM results WHERE test_case_id IN (
                SELECT id FROM test_cases WHERE experiment_id IN (
                    SELECT id FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'
                )
            )
        """))
        print(f"Deleted {r1.rowcount} results")

        r2 = await conn.execute(text("""
            DELETE FROM test_cases WHERE experiment_id IN (
                SELECT id FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'
            )
        """))
        print(f"Deleted {r2.rowcount} test_cases")

        # Delete audit logs referencing these experiments
        r3 = await conn.execute(text("""
            DELETE FROM audit_logs WHERE entity_id IN (
                SELECT id FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'
            )
        """))
        print(f"Deleted {r3.rowcount} audit_logs")

        r4 = await conn.execute(text("""
            DELETE FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'
        """))
        print(f"Deleted {r4.rowcount} experiments")

        # Verify
        count = await conn.execute(text(
            "SELECT count(*) FROM experiments WHERE provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'"
        ))
        print(f"Remaining experiments for provider: {count.scalar_one()}")

    await engine.dispose()

asyncio.run(main())
