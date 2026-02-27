"""Reset admin passwords to 'admin123'."""
import asyncio
from passlib.context import CryptContext
import asyncpg

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main():
    hashed = pwd_context.hash("admin123")
    print(f"Generated hash: {hashed[:20]}...")
    
    conn = await asyncpg.connect("postgresql://postgres@127.0.0.1:5432/ai_red_team")
    
    for email in ["admin@localhost.dev", "john@gmail.com"]:
        r = await conn.execute(
            "UPDATE users SET hashed_password = $1 WHERE email = $2",
            hashed,
            email,
        )
        print(f"Updated {email}: {r}")
    
    # Verify
    rows = await conn.fetch(
        "SELECT email, LEFT(hashed_password, 10) as prefix FROM users WHERE email IN ($1, $2)",
        "admin@localhost.dev",
        "john@gmail.com",
    )
    for row in rows:
        print(f"  {row['email']}: {row['prefix']}...")
    
    await conn.close()
    print("Done! Login with admin@localhost.dev / admin123")


asyncio.run(main())
