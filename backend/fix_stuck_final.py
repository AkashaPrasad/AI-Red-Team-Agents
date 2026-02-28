import asyncio
import asyncpg

async def fix():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    result = await conn.execute(
        "UPDATE experiments SET status='failed', "
        "error_message='Server restarted while experiment was running. Please re-run.', "
        "completed_at=NOW() "
        "WHERE status IN ('running', 'pending')"
    )
    print(f"Fixed stuck experiments: {result}")
    
    # Show current state
    rows = await conn.fetch(
        "SELECT id, name, status, error_message FROM experiments ORDER BY created_at DESC LIMIT 5"
    )
    for r in rows:
        print(f"  {r['name']}: {r['status']} - {r['error_message']}")
    
    await conn.close()

asyncio.run(fix())
