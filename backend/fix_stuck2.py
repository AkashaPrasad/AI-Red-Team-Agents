import asyncio
import asyncpg

async def fix():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    result = await conn.execute(
        "UPDATE experiments SET status='failed', "
        "error_message='Reset: event loop bug fixed, please re-run' "
        "WHERE status IN ('running', 'pending')"
    )
    print(f"Updated: {result}")
    await conn.close()

asyncio.run(fix())
