import asyncio, asyncpg, ssl

async def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    conn = await asyncpg.connect("postgresql://postgres:Vcsprint%401234@34.14.144.170:5432/postgres", ssl=ctx)
    rows = await conn.fetch("SELECT id, name, status, error_message, progress_completed, progress_total FROM experiments ORDER BY updated_at DESC LIMIT 5")
    for row in rows:
        s = row["status"]
        p = row["progress_completed"]
        t = row["progress_total"]
        e = row["error_message"]
        n = row["name"]
        print(f"{n}: status={s}  progress={p}/{t}")
        if e:
            err = e[:200]
            print(f"  Error: {err}")
    await conn.close()

asyncio.run(main())
