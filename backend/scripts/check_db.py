import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
# Force connection to postgres db to check existence
if "/nextsteps" in db_url:
    default_url = db_url.replace("/nextsteps", "/postgres")
else:
    default_url = db_url

try:
    print(f"Connecting to: {default_url}")
    conn = psycopg2.connect(default_url)
    cur = conn.cursor()
    
    cur.execute("SELECT datname FROM pg_database WHERE datname='nextsteps'")
    rows = cur.fetchall()
    
    if rows:
        print(f"Found database: {rows[0][0]}")
    else:
        print("Database 'nextsteps' NOT FOUND.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
