from google import genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

def parse_job_application(email_text):
    prompt = f"""
    Analyze the following email and extract job application details.
    
    Goal: Identify ANY job application related emails (confirmations, updates, rejections, offers).
    BE AGGRESSIVE. If it looks like a job application update, extract it.
    
    Return a JSON object with the following fields:
    - company_name: str (Infer from subject or body. e.g. "MongoDB", "Salesforce")
    - job_title: str (Infer from subject or body. If unknown, use "Software Engineer" or "Candidate")
    - status: One of ["APPLIED", "INTERVIEWING", "REJECTED", "OFFER"]
    - date_applied: str (YYYY-MM-DD if extracted, else use today's date)
    - notes: str (Brief summary, e.g. "Application received", "Rejected")
    
    Heuristics to determine Status:
    - "Application Update", "Update on your application", "Thank you for applying", "You have officially applied" -> APPLIED
    - "Thank you for your interest", "not moving forward", "unfortuntely", "not selected" -> REJECTED
    - "Interview", "Schedule a time", "Chat" -> INTERVIEWING
    - "Offer", "Congratulations" -> OFFER
    
    If the email is purely a job alert, newsletter, or spam (e.g. "New match:", "Job opportunities at"), return null.
    
    Email Content:
    {email_text}
    
    JSON Output:
    """
    
    print(f"--- ANALYZING EMAIL (Len: {len(email_text)}) ---")
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash', 
            contents=prompt
        )
        raw_text = response.text
        print(f"RAW LLM RESPONSE:\n{raw_text}\n-------------------")
        
        # Cleanup code blocks
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line if it starts with ```
            if lines[0].startswith("```"):
                lines = lines[1:]
            # Remove last line if it starts with ```
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        if text.lower() == "null":
            return None
            
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing with Gemini: {e}")
        return None
