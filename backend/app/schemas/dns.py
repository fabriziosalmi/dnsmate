"""DNS schemas for API requests and responses"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

from app.schemas.user import UserRead


class ZoneCreate(BaseModel):
    """Zone creation schema"""
    name: str = Field(..., description="Zone name (e.g., example.com)")
    kind: str = Field(default="Native", description="Zone type: Native, Master, or Slave")
    masters: Optional[List[str]] = Field(None, description="Master servers for slave zones")
    account: Optional[str] = Field(None, description="Account identifier")
    
    @validator('name')
    def validate_zone_name(cls, v):
        if not v.endswith('.'):
            v = v + '.'
        return v.lower()
    
    @validator('kind')
    def validate_kind(cls, v):
        if v not in ['Native', 'Master', 'Slave']:
            raise ValueError('Kind must be Native, Master, or Slave')
        return v


class ZoneRead(BaseModel):
    """Zone read schema"""
    id: Optional[int] = None
    name: str
    kind: str
    serial: Optional[int] = None
    masters: Optional[List[str]] = None
    account: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RecordCreate(BaseModel):
    """Record creation schema"""
    name: str = Field(..., description="Record name")
    type: str = Field(..., description="Record type (A, AAAA, CNAME, MX, etc.)")
    content: str = Field(..., description="Record content")
    ttl: Optional[int] = Field(300, description="Time to live in seconds")
    priority: Optional[int] = Field(None, description="Priority for MX/SRV records")
    disabled: bool = Field(False, description="Whether the record is disabled")
    
    @validator('type')
    def validate_record_type(cls, v):
        valid_types = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT', 'CAA']
        if v.upper() not in valid_types:
            raise ValueError(f'Record type must be one of: {", ".join(valid_types)}')
        return v.upper()
    
    @validator('ttl')
    def validate_ttl(cls, v):
        if v is not None and (v < 1 or v > 86400):
            raise ValueError('TTL must be between 1 and 86400 seconds')
        return v
    
    @validator('content')
    def validate_content(cls, v, values):
        """Validate content based on record type"""
        if 'type' not in values:
            return v
            
        record_type = values['type'].upper()
        content = v.strip()
        
        if record_type == 'A':
            # Basic IPv4 validation
            parts = content.split('.')
            if len(parts) != 4:
                raise ValueError('A record must be a valid IPv4 address')
            try:
                for part in parts:
                    num = int(part)
                    if not 0 <= num <= 255:
                        raise ValueError('A record must be a valid IPv4 address')
            except ValueError:
                raise ValueError('A record must be a valid IPv4 address')
        
        elif record_type == 'AAAA':
            # Basic IPv6 validation (simplified)
            if ':' not in content:
                raise ValueError('AAAA record must be a valid IPv6 address')
        
        elif record_type == 'MX':
            # MX records content should be just the hostname (priority handled separately)
            if not content:
                raise ValueError('MX record content cannot be empty')
            # If content contains priority, extract just the hostname
            parts = content.split()
            if len(parts) > 1 and parts[0].isdigit():
                # Content includes priority, extract hostname
                return ' '.join(parts[1:])
        
        elif record_type == 'CNAME':
            if not content:
                raise ValueError('CNAME record content cannot be empty')
        
        elif record_type == 'SRV':
            # SRV content can be priority weight port target or just weight port target
            if not content:
                raise ValueError('SRV record content cannot be empty')
                
        return content
    
    @validator('priority')
    def validate_priority(cls, v, values):
        """Validate priority for record types that require it"""
        if 'type' not in values:
            return v
            
        record_type = values['type'].upper()
        
        if record_type in ['MX', 'SRV'] and v is None:
            raise ValueError(f'{record_type} records require a priority value')
        
        if v is not None and (v < 0 or v > 65535):
            raise ValueError('Priority must be between 0 and 65535')
            
        return v


class RecordUpdate(BaseModel):
    """Record update schema"""
    content: Optional[str] = None
    ttl: Optional[int] = None
    priority: Optional[int] = None
    disabled: Optional[bool] = None
    
    @validator('ttl')
    def validate_ttl(cls, v):
        if v is not None and (v < 1 or v > 86400):
            raise ValueError('TTL must be between 1 and 86400 seconds')
        return v


class RecordRead(BaseModel):
    """Record read schema"""
    id: Optional[int] = None
    zone_name: str
    name: str
    type: str
    content: str
    ttl: Optional[int] = None
    priority: Optional[int] = None
    disabled: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ZoneVersionRead(BaseModel):
    """Zone version read schema"""
    id: int
    zone_name: str
    version_number: int
    user_id: int
    user: UserRead
    description: Optional[str] = None
    changes_summary: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ZoneBackupRead(BaseModel):
    """Zone backup read schema"""
    zone_name: str
    backup_format: str = "bind"
    content: str
    generated_at: datetime
