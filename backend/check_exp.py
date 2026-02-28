import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        host='34.14.144.170', port=5432,
        user='postgres', password='Vcsprint@1234', database='postgres'
    )
    rows = await conn.fetch(
        "SELECT id, name, status, error_message, progress_total, progress_completed, target_config "
        "FROM experiments ORDER BY created_at DESC LIMIT 5"
    )
    for r in rows:
        print(f"ID: {r['id']}")
        print(f"Name: {r['name']}")
        print(f"Status: {r['status']}")
        print(f"Progress: {r['progress_completed']}/{r['progress_total']}")
        print(f"Error: {r['error_message']}")
        print(f"Config: {r['target_config']}")
        print("---")
    
    # Check test_cases results for the latest experiment
    if rows:
        exp_id = rows[0]['id']
        tc = await conn.fetch(
            "SELECT id, prompt, response, risk_category FROM test_cases "
            "WHERE experiment_id = $1 ORDER BY created_at DESC LIMIT 5", exp_id
        )
        print(f"\nTest cases for {exp_id}:")
        for t in tc:
            print(f"  Category: {t['risk_category']}")
            print(f"  Prompt: {str(t['prompt'])[:100]}")
            print(f"  Response: {str(t['response'])[:100] if t['response'] else None}")
            print()
        
        # Check results
        results = await conn.fetch(
            "SELECT r.id, r.verdict, r.confidence_score, r.reasoning "
            "FROM results r JOIN test_cases tc ON r.test_case_id = tc.id "
            "WHERE tc.experiment_id = $1 LIMIT 5", exp_id
        )
        print(f"Results count: {len(results)}")
        for res in results:
            print(f"  Verdict: {res['verdict']}, Score: {res['confidence_score']}")
    
    await conn.close()

asyncio.run(check())
