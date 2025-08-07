"""Settings schemas for DNSMate"""

from pydantic import BaseModel, validator, Field
from typing import Optional, List
from datetime import datetime

class SystemSettingBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: Optional[str] = None
    description: Optional[str] = Field(None, max_length=255)
    category: str = Field(default="general", max_length=50)
    is_encrypted: bool = False

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=50)

class SystemSetting(SystemSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PowerDNSSettingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    api_url: str = Field(..., min_length=1, max_length=255)
    api_key: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    timeout: int = Field(default=30, ge=5, le=300)  # 5-300 seconds
    verify_ssl: bool = True
    multi_server_mode: bool = Field(default=False, description="Enable multi-server operations")

class PowerDNSSettingCreate(PowerDNSSettingBase):
    @validator('api_url')
    def validate_api_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('API URL must start with http:// or https://')
        return v

class PowerDNSSettingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    api_url: Optional[str] = Field(None, min_length=1, max_length=255)
    api_key: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    timeout: Optional[int] = Field(None, ge=5, le=300)
    verify_ssl: Optional[bool] = None
    multi_server_mode: Optional[bool] = None

    @validator('api_url')
    def validate_api_url(cls, v):
        if v is not None and not v.startswith(('http://', 'https://')):
            raise ValueError('API URL must start with http:// or https://')
        return v

class PowerDNSSetting(PowerDNSSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PowerDNSSettingPublic(BaseModel):
    """Public view of PowerDNS settings without sensitive data"""
    id: int
    name: str
    api_url: str
    description: Optional[str]
    is_default: bool
    is_active: bool
    timeout: int
    verify_ssl: bool
    multi_server_mode: bool
    created_at: datetime
    updated_at: datetime
    # Real-time health status
    health_status: Optional[str] = None  # "healthy", "unhealthy", "unknown"
    last_health_check: Optional[datetime] = None
    health_response_time_ms: Optional[float] = None
    
    class Config:
        from_attributes = True

class PowerDNSTestConnection(BaseModel):
    """Schema for testing PowerDNS connection"""
    api_url: str = Field(..., min_length=1, max_length=255)
    api_key: str = Field(..., min_length=1, max_length=255)
    timeout: int = Field(default=30, ge=5, le=300)
    verify_ssl: bool = True

    @validator('api_url')
    def validate_api_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('API URL must start with http:// or https://')
        return v

class PowerDNSTestResult(BaseModel):
    """Result of PowerDNS connection test"""
    success: bool
    message: str
    response_time_ms: Optional[float] = None
    server_version: Optional[str] = None
    zones_count: Optional[int] = None


class PowerDNSHealthStatus(BaseModel):
    """Real-time health status for a PowerDNS server"""
    server_id: int
    name: str
    api_url: str
    is_active: bool
    health_status: str  # "healthy", "unhealthy", "unknown", "checking"
    last_checked: Optional[datetime] = None
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    server_version: Optional[str] = None
    zones_count: Optional[int] = None


class PowerDNSHealthSummary(BaseModel):
    """Summary of all PowerDNS servers health"""
    total_servers: int
    healthy_servers: int
    unhealthy_servers: int
    unknown_servers: int
    last_check_time: datetime
    servers: List[PowerDNSHealthStatus]


class VersioningSettingsBase(BaseModel):
    auto_version_enabled: bool = True
    auto_version_on_record_change: bool = True
    auto_version_on_zone_change: bool = True
    max_versions_per_zone: int = Field(default=100, ge=10, le=500)
    version_retention_days: int = Field(default=90, ge=7, le=365)


class VersioningSettingsCreate(VersioningSettingsBase):
    pass


class VersioningSettingsUpdate(BaseModel):
    auto_version_enabled: Optional[bool] = None
    auto_version_on_record_change: Optional[bool] = None
    auto_version_on_zone_change: Optional[bool] = None
    max_versions_per_zone: Optional[int] = Field(None, ge=10, le=500)
    version_retention_days: Optional[int] = Field(None, ge=7, le=365)


class VersioningSettings(VersioningSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
