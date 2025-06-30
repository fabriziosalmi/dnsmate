"""API Token management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta

from app.core.auth import current_active_user
from app.core.database import get_async_session
from app.models.user import User, APIToken
from app.schemas.tokens import APITokenCreate, APITokenRead, APITokenResponse

router = APIRouter()


@router.get("/", response_model=List[APITokenRead])
async def list_api_tokens(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List user's API tokens"""
    result = await session.execute(
        select(APIToken)
        .where(APIToken.user_id == current_user.id)
        .order_by(APIToken.created_at.desc())
    )
    tokens = result.scalars().all()
    
    return [
        APITokenRead(
            id=token.id,
            name=token.name,
            description=token.description,
            token_preview=token.token_preview,
            created_at=token.created_at,
            last_used_at=token.last_used_at,
            expires_at=token.expires_at,
            is_active=token.is_active
        )
        for token in tokens
    ]


@router.post("/", response_model=APITokenResponse)
async def create_api_token(
    token_data: APITokenCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new API token"""
    
    # Check token limit
    result = await session.execute(
        select(func.count(APIToken.id))
        .where(
            APIToken.user_id == current_user.id,
            APIToken.is_active == True
        )
    )
    token_count = result.scalar()
    
    if token_count >= current_user.max_api_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of API tokens ({current_user.max_api_tokens}) reached"
        )
    
    # Generate new token
    token_value = APIToken.generate_token()
    
    # Calculate expiration date
    expires_at = None
    if token_data.expires_at:
        expires_at = token_data.expires_at
    elif token_data.expires_days:
        expires_at = datetime.utcnow() + timedelta(days=token_data.expires_days)
    
    # Create token record
    api_token = APIToken(
        user_id=current_user.id,
        name=token_data.name,
        description=token_data.description,
        expires_at=expires_at
    )
    api_token.set_token(token_value)
    
    session.add(api_token)
    await session.commit()
    await session.refresh(api_token)
    
    return APITokenResponse(
        id=api_token.id,
        name=api_token.name,
        token=token_value,  # Only shown once during creation
        description=api_token.description,
        created_at=api_token.created_at,
        expires_at=api_token.expires_at
    )


@router.get("/{token_id}", response_model=APITokenRead)
async def get_api_token(
    token_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific API token details"""
    result = await session.execute(
        select(APIToken)
        .where(
            APIToken.id == token_id,
            APIToken.user_id == current_user.id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API token not found"
        )
    
    return APITokenRead(
        id=token.id,
        name=token.name,
        description=token.description,
        token_preview=token.token_preview,
        created_at=token.created_at,
        last_used_at=token.last_used_at,
        expires_at=token.expires_at,
        is_active=token.is_active
    )


@router.patch("/{token_id}", response_model=APITokenRead)
async def update_api_token(
    token_id: int,
    updates: dict,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update API token (name, description, active status)"""
    result = await session.execute(
        select(APIToken)
        .where(
            APIToken.id == token_id,
            APIToken.user_id == current_user.id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API token not found"
        )
    
    # Update allowed fields
    allowed_fields = {'name', 'description', 'is_active'}
    for field, value in updates.items():
        if field in allowed_fields:
            setattr(token, field, value)
    
    await session.commit()
    await session.refresh(token)
    
    return APITokenRead(
        id=token.id,
        name=token.name,
        description=token.description,
        token_preview=token.token_preview,
        created_at=token.created_at,
        last_used_at=token.last_used_at,
        expires_at=token.expires_at,
        is_active=token.is_active
    )


@router.delete("/{token_id}")
async def delete_api_token(
    token_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete an API token"""
    result = await session.execute(
        select(APIToken)
        .where(
            APIToken.id == token_id,
            APIToken.user_id == current_user.id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API token not found"
        )
    
    await session.delete(token)
    await session.commit()
    
    return {"message": "API token deleted successfully"}
