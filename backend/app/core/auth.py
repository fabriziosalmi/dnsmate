"""Authentication setup with FastAPI-Users"""

from fastapi import Depends, Request
from fastapi_users import FastAPIUsers, BaseUserManager
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator, Optional

from app.models.user import User
from app.core.config import settings
from app.core.database import get_async_session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database instance"""
    yield SQLAlchemyUserDatabase(session, User)


class UserManager(BaseUserManager[User, int]):
    """User manager for handling user operations"""
    reset_password_token_secret = settings.reset_password_token_secret
    verification_token_secret = settings.verification_token_secret

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        """Called after user registration"""
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after forgot password request"""
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after verification request"""
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    def parse_id(self, value) -> int:
        """Parse the user ID from a string value"""
        try:
            return int(value)
        except ValueError:
            raise ValueError("Invalid user ID")


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """Get user manager instance"""
    yield UserManager(user_db)


# JWT Bearer transport
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    """Get JWT strategy"""
    return JWTStrategy(secret=settings.jwt_secret, lifetime_seconds=3600)


# Authentication backend
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])

# Current user dependencies
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
