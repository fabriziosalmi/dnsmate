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
from app.services.multi_powerdns import multi_powerdns_service

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
    """Create new zone on all active PowerDNS servers"""
    if current_user.role not in [UserRole.ADMIN, UserRole.EDITOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        # Prepare zone data for PowerDNS
        zone_data = {
            "name": zone.name,
            "kind": zone.kind,
            "masters": zone.masters,
            "account": zone.account
        }
        
        # Create zone on all active PowerDNS servers
        result = await multi_powerdns_service.create_zone_on_all(session, zone_data)
        
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
        
        # Check results and provide appropriate response
        if result.is_complete_success:
            return ZoneRead(
                name=zone.name,
                kind=zone.kind,
                masters=zone.masters,
                account=zone.account
            )
        elif result.is_partial_success:
            # Some servers succeeded, some failed
            success_servers = [r["server_name"] for r in result.results if r["success"]]
            failed_servers = [f"{r['server_name']}: {r['error']}" for r in result.results if not r["success"]]
            
            raise HTTPException(
                status_code=status.HTTP_207_MULTI_STATUS,
                detail={
                    "message": f"Zone created on {result.success_count}/{result.total_servers} servers",
                    "success_servers": success_servers,
                    "failed_servers": failed_servers,
                    "partial_success": True,
                    "zone": {
                        "name": zone.name,
                        "kind": zone.kind,
                        "masters": zone.masters,
                        "account": zone.account
                    }
                }
            )
        else:
            # All servers failed
            error_details = [f"{r['server_name']}: {r['error']}" for r in result.results]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Failed to create zone on all PowerDNS servers",
                    "errors": error_details
                }
            )
        
    except HTTPException:
        raise
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
    """Delete zone from all active PowerDNS servers"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    try:
        # Delete zone from all active PowerDNS servers
        result = await multi_powerdns_service.delete_zone_from_all(session, zone_name)
        
        # Clean up permissions regardless of PowerDNS results
        await session.execute(
            select(ZonePermission).where(ZonePermission.zone_name == zone_name)
        )
        await session.commit()
        
        # Check results and provide appropriate response
        if result.is_complete_success:
            return {"message": f"Zone {zone_name} deleted successfully from all servers"}
        elif result.is_partial_success:
            # Some servers succeeded, some failed
            success_servers = [r["server_name"] for r in result.results if r["success"]]
            failed_servers = [f"{r['server_name']}: {r['error']}" for r in result.results if not r["success"]]
            
            raise HTTPException(
                status_code=status.HTTP_207_MULTI_STATUS,
                detail={
                    "message": f"Zone deleted from {result.success_count}/{result.total_servers} servers",
                    "success_servers": success_servers,
                    "failed_servers": failed_servers,
                    "partial_success": True
                }
            )
        else:
            # All servers failed
            error_details = [f"{r['server_name']}: {r['error']}" for r in result.results]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Failed to delete zone from all PowerDNS servers",
                    "errors": error_details
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete zone: {str(e)}"
        )
