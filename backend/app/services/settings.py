"""Settings service for managing system and PowerDNS configurations"""

import asyncio
import time
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload
from cryptography.fernet import Fernet
import os
import httpx

from app.models.settings import SystemSettings, PowerDNSSettings, VersioningSettings
from app.schemas.settings import (
    SystemSettingCreate, 
    SystemSettingUpdate,
    PowerDNSSettingCreate,
    PowerDNSSettingUpdate,
    PowerDNSTestResult,
    VersioningSettingsCreate,
    VersioningSettingsUpdate
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class SettingsService:
    """Service for managing system settings"""
    
    def __init__(self):
        # Initialize encryption key for sensitive settings
        self.encryption_key = os.environ.get('SETTINGS_ENCRYPTION_KEY', settings.secret_key)
        if len(self.encryption_key.encode()) < 32:
            self.encryption_key = (self.encryption_key * 32)[:32]
        self.fernet = Fernet(Fernet.generate_key()) if not hasattr(self, 'fernet') else self.fernet

    def _encrypt_value(self, value: str) -> str:
        """Encrypt sensitive values"""
        return self.fernet.encrypt(value.encode()).decode()

    def _decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt sensitive values"""
        return self.fernet.decrypt(encrypted_value.encode()).decode()

    async def get_system_setting(self, db: AsyncSession, key: str) -> Optional[SystemSettings]:
        """Get a system setting by key"""
        result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
        return result.scalar_one_or_none()

    async def get_system_settings(self, db: AsyncSession, category: Optional[str] = None) -> List[SystemSettings]:
        """Get all system settings, optionally filtered by category"""
        query = select(SystemSettings)
        if category:
            query = query.where(SystemSettings.category == category)
        result = await db.execute(query.order_by(SystemSettings.key))
        return result.scalars().all()

    async def create_system_setting(self, db: AsyncSession, setting: SystemSettingCreate) -> SystemSettings:
        """Create a new system setting"""
        db_setting = SystemSettings(**setting.dict())
        if setting.is_encrypted and setting.value:
            db_setting.value = self._encrypt_value(setting.value)
        
        db.add(db_setting)
        await db.commit()
        await db.refresh(db_setting)
        return db_setting

    async def update_system_setting(
        self, 
        db: AsyncSession, 
        key: str, 
        setting: SystemSettingUpdate
    ) -> Optional[SystemSettings]:
        """Update an existing system setting"""
        db_setting = await self.get_system_setting(db, key)
        if not db_setting:
            return None

        update_data = setting.dict(exclude_unset=True)
        
        # Handle encryption
        if 'value' in update_data and db_setting.is_encrypted:
            update_data['value'] = self._encrypt_value(update_data['value'])

        for field, value in update_data.items():
            setattr(db_setting, field, value)

        await db.commit()
        await db.refresh(db_setting)
        return db_setting

class PowerDNSSettingsService:
    """Service for managing PowerDNS connection settings"""

    async def get_powerdns_settings(self, db: AsyncSession) -> List[PowerDNSSettings]:
        """Get all PowerDNS settings"""
        result = await db.execute(
            select(PowerDNSSettings)
            .where(PowerDNSSettings.is_active == True)
            .order_by(PowerDNSSettings.is_default.desc(), PowerDNSSettings.name)
        )
        return result.scalars().all()

    async def get_powerdns_setting(self, db: AsyncSession, setting_id: int) -> Optional[PowerDNSSettings]:
        """Get PowerDNS setting by ID"""
        result = await db.execute(
            select(PowerDNSSettings).where(PowerDNSSettings.id == setting_id)
        )
        return result.scalar_one_or_none()

    async def get_default_powerdns_setting(self, db: AsyncSession) -> Optional[PowerDNSSettings]:
        """Get the default PowerDNS setting"""
        result = await db.execute(
            select(PowerDNSSettings)
            .where(PowerDNSSettings.is_default == True, PowerDNSSettings.is_active == True)
        )
        setting = result.scalar_one_or_none()
        
        # If no default is set, get the first active setting
        if not setting:
            result = await db.execute(
                select(PowerDNSSettings)
                .where(PowerDNSSettings.is_active == True)
                .order_by(PowerDNSSettings.id)
                .limit(1)
            )
            setting = result.scalar_one_or_none()
        
        return setting

    async def create_powerdns_setting(
        self, 
        db: AsyncSession, 
        setting: PowerDNSSettingCreate
    ) -> PowerDNSSettings:
        """Create a new PowerDNS setting"""
        # If this is set as default, unset other defaults
        if setting.is_default:
            await self._unset_all_defaults(db)

        db_setting = PowerDNSSettings(**setting.dict())
        db.add(db_setting)
        await db.commit()
        await db.refresh(db_setting)
        return db_setting

    async def update_powerdns_setting(
        self, 
        db: AsyncSession, 
        setting_id: int, 
        setting: PowerDNSSettingUpdate
    ) -> Optional[PowerDNSSettings]:
        """Update an existing PowerDNS setting"""
        db_setting = await self.get_powerdns_setting(db, setting_id)
        if not db_setting:
            return None

        # If setting as default, unset other defaults
        if setting.is_default:
            await self._unset_all_defaults(db)

        update_data = setting.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_setting, field, value)

        await db.commit()
        await db.refresh(db_setting)
        return db_setting

    async def delete_powerdns_setting(self, db: AsyncSession, setting_id: int) -> bool:
        """Delete a PowerDNS setting"""
        db_setting = await self.get_powerdns_setting(db, setting_id)
        if not db_setting:
            return False

        await db.delete(db_setting)
        await db.commit()
        return True

    async def _unset_all_defaults(self, db: AsyncSession):
        """Unset all default flags"""
        await db.execute(
            update(PowerDNSSettings).values(is_default=False)
        )

    async def test_powerdns_connection(
        self, 
        api_url: str, 
        api_key: str, 
        timeout: int = 30,
        verify_ssl: bool = True
    ) -> PowerDNSTestResult:
        """Test PowerDNS connection"""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                verify=verify_ssl
            ) as client:
                headers = {
                    "X-API-Key": api_key,
                    "Content-Type": "application/json"
                }
                
                # Test basic connectivity
                response = await client.get(
                    f"{api_url}/api/v1/servers/localhost",
                    headers=headers
                )
                
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    server_info = response.json()
                    
                    # Get zones count
                    zones_response = await client.get(
                        f"{api_url}/api/v1/servers/localhost/zones",
                        headers=headers
                    )
                    
                    zones_count = len(zones_response.json()) if zones_response.status_code == 200 else None
                    
                    return PowerDNSTestResult(
                        success=True,
                        message="Connection successful",
                        response_time_ms=response_time,
                        server_version=server_info.get('version'),
                        zones_count=zones_count
                    )
                else:
                    return PowerDNSTestResult(
                        success=False,
                        message=f"HTTP {response.status_code}: {response.text}",
                        response_time_ms=response_time
                    )
                    
        except httpx.TimeoutException:
            return PowerDNSTestResult(
                success=False,
                message=f"Connection timeout after {timeout} seconds"
            )
        except httpx.ConnectError:
            return PowerDNSTestResult(
                success=False,
                message="Cannot connect to PowerDNS server. Check URL and network connectivity."
            )
        except Exception as e:
            logger.error(f"PowerDNS connection test failed: {str(e)}")
            return PowerDNSTestResult(
                success=False,
                message=f"Connection failed: {str(e)}"
            )

    async def get_powerdns_client_config(self, db: AsyncSession) -> Dict[str, Any]:
        """Get PowerDNS client configuration from settings or environment"""
        setting = await self.get_default_powerdns_setting(db)
        
        if setting:
            return {
                'api_url': setting.api_url,
                'api_key': setting.api_key,
                'timeout': setting.timeout,
                'verify_ssl': setting.verify_ssl
            }
        else:
            # Fall back to environment variables
            return {
                'api_url': settings.powerdns_api_url,
                'api_key': settings.powerdns_api_key,
                'timeout': 30,
                'verify_ssl': True
            }


class VersioningSettingsService:
    """Service for managing versioning configuration"""
    
    async def get_versioning_settings(self, db: AsyncSession) -> VersioningSettings:
        """Get versioning settings (creates default if none exist)"""
        result = await db.execute(select(VersioningSettings))
        settings_obj = result.scalar_one_or_none()
        
        if not settings_obj:
            # Create default settings
            settings_obj = VersioningSettings(
                auto_version_enabled=True,
                auto_version_on_record_change=True,
                auto_version_on_zone_change=True,
                max_versions_per_zone=100,
                version_retention_days=90
            )
            db.add(settings_obj)
            await db.commit()
            await db.refresh(settings_obj)
        
        return settings_obj
    
    async def update_versioning_settings(
        self, 
        db: AsyncSession, 
        settings_data: VersioningSettingsUpdate
    ) -> VersioningSettings:
        """Update versioning settings"""
        # Get or create settings
        settings_obj = await self.get_versioning_settings(db)
        
        # Update fields
        update_data = settings_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings_obj, field, value)
        
        await db.commit()
        await db.refresh(settings_obj)
        return settings_obj


# Global instances
settings_service = SettingsService()
powerdns_settings_service = PowerDNSSettingsService()
versioning_settings_service = VersioningSettingsService()
