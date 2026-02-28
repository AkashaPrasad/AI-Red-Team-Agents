import asyncio, asyncpg
from uuid import UUID as _UUID

async def check():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    
    # Health Chat bot experiment  
    exp_id = _UUID('7410ea1f-d0e6-486d-ba7a-1dbf654b05db')
    
    # Check test cases & results
    rows = await conn.fetch(
        "SELECT tc.id, tc.prompt, tc.response, tc.risk_category, "
        "r.result, r.severity, r.explanation "
        "FROM test_cases tc "
        "LEFT JOIN results r ON r.test_case_id = tc.id "
        "WHERE tc.experiment_id = $1 "
        "ORDER BY tc.created_at LIMIT 10",
        exp_id
    )
    
    errors = 0
    passes = 0
    fails = 0
    for r in rows:
        status = r['result'] or 'N/A'
        if status == 'error':
            errors += 1
        elif status == 'pass':
            passes += 1
        elif status == 'fail':
            fails += 1
        resp_preview = str(r['response'])[:80] if r['response'] else 'None'
        print(f"Result: {status} | Severity: {r['severity']} | Cat: {r['risk_category']}")
        print(f"  Prompt: {str(r['prompt'])[:80]}")
        print(f"  Response: {resp_preview}")
        print()
    
    # Total counts
    totals = await conn.fetch(
        "SELECT r.result, count(*) as cnt "
        "FROM test_cases tc JOIN results r ON r.test_case_id = tc.id "
        "WHERE tc.experiment_id = $1 GROUP BY r.result",
        exp_id
    )
    print("TOTALS:")
    for t in totals:
        print(f"  {t['result']}: {t['cnt']}")
    
    # Check null responses
    null_count = await conn.fetchval(
        "SELECT count(*) FROM test_cases WHERE experiment_id = $1 AND response IS NULL",
        exp_id
    )
    print(f"\nNull responses: {null_count}")
    
    await conn.close()

asyncio.run(check())
