"""Security-related API routes"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.auth import current_active_user
from app.models.user import User
from app.services.email import EmailService
from app.services.password_policy import PasswordPolicy
from app.models.audit import AuditService, AuditEventType
from app.schemas.user import UserUpdate
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/security", tags=["security"])

# Request/Response schemas
class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class PasswordResetRequest(BaseModel):
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')

class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

class PasswordStrengthRequest(BaseModel):
    password: str

class PasswordStrengthResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Password strength score (0-100)")
    description: str = Field(..., description="Human-readable strength description")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for improvement")

class SecurityEvent(BaseModel):
    id: int
    event_type: str
    description: str
    user_ip: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    success: bool

class TwoFactorSetup(BaseModel):
    enabled: bool
    secret: Optional[str] = None
    qr_code: Optional[str] = None
    backup_codes: Optional[List[str]] = None

class TwoFactorCode(BaseModel):
    code: str = Field(..., pattern=r'^\d{6}$')


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    http_request: Request,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Change user password"""
    try:
        # Verify current password
        from app.core.auth import pwd_context
        if not pwd_context.verify(request.current_password, current_user.hashed_password):
            # Log failed attempt
            audit_service = AuditService(session)
            await audit_service.log_event(
                event_type=AuditEventType.PASSWORD_CHANGE,
                description="Password change failed: incorrect current password",
                user_id=current_user.id,
                user_email=current_user.email,
                user_ip=getattr(http_request.client, 'host', None),
                user_agent=http_request.headers.get('User-Agent'),
                success=False
            )
            raise HTTPException(status_code=400, detail="Incorrect current password")

        # Validate new password
        password_policy = PasswordPolicy()
        validation = password_policy.validate_password(request.new_password)
        if not validation.is_valid:
            raise HTTPException(
                status_code=400, 
                detail=f"Password does not meet requirements: {', '.join(validation.errors)}"
            )

        # Update password
        current_user.hashed_password = pwd_context.hash(request.new_password)
        await session.commit()

        # Log successful change
        audit_service = AuditService(session)
        await audit_service.log_event(
            event_type=AuditEventType.PASSWORD_CHANGE,
            description="Password changed successfully",
            user_id=current_user.id,
            user_email=current_user.email,
            user_ip=getattr(http_request.client, 'host', None),
            user_agent=http_request.headers.get('User-Agent'),
            success=True
        )

        # Send security notification email
        try:
            email_service = EmailService()
            await email_service.send_security_alert(
                current_user.email,
                "Password Changed",
                "Your DNSMate password has been changed successfully."
            )
        except Exception as e:
            logger.warning(f"Failed to send password change notification: {e}")

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(status_code=500, detail="Failed to change password")


@router.post("/password-strength", response_model=PasswordStrengthResponse)
async def check_password_strength(request: PasswordStrengthRequest):
    """Check password strength"""
    password_policy = PasswordPolicy()
    strength = password_policy.calculate_strength(request.password)
    
    return PasswordStrengthResponse(
        score=strength.score,
        description=strength.description,
        suggestions=strength.suggestions
    )


