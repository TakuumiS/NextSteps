from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .routers.scan import router as scan_router
from .database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NextSteps API")

import os

origins = [
    "http://localhost:5173",  # Local development
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

# Add specific allowed origins from env
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins.extend(allowed_origins_env.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(scan_router)
from .routers.jobs import router as jobs_router
app.include_router(jobs_router)
from .routers.users import router as users_router
app.include_router(users_router)
from .routers.analytics import router as analytics_router
app.include_router(analytics_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to NextSteps API"}
