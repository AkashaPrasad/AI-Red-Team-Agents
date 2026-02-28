import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    
    # Check experiments
    rows = await conn.fetch(
        "SELECT id, name, status, error_message, progress_total, progress_completed "
        "FROM experiments ORDER BY created_at DESC LIMIT 5"
    )
    for r in rows:
        print(f"ID: {r['id']}")
        print(f"Name: {r['name']}, Status: {r['status']}")
        print(f"Progress: {r['progress_completed']}/{r['progress_total']}")
        print(f"Error: {r['error_message']}")
        print("---")

    # Check results table columns
    cols = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name='results' ORDER BY ordinal_position"
    )
    print("\nResults columns:", [c['column_name'] for c in cols])
    
    # Check test_cases count for latest experiment
    if rows:
        tc_count = await conn.fetchval(
            "SELECT count(*) FROM test_cases WHERE experiment_id = $1", rows[0]['id']
        )
        print(f"\nTest cases for latest experiment: {tc_count}")
        
        res_count = await conn.fetchval(
            "SELECT count(*) FROM results r JOIN test_cases tc ON r.test_case_id = tc.id WHERE tc.experiment_id = $1", rows[0]['id']
        )
        print(f"Results for latest experiment: {res_count}")

    await conn.close()

asyncio.run(check())
