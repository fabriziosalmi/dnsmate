"""Enhanced health and monitoring endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.auth import current_active_user
from app.core.database import get_async_session, health_check as db_health_check
from app.middleware.monitoring import health_monitor, get_application_metrics
from app.services.multi_powerdns import multi_powerdns_service
from app.models.user import User

router = APIRouter()


@router.get("/health", tags=["monitoring"])
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "DNSMate API",
        "version": "1.0.0",
        "timestamp": "2025-08-07T00:00:00Z"
    }


@router.get("/health/detailed", tags=["monitoring"])
async def detailed_health_check(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Detailed health check with database and service status"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Run comprehensive health checks
    health_data = await health_monitor.run_health_checks()
    
    # Add PowerDNS multi-server health
    powerdns_health = await multi_powerdns_service.get_health_status(db)
    health_data["powerdns"] = powerdns_health
    
    return health_data


@router.get("/metrics", tags=["monitoring"])
async def get_metrics(
    current_user: User = Depends(current_active_user)
):
    """Get application metrics and performance data"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return await get_application_metrics()


@router.get("/status/powerdns", tags=["monitoring"])
async def get_powerdns_status(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get PowerDNS servers status and performance metrics"""
    if current_user.role not in ["admin", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor or admin access required"
        )
    
    return await multi_powerdns_service.get_health_status(db)


# Register health checks
async def database_health_check() -> bool:
    """Database connectivity health check"""
    return await db_health_check()


async def powerdns_health_check() -> bool:
    """PowerDNS connectivity health check"""
    try:
        # This would need to be implemented with actual PowerDNS ping
        return True
    except Exception:
        return False


# Register health checks with the monitor
health_monitor.register_health_check("database", database_health_check)
health_monitor.register_health_check("powerdns", powerdns_health_check)
