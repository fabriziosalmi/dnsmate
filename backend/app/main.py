"""DNSMate Backend Application"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from typing import Union
from app.core.config import settings
from app.api.routes import auth, zones, records, users, tokens, versioning, security
from app.api.routes import settings as settings_routes
from app.core.database import create_db_and_tables
from app.core.auth import current_active_user
from app.services.token_auth import get_current_api_user
from app.middleware.rate_limit import RateLimitMiddleware
from app.models.user import User

app = FastAPI(
    title="DNSMate API",
    description="DNS Management API for PowerDNS instances with user authentication and role-based access control",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Dependency for dual authentication (JWT or API token)
async def get_current_user(
    jwt_user: User = Depends(current_active_user),
    api_user: User = Depends(get_current_api_user)
) -> User:
    """Get current user from either JWT or API token authentication"""
    return jwt_user or api_user

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(security.router, tags=["security"])  # Security routes
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])  # Settings routes
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tokens.router, prefix="/api/tokens", tags=["api-tokens"])
app.include_router(versioning.router, prefix="/api/zones", tags=["versioning", "backup"])


@app.on_event("startup")
async def on_startup():
    """Initialize database on startup"""
    from app.core.database import create_db_and_tables
    await create_db_and_tables()


@app.on_event("shutdown")
async def on_shutdown():
    """Cleanup on shutdown"""
    pass


@app.get("/", tags=["health"])
async def root():
    """Health check endpoint"""
    return {
        "message": "DNSMate API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/api/health", tags=["health"])
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-06-30T00:00:00Z",
        "version": "1.0.0",
        "features": [
            "User authentication (JWT + API tokens)",
            "Role-based access control",
            "Zone and record management",
            "Configuration versioning",
            "BIND backup exports",
            "PowerDNS integration"
        ]
    }
