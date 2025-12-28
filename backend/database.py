from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Please check your .env file or deployment configuration.")

# Handle Renters 'postgres://' case which serves a deprecated scheme in some versions
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    # Log the host we are connecting to (masking password)
    masked_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "NO_CREDENTIALS_FOUND"
    print(f"Attempting to connect to database at: {masked_url}")
except Exception:
    print("Could not parse DATABASE_URL for logging")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
