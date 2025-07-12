import asyncio
import sys
import os
sys.path.append('/app')
from app.core.database import get_async_session
from app.models.user import User, UserRole
from app.core.auth import get_user_db
from fastapi_users.password import PasswordHelper
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

async def create_admin_user():
    # Get email and password from environment variables or use defaults
    email = os.getenv("ADMIN_EMAIL", "admin@dnsmate.com")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    first_name = os.getenv("ADMIN_FIRST_NAME", "Admin")
    last_name = os.getenv("ADMIN_LAST_NAME", "User")
    
    async for session in get_async_session():
        user_db = SQLAlchemyUserDatabase(session, User)
        password_helper = PasswordHelper()
        
        # Check if user already exists
        existing_user = await user_db.get_by_email(email)
        if existing_user:
            print(f"User {email} already exists!")
            return
        
        # Create user
        hashed_password = password_helper.hash(password)
        user_data = {
            "email": email,
            "hashed_password": hashed_password,
            "first_name": first_name,
            "last_name": last_name,
            "role": UserRole.ADMIN,
            "is_active": True,
            "is_superuser": True,
            "is_verified": True
        }
        
        try:
            user = await user_db.create(user_data)
            print(f"Created admin user: {user.email}")
            print(f"Email: {email}")
            print(f"Password: {password}")
        except Exception as e:
            print(f"Error creating user: {e}")
        break

if __name__ == "__main__":
    asyncio.run(create_admin_user())
