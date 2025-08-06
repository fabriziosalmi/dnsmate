"""Settings API endpoints for PowerDNS configuration management"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Union, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.auth import current_admin_user
from app.models.user import User
from app.schemas.settings import (
    PowerDNSSettingCreate,
    PowerDNSSettingUpdate, 
    PowerDNSSettingPublic,
    PowerDNSTestResult,
    VersioningSettings,
    VersioningSettingsUpdate
)
from app.services.settings import PowerDNSSettingsService, versioning_settings_service

router = APIRouter()


@router.get("/powerdns/status")
async def get_powerdns_status(
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Check PowerDNS configuration status (admin only)"""
    settings_service = PowerDNSSettingsService()
    settings_list = await settings_service.get_powerdns_settings(session)
    
    return {
        "configured": len(settings_list) > 0,
        "count": len(settings_list),
        "has_default": any(s.is_default for s in settings_list) if settings_list else False
    }


@router.get("/powerdns", response_model=List[PowerDNSSettingPublic])
async def get_powerdns_settings(
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all PowerDNS settings (admin only)"""
    settings_service = PowerDNSSettingsService()
    return await settings_service.get_powerdns_settings(session)


@router.get("/powerdns/{setting_id}", response_model=PowerDNSSettingPublic)
async def get_powerdns_setting(
    setting_id: int,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific PowerDNS setting by ID (admin only)"""
    settings_service = PowerDNSSettingsService()
    setting = await settings_service.get_powerdns_setting(session, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="PowerDNS setting not found")
    return setting


@router.post("/powerdns", response_model=PowerDNSSettingPublic, status_code=status.HTTP_201_CREATED)
async def create_powerdns_setting(
    setting: PowerDNSSettingCreate,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new PowerDNS setting (admin only)"""
    settings_service = PowerDNSSettingsService()
    return await settings_service.create_powerdns_setting(session, setting)


@router.put("/powerdns/{setting_id}", response_model=PowerDNSSettingPublic)
async def update_powerdns_setting(
    setting_id: int,
    setting: PowerDNSSettingUpdate,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update a PowerDNS setting (admin only)"""
    settings_service = PowerDNSSettingsService()
    updated_setting = await settings_service.update_powerdns_setting(session, setting_id, setting)
    if not updated_setting:
        raise HTTPException(status_code=404, detail="PowerDNS setting not found")
    return updated_setting


@router.delete("/powerdns/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_powerdns_setting(
    setting_id: int,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a PowerDNS setting (admin only)"""
    settings_service = PowerDNSSettingsService()
    success = await settings_service.delete_powerdns_setting(session, setting_id)
    if not success:
        raise HTTPException(status_code=404, detail="PowerDNS setting not found")


@router.post("/powerdns/{setting_id}/test", response_model=PowerDNSTestResult)
async def test_powerdns_connection(
    setting_id: int,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Test PowerDNS connection (admin only)"""
    settings_service = PowerDNSSettingsService()
    setting = await settings_service.get_powerdns_setting(session, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="PowerDNS setting not found")
    
    result = await settings_service.test_powerdns_connection(
        api_url=setting.api_url,
        api_key=setting.api_key,
        timeout=setting.timeout,
        verify_ssl=setting.verify_ssl
    )
    return result


@router.get("/versioning", response_model=VersioningSettings)
async def get_versioning_settings(
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get versioning settings (admin only)"""
    return await versioning_settings_service.get_versioning_settings(session)


@router.post("/versioning", response_model=VersioningSettings)
async def update_versioning_settings(
    settings_data: VersioningSettingsUpdate,
    current_user: User = Depends(current_admin_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update versioning settings (admin only)"""
    return await versioning_settings_service.update_versioning_settings(session, settings_data)
