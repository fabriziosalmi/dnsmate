"""User models and authentication setup"""

import secrets
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from sqlalchemy import String, Boolean, Integer, ForeignKey, Text, Enum as SQLEnum, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum

if TYPE_CHECKING:
    from app.models.audit import AuditLog


class UserRole(enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    EDITOR = "editor"
    READER = "reader"


class User(SQLAlchemyBaseUserTable[int], Base):
    """User model"""
    __tablename__ = "users"
    
    # Primary key - explicitly defined for clarity with SQLAlchemy 2.0
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Additional fields
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.READER, nullable=False)
    
    # Limits
    max_zones: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    max_records_per_zone: Mapped[int] = mapped_column(Integer, default=5000, nullable=False)
    max_api_tokens: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    zone_permissions: Mapped[list["ZonePermission"]] = relationship("ZonePermission", back_populates="user", cascade="all, delete-orphan")
    api_tokens: Mapped[list["APIToken"]] = relationship("APIToken", back_populates="user", cascade="all, delete-orphan")
    zone_versions: Mapped[list["ZoneVersion"]] = relationship("ZoneVersion", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class ZonePermission(Base):
    """Zone permissions for users"""
    __tablename__ = "zone_permissions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    zone_name: Mapped[str] = mapped_column(String, nullable=False)
    can_read: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_write: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="zone_permissions")


class PowerDNSServer(Base):
    """PowerDNS server configuration"""
    __tablename__ = "powerdns_servers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    api_url: Mapped[str] = mapped_column(String, nullable=False)
    api_key: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class APIToken(Base):
    """API Token model for programmatic access"""
    __tablename__ = "api_tokens"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    token_preview: Mapped[str] = mapped_column(String, nullable=False)  # First 8 chars + "..."
    
    # Token management
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="api_tokens")
    
    @classmethod
    def generate_token(cls) -> str:
        """Generate a new API token"""
        return f"dnsmate_{secrets.token_urlsafe(32)}"
    
    def set_token(self, token: str):
        """Set token hash and preview"""
        import hashlib
        self.token_hash = hashlib.sha256(token.encode()).hexdigest()
        self.token_preview = token[:8] + "..."


class ZoneVersion(Base):
    """Zone version for configuration rollback"""
    __tablename__ = "zone_versions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Version data
    zone_data: Mapped[dict] = mapped_column(JSON, nullable=False)  # Full zone configuration
    records_data: Mapped[dict] = mapped_column(JSON, nullable=False)  # All records at this version
    
    # Metadata
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    changes_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="zone_versions")
