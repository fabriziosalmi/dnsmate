"""Settings models for DNSMate"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.core.database import Base

class SystemSettings(Base):
    """System-wide settings model"""
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False, default="general")
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SystemSettings(key='{self.key}', category='{self.category}')>"

class PowerDNSSettings(Base):
    """PowerDNS connection settings model"""
    __tablename__ = "powerdns_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Friendly name for the PowerDNS instance
    api_url = Column(String(255), nullable=False)
    api_key = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    timeout = Column(Integer, default=30)  # API timeout in seconds
    verify_ssl = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PowerDNSSettings(name='{self.name}', api_url='{self.api_url}')>"
