"""Audit logging models and service"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, DateTime, JSON, Text, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
import enum
import json

from app.core.database import Base
from app.models.user import User


class AuditEventType(enum.Enum):
    """Types of audit events"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_SUCCESS = "password_reset_success"
    
    # User management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ROLE_CHANGED = "user_role_changed"
    USER_PERMISSION_GRANTED = "user_permission_granted"
    USER_PERMISSION_REVOKED = "user_permission_revoked"
    
    # Zone management
    ZONE_CREATED = "zone_created"
    ZONE_UPDATED = "zone_updated"
    ZONE_DELETED = "zone_deleted"
    
    # Record management
    RECORD_CREATED = "record_created"
    RECORD_UPDATED = "record_updated"
    RECORD_DELETED = "record_deleted"
    
    # API tokens
    API_TOKEN_CREATED = "api_token_created"
    API_TOKEN_USED = "api_token_used"
    API_TOKEN_DELETED = "api_token_deleted"
    API_TOKEN_DEACTIVATED = "api_token_deactivated"
    
    # Security events
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    
    # System events
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"
    VERSION_CREATED = "version_created"
    VERSION_ROLLBACK = "version_rollback"


class AuditLog(Base):
    """Audit log entry"""
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Event information
    event_type: Mapped[AuditEventType] = mapped_column(SQLEnum(AuditEventType), nullable=False, index=True)
    event_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # User information
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("user.id"), nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Store email for deleted users
    user_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv4/IPv6
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Resource information
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)  # zone, record, user, etc.
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    resource_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Additional context
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    
    # Success/failure status
    success: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    user: Mapped[Optional[User]] = relationship("User", back_populates="audit_logs")


class AuditService:
    """Service for audit logging"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def log_event(
        self,
        event_type: AuditEventType,
        description: str,
        user: Optional[User] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> AuditLog:
        """Log an audit event"""
        
        # Extract user information if user object provided
        if user:
            user_id = user.id
            user_email = user.email
        
        audit_entry = AuditLog(
            event_type=event_type,
            event_description=description,
            user_id=user_id,
            user_email=user_email,
            user_ip=user_ip,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            metadata=metadata,
            success=success,
            error_message=error_message
        )
        
        self.session.add(audit_entry)
        await self.session.commit()
        await self.session.refresh(audit_entry)
        
        return audit_entry
    
    async def log_authentication_event(
        self,
        event_type: AuditEventType,
        user_email: str,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log authentication-related events"""
        
        description = f"Authentication event: {event_type.value} for {user_email}"
        
        return await self.log_event(
            event_type=event_type,
            description=description,
            user_email=user_email,
            user_ip=user_ip,
            user_agent=user_agent,
            resource_type="authentication",
            success=success,
            error_message=error_message,
            metadata=metadata
        )
    
    async def log_zone_event(
        self,
        event_type: AuditEventType,
        zone_name: str,
        user: User,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log zone-related events"""
        
        description = f"Zone {event_type.value}: {zone_name} by {user.email}"
        
        return await self.log_event(
            event_type=event_type,
            description=description,
            user=user,
            user_ip=user_ip,
            user_agent=user_agent,
            resource_type="zone",
            resource_id=zone_name,
            resource_name=zone_name,
            metadata=metadata
        )
    
    async def log_record_event(
        self,
        event_type: AuditEventType,
        zone_name: str,
        record_name: str,
        record_type: str,
        user: User,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log DNS record-related events"""
        
        description = f"Record {event_type.value}: {record_name} ({record_type}) in {zone_name} by {user.email}"
        
        return await self.log_event(
            event_type=event_type,
            description=description,
            user=user,
            user_ip=user_ip,
            user_agent=user_agent,
            resource_type="record",
            resource_id=f"{zone_name}:{record_name}:{record_type}",
            resource_name=f"{record_name}.{zone_name}",
            metadata=metadata
        )
    
    async def log_security_event(
        self,
        event_type: AuditEventType,
        description: str,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        user_email: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Log security-related events"""
        
        return await self.log_event(
            event_type=event_type,
            description=description,
            user_email=user_email,
            user_ip=user_ip,
            user_agent=user_agent,
            resource_type="security",
            success=False,  # Security events are typically failures
            metadata=metadata
        )
