"""User management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.auth import current_active_user, current_superuser
from app.core.database import get_async_session
from app.models.user import User, ZonePermission, UserRole
from app.schemas.user import UserRead, UserUpdate, ZonePermissionCreate, ZonePermissionRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(current_active_user)):
    """Get current user information"""
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_users_me(
    user_update: UserUpdate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update current user information"""
    update_data = user_update.dict(exclude_unset=True)
    
    # Users can't change their own role or superuser status
    update_data.pop("role", None)
    update_data.pop("is_superuser", None)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.get("/", response_model=List[UserRead])
async def read_users(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_superuser)
):
    """Get all users (admin only)"""
    result = await session.execute(select(User))
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_superuser)
):
    """Update user (admin only)"""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_superuser)
):
    """Delete user (admin only)"""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await session.delete(user)
    await session.commit()
    return {"message": "User deleted successfully"}


@router.get("/{user_id}/permissions", response_model=List[ZonePermissionRead])
async def get_user_permissions(
    user_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get user zone permissions"""
    # Users can only view their own permissions unless they're admin
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await session.execute(
        select(ZonePermission).where(ZonePermission.user_id == user_id)
    )
    return result.scalars().all()


@router.post("/{user_id}/permissions", response_model=ZonePermissionRead)
async def create_user_permission(
    user_id: int,
    permission: ZonePermissionCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_superuser)
):
    """Create zone permission for user (admin only)"""
    permission.user_id = user_id
    db_permission = ZonePermission(**permission.dict())
    session.add(db_permission)
    await session.commit()
    await session.refresh(db_permission)
    return db_permission


@router.delete("/{user_id}/permissions/{permission_id}")
async def delete_user_permission(
    user_id: int,
    permission_id: int,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_superuser)
):
    """Delete zone permission (admin only)"""
    result = await session.execute(
        select(ZonePermission).where(
            ZonePermission.id == permission_id,
            ZonePermission.user_id == user_id
        )
    )
    permission = result.scalar_one_or_none()
    
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    await session.delete(permission)
    await session.commit()
    return {"message": "Permission deleted successfully"}
