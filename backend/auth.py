from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import httpx
from .database import get_db
from .models import User

load_dotenv()

# Removed global GOOGLE_REDIRECT_URI definition to force dynamic lookup

# Scopes: OpenID, Email, Profile, AND Gmail Readonly
GOOGLE_SCOPES = "openid email profile https://www.googleapis.com/auth/gmail.readonly"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/login")
async def login():
    # Determine Redirect URI dynamically
    RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL")
    if RENDER_EXTERNAL_URL:
        redirect_uri = f"{RENDER_EXTERNAL_URL}/auth/callback"
    else:
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline", # To get refresh token
        "prompt": "consent"
    }
    url_params = "&".join([f"{key}={value}" for key, value in params.items()])
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{url_params}"
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def login_callback(code: str, db: Session = Depends(get_db)):
    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    # Determine Redirect URI dynamically (MUST MATCH login)
    RENDER_EXTERNAL_URL = os.getenv("RENDER_EXTERNAL_URL")
    if RENDER_EXTERNAL_URL:
        redirect_uri = f"{RENDER_EXTERNAL_URL}/auth/callback"
    else:
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        token_data = response.json()
        
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data)
        
    access_token = token_data.get("access_token")
    id_token = token_data.get("id_token")
    refresh_token = token_data.get("refresh_token") # Save this for long term access
    
    # Get User Info
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_response = await client.get("https://www.googleapis.com/oauth2/v1/userinfo", headers=headers)
        user_info = user_info_response.json()
        
    email = user_info.get("email")
    
    # Check if user exists, else create/update
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(
            email=email,
            name=user_info.get("name"),
            picture=user_info.get("picture")
        )
        db.add(db_user)
    else:
        # Update connection info if needed
        pass
        
    # IN A REAL APP: Store access_token/refresh_token securely (Encrypted in DB)
    # For this task, we will just return it to the frontend to store in localStorage 
    # OR better, store it in a temporary HTTPOnly cookie or session. 
    # The prompt implies we need it for parsing. 
    # To be simple: we will update the User model to store the access_token (INSECURE for prod, but okay for prototype)
    # Actually, we MUST store it to run background jobs or triggered scans.
    
    # Let's add access_token column to User model in a bit. For now:
    # PASS TOKEN TO FRONTEND VIA URL (Quick & Dirty for prototype)
    
    db.commit()
    db.refresh(db_user)

    # Returning access token in URL so frontend can send it back for scanning
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{FRONTEND_URL}?token={access_token}&email={email}")

@router.get("/verify")
async def verify_token_endpoint(token: str = Header(...)):
    from .gmail_service import get_gmail_service
    try:
        service = get_gmail_service(token)
        # fast check
        profile = service.users().getProfile(userId='me').execute()
        return {"status": "valid", "email": profile.get("emailAddress")}
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    from .gmail_service import get_gmail_service
    
    try:
        # 1. Verify token with Google (and get email)
        service = get_gmail_service(token)
        profile = service.users().getProfile(userId='me').execute()
        email = profile.get("emailAddress")
    except Exception as e:
        print(f"Auth failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    # 2. Get User from DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Auto-create user if they exist in Google but not DB (edge case validity?)
        # For now, let's assume they should exist if they logged in.
        # But wait, if they login via frontend, they hit /callback, which creates the user.
        # So they should exist.
        raise HTTPException(status_code=401, detail="User not found")
        
    return user
