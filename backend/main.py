from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .routers.scan import router as scan_router
from .database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NextSteps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Frontend URL
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
