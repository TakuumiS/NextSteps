from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import JobApplication, JobStatus, User
from ..auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

from datetime import datetime

class JobCreate(BaseModel):
    company_name: str
    job_title: str
    status: JobStatus = JobStatus.APPLIED
    notes: Optional[str] = None
    email_thread_link: Optional[str] = None
    date_applied: Optional[datetime] = None

class JobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    notes: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    email_thread_link: Optional[str] = None
    date_applied: Optional[datetime] = None

@router.get("/")
def get_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JobApplication).filter(JobApplication.user_id == current_user.id).order_by(JobApplication.date_applied.desc()).all()

@router.post("/")
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id

    # Check for duplicates
    existing_job = db.query(JobApplication).filter(
        JobApplication.company_name == job.company_name,
        JobApplication.job_title == job.job_title,
        JobApplication.user_id == user_id
    ).first()

    if existing_job:
        raise HTTPException(status_code=400, detail="Job application for this company and title already exists.") 
    
    new_job = JobApplication(
        user_id=user_id,
        company_name=job.company_name,
        job_title=job.job_title,
        status=job.status,
        notes=job.notes,
        email_thread_link=job.email_thread_link,
        date_applied=job.date_applied or datetime.utcnow()
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.put("/{job_id}")
def update_job_status(job_id: int, update: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(JobApplication).filter(JobApplication.id == job_id, JobApplication.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if update.status:
        job.status = update.status
    if update.notes is not None:
        job.notes = update.notes
    if update.company_name:
        job.company_name = update.company_name
    if update.job_title:
        job.job_title = update.job_title
    if update.email_thread_link is not None:
        job.email_thread_link = update.email_thread_link
    if update.date_applied:
        job.date_applied = update.date_applied
        
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.query(JobApplication).filter(JobApplication.id == job_id, JobApplication.user_id == current_user.id).first()
    if not job:
         raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}
