#!/usr/bin/env python3
"""
Enhanced user creation script for DNSMate
Creates an admin user with specified email and password
"""

import asyncio
import sys
from app.core.database import async_session_maker
from app.models.user import User, UserRole
from passlib.context import CryptContext
from sqlalchemy import select

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user(email: str = "admin@dnsmate.com", password: str = "admin123"):
    """Create an admin user"""
    async with async_session_maker() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"User with email {email} already exists!")
            return existing_user
        
        # Create new admin user
        hashed_password = pwd_context.hash(password)
        
        user = User(
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=True,
            is_verified=True,
            role=UserRole.ADMIN,
            first_name="Admin",
            last_name="User",
            max_zones=None,  # No limit for admin
            max_records_per_zone=None,  # No limit for admin
            max_api_tokens=None  # No limit for admin
        )
        
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        print(f"Admin user created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Role: {user.role}")
        print("Please change the password after first login!")
        
        return user

async def main():
    """Main function"""
    # Default admin user
    email = "admin@dnsmate.com"
    password = "admin123"
    
    # Check if custom email/password provided via command line
    if len(sys.argv) > 1:
        email = sys.argv[1]
    if len(sys.argv) > 2:
        password = sys.argv[2]
    
    print(f"Creating admin user with email: {email}")
    await create_admin_user(email, password)
    
    # Also create the user with fabrizio.salmi@gmail.com if it's the default run
    if email == "admin@dnsmate.com":
        print("\nCreating additional admin user with fabrizio.salmi@gmail.com...")
        await create_admin_user("fabrizio.salmi@gmail.com", "admin123")

if __name__ == "__main__":
    asyncio.run(main())
