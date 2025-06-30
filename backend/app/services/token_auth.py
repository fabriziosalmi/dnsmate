"""API Token authentication service"""

import hashlib
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import func
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.database import get_async_session
from app.models.user import APIToken, User

security = HTTPBearer(auto_error=False)


async def verify_api_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_async_session)
) -> Optional[User]:
    """Verify API token and return associated user"""
    if not credentials:
        return None
    
    token = credentials.credentials
    if not token.startswith("dnsmate_"):
        return None
    
    # Hash the token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Find token in database
    result = await session.execute(
        select(APIToken)
        .join(User)
        .where(
            APIToken.token_hash == token_hash,
            APIToken.is_active == True,
            User.is_active == True
        )
    )
    api_token = result.scalar_one_or_none()
    
    if not api_token:
        return None
    
    # Check if token is expired
    if api_token.expires_at and api_token.expires_at < func.now():
        return None
    
    # Update last used timestamp
    api_token.last_used_at = func.now()
    await session.commit()
    
    return api_token.user


async def get_current_api_user(
    user: Optional[User] = Depends(verify_api_token)
) -> User:
    """Get current user from API token, raise exception if not authenticated"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
