from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64

def get_gmail_service(access_token):
    creds = Credentials(token=access_token)
    service = build('gmail', 'v1', credentials=creds)
    return service

def fetch_latest_emails(service, max_results=250):
    # 1. Fetch Message IDs (Pagination)
    print(f"Fetching list of up to {max_results} emails...")
    messages = []
    next_page_token = None
    
    while len(messages) < max_results:
        # Calculate how many more we need
        num_to_fetch = min(100, max_results - len(messages)) # 100 is max per page mostly
        
        import datetime
        
        # Calculate date 45 days ago
        forty_five_days_ago = (datetime.datetime.now() - datetime.timedelta(days=45)).strftime('%Y/%m/%d')
        
        # Smart Query: Search Subject AND Body for keywords.
        # Added date filter to only look at emails from the last 45 days.
        query = f'(application OR applied OR interview OR offer OR rejection OR update OR status OR "next steps" OR "thank you" OR "job description" OR "candidacy" OR "hiring" OR "recruiter" OR "talent") -from:calendar-notification@google.com after:{forty_five_days_ago}'
        
        results = service.users().messages().list(
            userId='me', 
            q=query, 
            maxResults=num_to_fetch, 
            pageToken=next_page_token
        ).execute()
        
        page_messages = results.get('messages', [])
        messages.extend(page_messages)
        
        next_page_token = results.get('nextPageToken')
        if not next_page_token or len(page_messages) == 0:
            break
            
    print(f"Found {len(messages)} message IDs. Fetching details...")

    # 2. Batch Fetch Content
    email_data = []

    def batch_callback(request_id, response, exception):
        if exception:
            print(f"Error in batch: {exception}")
            return
            
        payload = response.get('payload', {})
        headers = payload.get("headers", [])
        
        subject = ""
        sender = ""
        date = ""
        
        for h in headers:
            name = h.get("name", "").lower()
            if name == "subject":
                subject = h.get("value")
            if name == "from":
                sender = h.get("value")
            if name == "date":
                date = h.get("value")

        # Get Body - Recursive extraction
        def get_body(payload):
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        data = part['body'].get('data')
                        if data:
                             return base64.urlsafe_b64decode(data).decode()
                    elif part['mimeType'] == 'multipart/alternative':
                        return get_body(part)
            else:
                 data = payload['body'].get('data')
                 if data:
                     return base64.urlsafe_b64decode(data).decode()
            return ""

        body = get_body(payload)
        
        # Fallback to snippet
        if not body or len(body.strip()) == 0:
            body = response.get('snippet', '')
            
        email_data.append({
            "id": response['id'],
            "subject": subject,
            "sender": sender,
            "date": date,
            "body": body,
            "thread_id": response['threadId']
        })

    # Create batches of 50 requests to avoid connection limits
    BATCH_SIZE = 50
    for i in range(0, len(messages), BATCH_SIZE):
        batch = service.new_batch_http_request(callback=batch_callback)
        chunk = messages[i:i + BATCH_SIZE]
        
        for msg in chunk:
            batch.add(service.users().messages().get(userId='me', id=msg['id']))
        
        print(f"Executing batch {i // BATCH_SIZE + 1}...")
        batch.execute()
        
    print(f"Fetched {len(email_data)} full emails.")
    return email_data
