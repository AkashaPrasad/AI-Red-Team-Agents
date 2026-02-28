import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        host='34.14.144.170',
        port=5432,
        user='postgres',
        password='Vcsprint@1234',
        database='postgres'
    )
    
    # Check experiments table columns
    cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'experiments' 
        ORDER BY ordinal_position
    """)
    print('Experiments columns:')
    for c in cols:
        print(f"  {c['column_name']} ({c['data_type']})")
    
    # Check alembic version
    ver = await conn.fetch("SELECT * FROM alembic_version")
    print(f"\nAlembic version: {ver}")
    
    await conn.close()

asyncio.run(check())
