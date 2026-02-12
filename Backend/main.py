from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Local imports
from db import init_db
from routes import shifts, employees, alerts, attendance

# -----------------------------------------------------------------------------
# 🚀 App Initialization
# -----------------------------------------------------------------------------
app = FastAPI(title="ShiftTrack Data API")

# -----------------------------------------------------------------------------
# 🌐 CORS Setup (Allow Chrome Extension / React Frontend)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# 🗄️ Database Initialization
# -----------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    """Initialize database tables when the FastAPI app starts."""
    init_db()

# -----------------------------------------------------------------------------
# 🏠 Core Root & Health Endpoints
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    """Basic health check endpoint."""
    return {"message": "ShiftTrack FastAPI backend is running 🚀"}

@app.get("/health")
def health():
    """Health check endpoint."""
    return {"message": "ShiftTrack FastAPI backend is running 🚀"}

# -----------------------------------------------------------------------------
# �️ Include Routers
# -----------------------------------------------------------------------------
app.include_router(shifts.router)
app.include_router(employees.router)
app.include_router(alerts.router)
app.include_router(attendance.router)
