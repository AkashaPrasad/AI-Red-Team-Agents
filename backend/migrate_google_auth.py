"""Quick migration: add google_id column and make hashed_password nullable."""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('POSTGRES_HOST', 'localhost')
port = os.getenv('POSTGRES_PORT', '5432')
db = os.getenv('POSTGRES_DB', 'ai_red_team')
user = os.getenv('POSTGRES_USER', 'postgres')
pw = os.getenv('POSTGRES_PASSWORD', 'changeme')

print(f'Connecting to {host}:{port}/{db} as {user}...')
conn = psycopg2.connect(host=host, port=port, dbname=db, user=user, password=pw, connect_timeout=10)
conn.autocommit = True
cur = conn.cursor()

cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE')
cur.execute('ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL')

print('Migration complete: google_id added, hashed_password now nullable')
cur.close()
conn.close()
