from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import JobApplication, JobStatus, User
from ..gmail_service import get_gmail_service, fetch_latest_emails
from ..llm_service import parse_job_application

router = APIRouter(prefix="/scan", tags=["scan"])

@router.post("/")
def scan_emails(token: str = Header(...), db: Session = Depends(get_db)):
    # Verify token/user? For now just use the token passed
    try:
        service = get_gmail_service(token)
        # Increased limit for better results - Batch 500
        emails = fetch_latest_emails(service, max_results=500)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to fetch emails: {str(e)}")
    
    processed = 0
    debug_logs = []
    
    import datetime
    from email.utils import parsedate_to_datetime

    try:
        # Get ignored list
        user = db.query(User).first()
        ignored_list = []
        if user and user.ignored_emails:
            ignored_list = [e.strip().lower() for e in user.ignored_emails.split(',') if e.strip()]
            
        for msg in emails:
            # Check ignore list
            sender = msg.get('sender', '').lower()
            if any(ignored in sender for ignored in ignored_list):
               print(f"Skipping email from ignored sender: {sender}")
               continue

            # Check if already processed by thread_id
            thread_id = msg.get('thread_id')
            if thread_id:
                thread_link = f"https://mail.google.com/mail/u/0/#inbox/{thread_id}"
                existing_thread = db.query(JobApplication).filter(JobApplication.email_thread_link == thread_link).first()
                if existing_thread:
                    print(f"Skipping already scanned thread: {thread_id} ({existing_thread.company_name})")
                    continue
            
            # Combine Subject and Body for best context
            full_text = f"Subject: {msg['subject']}\n\nBody:\n{msg['body']}"
            
            # Limit total size to avoid token limits (e.g. 8000 chars)
            parsed_data = parse_job_application(full_text[:8000])
            
            log_entry = f"Subject: {msg['subject']} (Body Len: {len(msg['body'])}) -> Parsed: {parsed_data}"
            print(log_entry)
            debug_logs.append(log_entry)
            
            if parsed_data:
                try:
                    # Create JobApplication
                    company = parsed_data.get('company_name', 'Unknown Company')
                    title = parsed_data.get('job_title', 'Unknown Role')
                    
                    # Parse Date from Email Metadata (More reliable than LLM)
                    date_applied = datetime.datetime.utcnow()
                    
                    try:
                        # Parse RFC 2822 date from Gmail header
                        msg_date = msg.get('date')
                        print(f"DEBUG: Parsing date for {company}: '{msg_date}'")
                        if msg_date:
                            parsed_time = parsedate_to_datetime(msg_date)
                            if parsed_time.tzinfo is not None:
                                parsed_time = parsed_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
                            date_applied = parsed_time
                    except Exception as e:
                        print(f"Error parsing date {msg.get('date')}: {e}")
                        pass
                    
                    # Check if exists
                    exists = db.query(JobApplication).filter(JobApplication.company_name == company, JobApplication.job_title == title).first()
                    
                    if exists:
                        # UPDATE existing record with correct date
                        print(f"Updating existing job {exists.id} with date {date_applied}")
                        exists.date_applied = date_applied
                        exists.email_thread_link = f"https://mail.google.com/mail/u/0/#inbox/{msg['thread_id']}"
                        # Optional: Start saving thread_id to DB to detect dupes better?
                        processed += 1 # Count as processed for feedback
                    else:
                        # Hack: Get first user for now
                        user = db.query(User).first() 
                        
                        try:
                            status_str = parsed_data.get('status', 'APPLIED')
                            if status_str not in JobStatus.__members__:
                                status_str = 'APPLIED'
                            status_enum = JobStatus(status_str)
                        except:
                            status_enum = JobStatus.APPLIED
                        
                        new_job = JobApplication(
                            user_id=user.id if user else 1,
                            company_name=company,
                            job_title=title,
                            status=status_enum,
                            date_applied=date_applied,
                            sender_email=msg.get('sender'),
                            notes=parsed_data.get('notes'),
                            email_thread_link=f"https://mail.google.com/mail/u/0/#inbox/{msg['thread_id']}"
                        )
                        db.add(new_job)
                        processed += 1
                except Exception as inner_e:
                    print(f"Error processing single email {msg.get('subject')}: {inner_e}")
                    debug_logs.append(f"Error persisting: {inner_e}")

    except Exception as e:
        print(f"CRITICAL SCAN ERROR: {e}")
        debug_logs.append(f"CRITICAL ERROR: {e}")
        # Build message even if failed partway
        return {
             "message": f"Scan interrupted. Scanned {len(emails)} emails, found {processed} so far. Error: {str(e)}",
             "debug": debug_logs
        }

    db.commit()
    return {
        "message": f"Scanned {len(emails)} emails, found {processed} job applications.",
        "debug": debug_logs
    }
