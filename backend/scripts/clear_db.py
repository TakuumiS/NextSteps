from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, JobApplication
from backend.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def clear_data():
    db = SessionLocal()
    try:
        num_deleted = db.query(JobApplication).delete()
        db.commit()
        print(f"Successfully deleted {num_deleted} job applications.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Clearing database...")
    clear_data()
