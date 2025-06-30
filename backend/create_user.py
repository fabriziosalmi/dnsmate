import asyncio
import sys
sys.path.append('/app')
from app.core.database import get_async_session
from app.models.user import User, UserRole
from app.core.auth import get_user_db
from fastapi_users.password import PasswordHelper
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

async def create_admin_user():
    async for session in get_async_session():
        user_db = SQLAlchemyUserDatabase(session, User)
        password_helper = PasswordHelper()
        
        # Check if user already exists
        existing_user = await user_db.get_by_email("admin@dnsmate.com")
        if existing_user:
            print("Admin user already exists!")
            return
        
        # Create user
        hashed_password = password_helper.hash("admin123")
        user_data = {
            "email": "admin@dnsmate.com",
            "hashed_password": hashed_password,
            "first_name": "Admin",
            "last_name": "User",
            "role": UserRole.ADMIN,
            "is_active": True,
            "is_superuser": True,
            "is_verified": True
        }
        
        try:
            user = await user_db.create(user_data)
            print(f"Created admin user: {user.email}")
        except Exception as e:
            print(f"Error creating user: {e}")
        break

if __name__ == "__main__":
    asyncio.run(create_admin_user())
