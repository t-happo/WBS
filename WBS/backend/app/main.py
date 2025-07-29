from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .database import create_tables
from .api.v1 import users, projects, tasks

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="プロジェクト管理・WBSツール API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS - More explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "*"  # Allow all for debugging
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include API routers
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    create_tables()


@app.get("/")
async def root():
    """Root endpoint - redirect to GUI"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/static/index.html")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.VERSION}


@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS requests for CORS preflight"""
    return {"message": "OK"}