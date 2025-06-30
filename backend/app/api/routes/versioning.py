"""Zone versioning and backup routes"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import io
from datetime import datetime

from app.core.auth import current_active_user
from app.core.database import get_async_session
from app.models.user import User, ZonePermission, UserRole
from app.schemas.dns import ZoneVersionRead, ZoneBackupRead
from app.schemas.tokens import ZoneVersionCreate
from app.services.versioning import ZoneVersioningService
from app.services.backup import BindBackupService

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


@router.get("/{zone_name}/versions", response_model=List[ZoneVersionRead])
async def get_zone_versions(
    zone_name: str,
    limit: int = 50,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get version history for a zone"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    versioning_service = ZoneVersioningService(session)
    versions = await versioning_service.get_zone_versions(zone_name, limit)
    
    return versions


@router.post("/{zone_name}/versions", response_model=ZoneVersionRead)
async def create_zone_version(
    zone_name: str,
    version_data: ZoneVersionCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new version snapshot of a zone"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    versioning_service = ZoneVersioningService(session)
    
    try:
        version = await versioning_service.create_version(
            zone_name=zone_name,
            user=current_user,
            description=version_data.description,
            changes_summary=version_data.changes_summary
        )
        return version
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{zone_name}/versions/{version_id}", response_model=ZoneVersionRead)
async def get_zone_version_details(
    zone_name: str,
    version_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific version details"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    versioning_service = ZoneVersioningService(session)
    version = await versioning_service.get_version_details(version_id)
    
    if not version or version.zone_name != zone_name:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return version


@router.post("/{zone_name}/versions/{version_id}/rollback", response_model=ZoneVersionRead)
async def rollback_to_version(
    zone_name: str,
    version_id: int,
    rollback_data: ZoneVersionCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Rollback zone to a specific version"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    versioning_service = ZoneVersioningService(session)
    
    try:
        version = await versioning_service.rollback_to_version(
            zone_name=zone_name,
            version_id=version_id,
            user=current_user,
            description=rollback_data.description
        )
        return version
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{zone_name}/versions/compare/{version1_id}/{version2_id}")
async def compare_versions(
    zone_name: str,
    version1_id: int,
    version2_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Compare two versions and show differences"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    versioning_service = ZoneVersioningService(session)
    
    try:
        comparison = await versioning_service.compare_versions(
            zone_name=zone_name,
            version1_id=version1_id,
            version2_id=version2_id
        )
        return comparison
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{zone_name}/backup")
async def download_zone_backup(
    zone_name: str,
    format: str = "bind",
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Download zone backup in BIND format"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    if format != "bind":
        raise HTTPException(status_code=400, detail="Only BIND format is currently supported")
    
    backup_service = BindBackupService()
    
    try:
        backup_content = await backup_service.generate_zone_backup(zone_name)
        
        # Create response with proper headers
        clean_zone_name = zone_name.rstrip('.')
        filename = f"{clean_zone_name}.zone"
        
        return Response(
            content=backup_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/backup/all")
async def download_all_zones_backup(
    format: str = "bind",
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Download backup of all accessible zones"""
    if format != "bind":
        raise HTTPException(status_code=400, detail="Only BIND format is currently supported")
    
    # Get all zones accessible to the user
    accessible_zones = []
    
    if current_user.role == UserRole.ADMIN:
        # Admin can access all zones - this would need to query PowerDNS directly
        # For now, we'll get zones from permissions
        result = await session.execute(
            select(ZonePermission.zone_name)
            .where(ZonePermission.can_read == True)
            .distinct()
        )
        accessible_zones = [row[0] for row in result.fetchall()]
    else:
        # Get zones from user permissions
        result = await session.execute(
            select(ZonePermission.zone_name)
            .where(
                ZonePermission.user_id == current_user.id,
                ZonePermission.can_read == True
            )
        )
        accessible_zones = [row[0] for row in result.fetchall()]
    
    if not accessible_zones:
        raise HTTPException(status_code=404, detail="No accessible zones found")
    
    backup_service = BindBackupService()
    
    try:
        backup_content = await backup_service.generate_user_backup(current_user, accessible_zones)
        
        # Create response with proper headers
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"dnsmate_backup_{current_user.id}_{timestamp}.zone"
        
        return Response(
            content=backup_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
