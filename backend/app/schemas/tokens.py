"""API Token schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class APITokenCreate(BaseModel):
    """API Token creation schema"""
    name: str = Field(..., description="Token name for identification")
    description: Optional[str] = Field(None, description="Optional token description")
    expires_at: Optional[datetime] = Field(None, description="Token expiration date (optional)")
    expires_days: Optional[int] = Field(None, description="Token expiration in days from now (alternative to expires_at)")


class APITokenRead(BaseModel):
    """API Token read schema"""
    id: int
    name: str
    description: Optional[str] = None
    token_preview: str  # Only first 8 characters + "..."
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True


class APITokenResponse(BaseModel):
    """API Token response schema with full token (only shown once)"""
    id: int
    name: str
    token: str  # Full token only shown during creation
    description: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


class ZoneVersionCreate(BaseModel):
    """Zone version creation schema"""
    description: Optional[str] = Field(None, description="Version description")
    changes_summary: Optional[str] = Field(None, description="Summary of changes made")
