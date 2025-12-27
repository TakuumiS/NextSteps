from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from .database import Base

class JobStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    INTERVIEWING = "INTERVIEWING"
    REJECTED = "REJECTED"
    OFFER = "OFFER"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    ignored_emails = Column(Text, default="") # Comma separated list of emails to ignore
    
    jobs = relationship("JobApplication", back_populates="owner")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String, index=True)
    job_title = Column(String)
    status = Column(Enum(JobStatus), default=JobStatus.APPLIED)
    date_applied = Column(DateTime, default=datetime.utcnow)
    sender_email = Column(String, nullable=True) # To filter/delete by sender later
    email_thread_link = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    owner = relationship("User", back_populates="jobs")
