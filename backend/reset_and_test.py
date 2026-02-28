"""Reset experiment and run it inline to capture actual errors."""
import asyncio
import logging
import sys
import traceback
import ssl
import time

import asyncpg

# Suppress verbose SQL logging; only show WARNING+
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

DB_URL = "postgresql://postgres:Vcsprint%401234@34.14.144.170:5432/postgres"
EXP_ID = "7410ea1f-d0e6-486d-ba7a-1dbf654b05db"


async def run_experiment():
    from app.engine.runner import run_experiment_async
    from uuid import UUID
    print(f"\n--- Running experiment {EXP_ID} ---")
    await run_experiment_async(UUID(EXP_ID))
    print("--- Experiment finished ---")


async def check_result():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    conn = await asyncpg.connect(DB_URL, ssl=ctx)
    row = await conn.fetchrow(
        "SELECT status, error_message, progress_completed, progress_total FROM experiments WHERE id = $1",
        EXP_ID,
    )
    s = row['status']
    p = row['progress_completed']
    t = row['progress_total']
    e = row['error_message']
    print(f"\nResult: status={s}, progress={p}/{t}")
    if e:
        print(f"Error: {e}")
    await conn.close()


async def main():
    start = time.monotonic()
    try:
        await run_experiment()
    except Exception:
        traceback.print_exc()
    elapsed = time.monotonic() - start
    print(f"\nElapsed: {elapsed:.1f}s")
    await check_result()


if __name__ == "__main__":
    asyncio.run(main())
