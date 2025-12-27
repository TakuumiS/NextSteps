from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import User
from backend.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Ignored: '{u.ignored_emails}'")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
