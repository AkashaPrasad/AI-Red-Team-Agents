"""Reset experiment to pending so user can re-run from the UI."""
import asyncio
import ssl
import asyncpg

DB_URL = "postgresql://postgres:Vcsprint%401234@34.14.144.170:5432/postgres"

async def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    conn = await asyncpg.connect(DB_URL, ssl=ctx)

    # Reset ALL failed experiments
    rows = await conn.fetch("SELECT id, name FROM experiments WHERE status = 'failed'")
    for r in rows:
        eid = r['id']
        # Delete old test results
        tcs = await conn.fetch("SELECT id FROM test_cases WHERE experiment_id = $1", eid)
        tc_ids = [t['id'] for t in tcs]
        if tc_ids:
            await conn.execute("DELETE FROM results WHERE test_case_id = ANY($1::uuid[])", tc_ids)
            await conn.execute("DELETE FROM test_cases WHERE experiment_id = $1", eid)

        await conn.execute("""
            UPDATE experiments
            SET status = 'pending', error_message = NULL,
                started_at = NULL, completed_at = NULL,
                progress_completed = 0, analytics = NULL
            WHERE id = $1
        """, eid)
        name = r['name']
        print(f"Reset: {name} ({eid})")

    # Also reset any stuck 'running' experiments
    rows2 = await conn.fetch("SELECT id, name FROM experiments WHERE status = 'running'")
    for r in rows2:
        eid = r['id']
        tcs = await conn.fetch("SELECT id FROM test_cases WHERE experiment_id = $1", eid)
        tc_ids = [t['id'] for t in tcs]
        if tc_ids:
            await conn.execute("DELETE FROM results WHERE test_case_id = ANY($1::uuid[])", tc_ids)
            await conn.execute("DELETE FROM test_cases WHERE experiment_id = $1", eid)
        await conn.execute("""
            UPDATE experiments
            SET status = 'pending', error_message = NULL,
                started_at = NULL, completed_at = NULL,
                progress_completed = 0, analytics = NULL
            WHERE id = $1
        """, eid)
        name = r['name']
        print(f"Reset (was running): {name} ({eid})")

    await conn.close()
    print("Done")

asyncio.run(main())
