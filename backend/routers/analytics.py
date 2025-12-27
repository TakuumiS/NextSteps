from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import JobApplication, JobStatus
from typing import Dict, List, Any
from datetime import datetime, timedelta
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/stats")
def get_analytics_stats(db: Session = Depends(get_db)):
    # 1. Summary Counts
    total = db.query(JobApplication).count()
    # Active usually means "In Progress" (Applied + Interviewing)
    active = db.query(JobApplication).filter(JobApplication.status.in_([JobStatus.APPLIED, JobStatus.INTERVIEWING])).count()
    offers = db.query(JobApplication).filter(JobApplication.status == JobStatus.OFFER).count()
    
    # Response Rate: (Interviewing + Offer + Rejected) / Total
    # i.e. Any status EXCEPT "APPLIED"
    responded = db.query(JobApplication).filter(JobApplication.status != JobStatus.APPLIED).count()

    # 2. Funnel Counts (Status Distribution)
    # Group by status
    status_counts_query = db.query(JobApplication.status, func.count(JobApplication.status)).group_by(JobApplication.status).all()
    funnel_counts = {status.value: 0 for status in JobStatus} # Initialize all with 0
    for status, count in status_counts_query:
        if status in funnel_counts:
            funnel_counts[status] = count
        # Handle string status if stored as string in older records (though Enum usually handles this)
        elif hasattr(status, 'value') and status.value in funnel_counts:
             funnel_counts[status.value] = count

    # 3. Weekly Activity (Applications over last 12 weeks)
    # We aggregate by "Week of" (Monday)
    
    start_date = datetime.now() - timedelta(weeks=12)
    
    # Get all jobs from last 12 weeks
    recent_jobs = db.query(JobApplication).filter(JobApplication.date_applied >= start_date).all()
    
    weekly_map = {}
    
    # Initialize last 12 weeks buckets
    today = datetime.now()
    # Find most recent Monday
    current_week_monday = today - timedelta(days=today.weekday())
    
    for i in range(12):
        # Go backwards from current week
        week_start = current_week_monday - timedelta(weeks=i)
        key = week_start.strftime("%Y-%m-%d")
        weekly_map[key] = 0
        
    for job in recent_jobs:
        if job.date_applied:
            # Find Monday for this date
            job_monday = job.date_applied - timedelta(days=job.date_applied.weekday())
            key = job_monday.strftime("%Y-%m-%d")
            if key in weekly_map:
                weekly_map[key] += 1
            
    # Convert to list and sort
    weekly_activity = [{"week": k, "count": v} for k, v in weekly_map.items()]
    weekly_activity.sort(key=lambda x: x['week'])

    return {
        "summary": {
            "total": total,
            "active": active,
            "offers": offers,
            "response_rate": f"{(responded / total * 100):.1f}%" if total > 0 else "0%"
        },
        "funnel_counts": funnel_counts,
        "weekly_activity": weekly_activity
    }

@router.get("/export")
def export_jobs_csv(db: Session = Depends(get_db)):
    jobs = db.query(JobApplication).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Company", "Job Title", "Status", "Date Applied", "Notes", "Email Link"])
    
    # Write data
    for job in jobs:
        writer.writerow([
            job.id,
            job.company_name,
            job.job_title,
            job.status.value if hasattr(job.status, 'value') else job.status,
            job.date_applied.strftime("%Y-%m-%d") if job.date_applied else "",
            job.notes or "",
            job.email_thread_link or ""
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=job_applications.csv"}
    )
