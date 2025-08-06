"""Zone management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.auth import current_active_user
from app.core.database import get_async_session
from app.models.user import User, ZonePermission, UserRole
from app.schemas.dns import ZoneCreate, ZoneRead
from app.services.powerdns import PowerDNSClient, PowerDNSZone

router = APIRouter()


async def check_zone_permission(
    zone_name: str, 
    user: User, 
    permission_type: str,
    session: AsyncSession
) -> bool:
    """Check if user has permission for zone"""
    if user.role == UserRole.ADMIN:
        return True
    
    result = await session.execute(
        select(ZonePermission).where(
            ZonePermission.user_id == user.id,
            ZonePermission.zone_name == zone_name
        )
    )
    permission = result.scalar_one_or_none()
    
    if not permission:
        return False
    
    if permission_type == "read":
        return permission.can_read
    elif permission_type == "write":
        return permission.can_write
    
    return False


@router.get("/", response_model=List[ZoneRead])
async def get_zones(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all zones accessible to user"""
    try:
        client = PowerDNSClient()
        
        # If no PowerDNS configuration exists, return empty list instead of error
        if not client.api_url or not client.api_key:
            return []
        
        zones_data = await client.get_zones()
        zones = []
        
        for zone_data in zones_data:
            zone_name = zone_data["name"].rstrip(".")
            
            # Check if user has access to this zone
            if await check_zone_permission(zone_name, current_user, "read", session):
                zones.append(ZoneRead(
                    name=zone_name,
                    kind=zone_data.get("kind", "Native"),
                    serial=zone_data.get("serial"),
                    account=zone_data.get("account")
                ))
        
        return zones
        
    except Exception as e:
        # Log the error but return empty list if PowerDNS is not configured
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to fetch zones (PowerDNS may not be configured): {str(e)}")
        return []


@router.get("/{zone_name}", response_model=ZoneRead)
async def get_zone(
    zone_name: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific zone"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        zone_data = await client.get_zone(zone_name)
        return ZoneRead(
            name=zone_data["name"].rstrip("."),
            kind=zone_data.get("kind", "Native"),
            serial=zone_data.get("serial"),
            account=zone_data.get("account")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone not found: {str(e)}"
        )


@router.post("/", response_model=ZoneRead)
async def create_zone(
    zone: ZoneCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create new zone"""
    if current_user.role not in [UserRole.ADMIN, UserRole.EDITOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    client = PowerDNSClient()
    
    try:
        powerdns_zone = PowerDNSZone(
            name=zone.name,
            kind=zone.kind,
            masters=zone.masters,
            account=zone.account
        )
        
        zone_data = await client.create_zone(powerdns_zone)
        
        # Create permission for the user if they're not admin
        if current_user.role == UserRole.EDITOR:
            permission = ZonePermission(
                user_id=current_user.id,
                zone_name=zone.name,
                can_read=True,
                can_write=True
            )
            session.add(permission)
            await session.commit()
        
        return ZoneRead(
            name=zone.name,
            kind=zone.kind,
            masters=zone.masters,
            account=zone.account
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create zone: {str(e)}"
        )


@router.delete("/{zone_name}")
async def delete_zone(
    zone_name: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete zone"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        await client.delete_zone(zone_name)
        
        # Clean up permissions
        await session.execute(
            select(ZonePermission).where(ZonePermission.zone_name == zone_name)
        )
        await session.commit()
        
        return {"message": f"Zone {zone_name} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete zone: {str(e)}"
        )
