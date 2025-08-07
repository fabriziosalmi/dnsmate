"""DNS Record management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.auth import current_active_user
from app.core.database import get_async_session
from app.models.user import User, ZonePermission, UserRole
from app.schemas.dns import RecordCreate, RecordRead, RecordUpdate
from app.services.powerdns import PowerDNSClient, PowerDNSRecord
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


@router.get("/{zone_name}", response_model=List[RecordRead])
async def get_records(
    zone_name: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all records for a zone"""
    if not await check_zone_permission(zone_name, current_user, "read", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        records_data = await client.get_records(zone_name)
        records = []
        
        for rrset in records_data:
            for record in rrset.get("records", []):
                records.append(RecordRead(
                    zone_name=zone_name,
                    name=rrset["name"],
                    type=rrset["type"],
                    content=record["content"],
                    ttl=rrset.get("ttl"),
                    disabled=record.get("disabled", False)
                ))
        
        return records
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch records: {str(e)}"
        )


@router.post("/{zone_name}", response_model=RecordRead)
async def create_record(
    zone_name: str,
    record: RecordCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create new record in zone on all active PowerDNS servers"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    try:
        # Validate and clean the record name
        record_name = record.name.strip()
        if not record_name:
            record_name = "@"  # Root of the zone
        
        # Prepare record data for PowerDNS
        record_data = {
            "name": record_name,
            "type": record.type,
            "content": record.content,
            "ttl": record.ttl or 300,  # Default TTL if not specified
            "priority": record.priority,
            "disabled": record.disabled
        }
        
        # Add record to all active PowerDNS servers
        result = await multi_powerdns_service.add_record_to_all(session, zone_name, record_data)
        
        # Check results and provide appropriate response
        if result.is_complete_success:
            return RecordRead(
                zone_name=zone_name,
                name=record.name,
                type=record.type,
                content=record.content,
                ttl=record.ttl or 300,
                priority=record.priority,
                disabled=record.disabled
            )
        elif result.is_partial_success:
            # Some servers succeeded, some failed
            success_servers = [r["server_name"] for r in result.results if r["success"]]
            failed_servers = [f"{r['server_name']}: {r['error']}" for r in result.results if not r["success"]]
            
            raise HTTPException(
                status_code=status.HTTP_207_MULTI_STATUS,
                detail={
                    "message": f"Record created on {result.success_count}/{result.total_servers} servers",
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
                    "message": "Failed to create record on all PowerDNS servers",
                    "errors": error_details
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create record: {str(e)}"
        )


@router.put("/{zone_name}/{record_name}/{record_type}")
async def update_record(
    zone_name: str,
    record_name: str,
    record_type: str,
    record_update: RecordUpdate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update existing record on all active PowerDNS servers"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    try:
        # Prepare record data for PowerDNS
        record_data = {
            "name": record_name,
            "type": record_type,
            "content": record_update.content,
            "ttl": record_update.ttl,
            "priority": record_update.priority,
            "disabled": record_update.disabled
        }
        
        # Update record on all active PowerDNS servers
        result = await multi_powerdns_service.update_record_on_all(session, zone_name, record_data)
        
        # Check results and provide appropriate response
        if result.is_complete_success:
            return {"message": "Record updated successfully on all servers"}
        elif result.is_partial_success:
            # Some servers succeeded, some failed
            success_servers = [r["server_name"] for r in result.results if r["success"]]
            failed_servers = [f"{r['server_name']}: {r['error']}" for r in result.results if not r["success"]]
            
            raise HTTPException(
                status_code=status.HTTP_207_MULTI_STATUS,
                detail={
                    "message": f"Record updated on {result.success_count}/{result.total_servers} servers",
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
                    "message": "Failed to update record on all PowerDNS servers",
                    "errors": error_details
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update record: {str(e)}"
        )


@router.delete("/{zone_name}/{record_name}/{record_type}")
async def delete_record(
    zone_name: str,
    record_name: str,
    record_type: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete record from zone on all active PowerDNS servers"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    try:
        # Delete record from all active PowerDNS servers
        result = await multi_powerdns_service.delete_record_from_all(session, zone_name, record_name, record_type)
        
        # Check results and provide appropriate response
        if result.is_complete_success:
            return {"message": f"Record {record_name} ({record_type}) deleted successfully from all servers"}
        elif result.is_partial_success:
            # Some servers succeeded, some failed
            success_servers = [r["server_name"] for r in result.results if r["success"]]
            failed_servers = [f"{r['server_name']}: {r['error']}" for r in result.results if not r["success"]]
            
            raise HTTPException(
                status_code=status.HTTP_207_MULTI_STATUS,
                detail={
                    "message": f"Record deleted from {result.success_count}/{result.total_servers} servers",
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
                    "message": "Failed to delete record from all PowerDNS servers",
                    "errors": error_details
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete record: {str(e)}"
        )
