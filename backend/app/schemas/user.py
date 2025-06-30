"""User schemas"""

from fastapi_users import schemas
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.models.user import UserRole


class UserRead(schemas.BaseUser[int]):
    """User read schema"""
    id: int
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False


class UserCreate(schemas.BaseUserCreate):
    """User create schema"""
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.READER
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    is_verified: Optional[bool] = False


class UserUpdate(schemas.BaseUserUpdate):
    """User update schema"""
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    is_verified: Optional[bool] = None


class ZonePermissionCreate(BaseModel):
    """Zone permission create schema"""
    user_id: int
    zone_name: str
    can_read: bool = True
    can_write: bool = False


class ZonePermissionRead(BaseModel):
    """Zone permission read schema"""
    id: int
    user_id: int
    zone_name: str
    can_read: bool
    can_write: bool
    
    class Config:
        from_attributes = True


class PowerDNSServerCreate(BaseModel):
    """PowerDNS server create schema"""
    name: str
    api_url: str
    api_key: str
    description: Optional[str] = None
    is_active: bool = True


class PowerDNSServerRead(BaseModel):
    """PowerDNS server read schema"""
    id: int
    name: str
    api_url: str
    description: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True
