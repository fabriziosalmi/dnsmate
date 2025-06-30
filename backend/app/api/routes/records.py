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
    """Create new record in zone"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        # Validate and clean the record name
        record_name = record.name.strip()
        if not record_name:
            record_name = "@"  # Root of the zone
        
        powerdns_record = PowerDNSRecord(
            name=record_name,
            type=record.type,
            content=record.content,
            ttl=record.ttl or 300,  # Default TTL if not specified
            priority=record.priority,
            disabled=record.disabled
        )
        
        await client.create_record(zone_name, powerdns_record)
        
        return RecordRead(
            zone_name=zone_name,
            name=record.name,
            type=record.type,
            content=record.content,
            ttl=record.ttl or 300,
            priority=record.priority,
            disabled=record.disabled
        )
        
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
    """Update existing record"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        # Get current record data
        records_data = await client.get_records(zone_name)
        current_record = None
        
        for rrset in records_data:
            if rrset["name"] == record_name and rrset["type"] == record_type:
                if rrset.get("records"):
                    current_record = rrset["records"][0]
                    current_ttl = rrset.get("ttl")
                break
        
        if not current_record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Update with new values
        updated_record = PowerDNSRecord(
            name=record_name,
            type=record_type,
            content=record_update.content or current_record["content"],
            ttl=record_update.ttl or current_ttl,
            priority=record_update.priority,
            disabled=record_update.disabled if record_update.disabled is not None else current_record.get("disabled", False)
        )
        
        await client.update_record(zone_name, updated_record)
        
        return {"message": "Record updated successfully"}
        
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
    """Delete record from zone"""
    if not await check_zone_permission(zone_name, current_user, "write", session):
        raise HTTPException(status_code=403, detail="Access denied to this zone")
    
    client = PowerDNSClient()
    
    try:
        await client.delete_record(zone_name, record_name, record_type)
        return {"message": f"Record {record_name} ({record_type}) deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete record: {str(e)}"
        )