@router.post("/reset-password")
async def request_password_reset(
    request: PasswordResetRequest,
    http_request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Request password reset"""
    try:
        # Find user by email
        from sqlalchemy import select
        result = await session.execute(select(User).filter(User.email == request.email))
        user = result.scalar_one_or_none()

        # Always return success to prevent email enumeration
        audit_service = AuditService(session)
        
        if user:
            # Generate reset token
            import secrets
            token = secrets.token_urlsafe(32)
            
            # Store token (in production, store this in database with expiration)
            # For now, we'll use a simple in-memory store
            from app.core.config import settings
            # TODO: Implement proper token storage with Redis or database
            
            # Send reset email
            email_service = EmailService()
            reset_url = f"{settings.frontend_url}/reset-password?token={token}"
            await email_service.send_password_reset(user.email, reset_url)
            
            # Log successful request
            await audit_service.log_event(
                event_type=AuditEventType.PASSWORD_RESET_REQUEST,
                description=f"Password reset requested for {user.email}",
                user_id=user.id,
                user_email=user.email,
                user_ip=getattr(http_request.client, 'host', None),
                user_agent=http_request.headers.get('User-Agent'),
                success=True
            )
        else:
            # Log failed attempt
            await audit_service.log_event(
                event_type=AuditEventType.PASSWORD_RESET_REQUEST,
                description=f"Password reset requested for non-existent email: {request.email}",
                user_email=request.email,
                user_ip=getattr(http_request.client, 'host', None),
                user_agent=http_request.headers.get('User-Agent'),
                success=False
            )

        return {"message": "If the email exists, a reset link has been sent"}

    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process password reset request")


@router.get("/events", response_model=List[SecurityEvent])
async def get_security_events(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get security events for current user"""
    try:
        audit_service = AuditService(session)
        events = await audit_service.get_user_events(
            user_id=current_user.id,
            limit=limit,
            offset=offset
        )
        
        return [
            SecurityEvent(
                id=event.id,
                event_type=event.event_type.value,
                description=event.event_description,
                user_ip=event.user_ip,
                user_agent=event.user_agent,
                created_at=event.created_at,
                success=event.success
            )
            for event in events
        ]

    except Exception as e:
        logger.error(f"Failed to get security events: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve security events")


@router.get("/2fa", response_model=TwoFactorSetup)
async def get_2fa_settings(
    current_user: User = Depends(current_active_user)
):
    """Get two-factor authentication settings"""
    # TODO: Implement 2FA settings storage in User model or separate table
    return TwoFactorSetup(enabled=False)


@router.post("/2fa/enable", response_model=TwoFactorSetup)
async def enable_2fa(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Enable two-factor authentication"""
    try:
        # TODO: Implement 2FA setup
        # 1. Generate secret key
        # 2. Create QR code
        # 3. Store secret temporarily (pending confirmation)
        # 4. Return setup data
        
        import pyotp
        import qrcode
        import io
        import base64
        
        # Generate secret
        secret = pyotp.random_base32()
        
        # Create TOTP instance
        totp = pyotp.TOTP(secret)
        
        # Generate QR code
        provisioning_uri = totp.provisioning_uri(
            name=current_user.email,
            issuer_name="DNSMate"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        # TODO: Store secret temporarily for confirmation
        
        return TwoFactorSetup(
            enabled=False,
            secret=secret,
            qr_code=f"data:image/png;base64,{qr_code_data}"
        )

    except Exception as e:
        logger.error(f"Failed to enable 2FA: {e}")
        raise HTTPException(status_code=500, detail="Failed to enable two-factor authentication")


@router.post("/2fa/confirm")
async def confirm_2fa(
    request: TwoFactorCode,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Confirm two-factor authentication setup"""
    try:
        # TODO: Implement 2FA confirmation
        # 1. Verify the provided code against the stored secret
        # 2. If valid, enable 2FA for the user
        # 3. Generate backup codes
        # 4. Clear temporary secret storage
        
        return {"message": "Two-factor authentication enabled successfully"}

    except Exception as e:
        logger.error(f"Failed to confirm 2FA: {e}")
        raise HTTPException(status_code=500, detail="Failed to confirm two-factor authentication")


@router.post("/2fa/disable")
async def disable_2fa(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Disable two-factor authentication"""
    try:
        # TODO: Implement 2FA disable
        # 1. Remove 2FA secret from user
        # 2. Disable 2FA flag
        # 3. Log the action
        
        audit_service = AuditService(session)
        await audit_service.log_event(
            event_type=AuditEventType.USER_UPDATED,
            description="Two-factor authentication disabled",
            user_id=current_user.id,
            user_email=current_user.email,
            resource_type="user",
            resource_id=str(current_user.id),
            success=True
        )

        return {"message": "Two-factor authentication disabled successfully"}

    except Exception as e:
        logger.error(f"Failed to disable 2FA: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable two-factor authentication")
