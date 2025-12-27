from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/users", tags=["users"])

# Pydantic model for updates
class UserUpdate(BaseModel):
    ignored_emails: str # Comma separate string

@router.get("/me")
def get_current_user_profile(token: str = Header(None), db: Session = Depends(get_db)):
    # Prototype auth: find user by some token mechanism or just return the first user
    # Since we have "Connected to Gmail", we assume there's a user.
    # We used a hack in scan.py: user = db.query(User).first()
    # Let's verify the token matches the user if possible, or just return first user for this prototype.
    
    # Ideally: decode token, find user. 
    # Current auth implementation in auth.py creates a user with the email from Google.
    # But we don't strictly have a "session" mapped to that token in DB unless we implemented it.
    # The frontend stores `google_access_token`.
    # Let's trust the first user for now, or try to decode if we had that logic reusable.
    
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me")
def update_user_profile(profile: UserUpdate, token: str = Header(None), db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.ignored_emails = profile.ignored_emails
    db.commit()
    db.refresh(user)
    
    # Prune existing jobs that match the new ignore list
    if user.ignored_emails:
        from ..models import JobApplication
        ignored_list = [e.strip().lower() for e in user.ignored_emails.split(',') if e.strip()]
        if ignored_list:
            # We can't use .in_ directly loosely with strings if we want partial matches, 
            # but usually ignore list is exact email. 
            # If we want exact match:
            # deleted = db.query(JobApplication).filter(JobApplication.sender_email.in_(ignored_list)).delete(synchronize_session=False)
            
            # Since scan.py does "if ignored in sender", we should probably try to match that logic?
            # But SQL LIKE is hard with a list of values. 
            # Let's stick to exact match or partial if feasible.
            # For simplicity in this prototype, let's fetch all and filter in python, or just do exact match.
            # Gmail sender often has "Name <email>". 
            
            # Let's try to delete where sender_email contains any of the ignored strings.
            # SQLAlchemy doesn't have a clean "contains any" for SQLite/Postgres across dialects easily without loop.
            
            # Simple approach: Iterate and delete. 
            all_jobs = db.query(JobApplication).all()
            ids_to_delete = []
            for job in all_jobs:
                if job.sender_email:
                    sender_lower = job.sender_email.lower()
                    if any(ignored in sender_lower for ignored in ignored_list):
                        ids_to_delete.append(job.id)
            
            if ids_to_delete:
                print(f"Pruning {len(ids_to_delete)} jobs from ignored senders...")
                db.query(JobApplication).filter(JobApplication.id.in_(ids_to_delete)).delete(synchronize_session=False)
                db.commit()

    return user
