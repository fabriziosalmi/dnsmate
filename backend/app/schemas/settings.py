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
    created_at: datetime
    updated_at: datetime
    
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
