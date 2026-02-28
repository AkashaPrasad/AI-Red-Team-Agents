import asyncio, asyncpg

async def check():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    rows = await conn.fetch(
        "SELECT e.id, e.name, e.status, e.progress_completed, e.error_message, "
        "p.name as proj_name, p.owner_id "
        "FROM experiments e JOIN projects p ON e.project_id = p.id "
        "ORDER BY e.created_at DESC"
    )
    for r in rows:
        print(f"Exp: {r['name']} | Status: {r['status']} | Progress: {r['progress_completed']} | Project: {r['proj_name']} | Owner: {r['owner_id']}")
        print(f"  Error: {str(r['error_message'])[:120] if r['error_message'] else 'None'}")
    
    # Check test_cases for Health Chat bot
    tc = await conn.fetchval(
        "SELECT count(*) FROM test_cases WHERE experiment_id = $1",
        rows[0]['id']
    )
    print(f"\n{rows[0]['name']} has {tc} test cases")
    
    await conn.close()

asyncio.run(check())
