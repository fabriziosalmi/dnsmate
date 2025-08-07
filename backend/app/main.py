"""DNSMate Backend Application - Enhanced Edition"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse
from typing import Union

from app.core.config import settings
from app.core.database import create_db_and_tables, health_check as db_health_check
from app.core.auth import current_active_user
from app.core.logging import setup_logging, request_logger
from app.services.token_auth import get_current_api_user
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.monitoring import EnhancedMonitoringMiddleware, health_monitor
from app.models.user import User

# Import API routes
from app.api.routes import auth, zones, records, users, tokens, versioning, security
from app.api.routes import settings as settings_routes
from app.api.routes import monitoring

# Set up logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("Starting DNSMate API server...")
    
    try:
        # Initialize database
        await create_db_and_tables()
        logger.info("Database initialized successfully")
        
        # Register health checks
        health_monitor.register_health_check("database", db_health_check)
        
        logger.info("DNSMate API server started successfully")
        yield
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down DNSMate API server...")


# Create FastAPI application with enhanced configuration
app = FastAPI(
    title="DNSMate API - Enhanced Edition",
    description="Advanced DNS Management API for PowerDNS with multi-server support, monitoring, and enterprise features",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # Enhanced OpenAPI configuration
    openapi_tags=[
        {"name": "authentication", "description": "User authentication and authorization"},
        {"name": "zones", "description": "DNS zone management operations"},
        {"name": "records", "description": "DNS record management operations"},
        {"name": "users", "description": "User management and permissions"},
        {"name": "api-tokens", "description": "API token management"},
        {"name": "settings", "description": "System and PowerDNS configuration"},
        {"name": "versioning", "description": "Zone versioning and rollback"},
        {"name": "backup", "description": "Zone backup and export"},
        {"name": "security", "description": "Security and audit features"},
        {"name": "monitoring", "description": "Health checks and metrics"},
    ]
)

# Security: Trusted host middleware (for production)
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["*.dnsmate.com", "localhost", "127.0.0.1"]
    )

# Enhanced CORS configuration
cors_origins = ["*"] if settings.environment == "development" else [
    "https://dnsmate.com",
    "https://app.dnsmate.com",
    "http://localhost:3000",  # Development frontend
    "http://localhost:3001",  # Alternative dev port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"]
)

# Enhanced monitoring middleware (temporarily disabled for debugging)
# app.add_middleware(
#     EnhancedMonitoringMiddleware,
#     enable_detailed_logging=(settings.environment == "development")
# )

# Rate limiting middleware (enabled in production)
if settings.environment == "production":
    app.add_middleware(RateLimitMiddleware)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"Unhandled exception: {exc}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": request_id,
            "type": "internal_error"
        }
    )


# Enhanced dual authentication dependency
async def get_current_user(
    jwt_user: User = Depends(current_active_user),
    api_user: User = Depends(get_current_api_user)
) -> User:
    """Get current user from either JWT or API token authentication"""
    return jwt_user or api_user


# Include API routers with enhanced organization
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(monitoring.router, prefix="/api", tags=["monitoring"])
app.include_router(security.router, prefix="/api", tags=["security"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tokens.router, prefix="/api/tokens", tags=["api-tokens"])
app.include_router(versioning.router, prefix="/api/zones", tags=["versioning", "backup"])


@app.get("/", tags=["health"])
async def root():
    """Enhanced root endpoint with system information"""
    return {
        "service": "DNSMate API - Enhanced Edition",
        "version": "1.1.0",
        "status": "operational",
        "features": [
            "Multi-server PowerDNS support with circuit breakers",
            "Enhanced monitoring and metrics",
            "Role-based access control",
            "API token authentication",
            "Zone versioning and rollback",
            "BIND backup exports",
            "Real-time health monitoring",
            "Performance optimization",
            "Enterprise security features"
        ],
        "documentation": {
            "interactive": "/docs",
            "redoc": "/redoc"
        },
        "endpoints": {
            "health": "/api/health",
            "detailed_health": "/api/health/detailed",
            "metrics": "/api/metrics",
            "powerdns_status": "/api/status/powerdns"
        }
    }


@app.get("/api/info", tags=["health"])
async def api_info():
    """API information and capabilities"""
    return {
        "name": "DNSMate API",
        "version": "1.1.0",
        "build": "enhanced-2025.08.07",
        "environment": settings.environment,
        "capabilities": {
            "multi_server_powerdns": True,
            "circuit_breakers": True,
            "performance_monitoring": True,
            "audit_logging": True,
            "api_tokens": True,
            "zone_versioning": True,
            "rbac": True,
            "backup_export": True
        },
        "limits": {
            "max_zones_per_user": 1000,
            "max_records_per_zone": 10000,
            "api_rate_limit": "60 requests/minute" if settings.environment == "production" else "unlimited",
            "token_expiry": "configurable"
        }
    }
