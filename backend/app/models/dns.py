"""DNS-related models"""

from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Zone(Base):
    """DNS Zone model for caching"""
    __tablename__ = "zones"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False, index=True)
    kind = Column(String, nullable=False)  # Native, Master, Slave
    serial = Column(Integer, nullable=True)
    masters = Column(Text, nullable=True)  # JSON array of master IPs
    account = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # User tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Record(Base):
    """DNS Record model for caching"""
    __tablename__ = "records"
    
    id = Column(Integer, primary_key=True)
    zone_name = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # A, AAAA, CNAME, MX, etc.
    content = Column(Text, nullable=False)
    ttl = Column(Integer, nullable=True)
    priority = Column(Integer, nullable=True)
    disabled = Column(Boolean, default=False, nullable=False)
    
    # User tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
