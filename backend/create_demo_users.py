#!/usr/bin/env python3
"""Create demo users for showcasing DNSMate features"""

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

# Demo users configuration
DEMO_USERS = [
    {
        "email": "demo.admin@dnsmate.com",
        "password": "demo123",
        "first_name": "Demo",
        "last_name": "Administrator",
        "role": UserRole.ADMIN,
        "description": "Full admin access - can manage users, zones, and settings"
    },
    {
        "email": "demo.editor@dnsmate.com", 
        "password": "demo123",
        "first_name": "Demo",
        "last_name": "Editor",
        "role": UserRole.EDITOR,
        "description": "Zone editor - can create and modify DNS zones and records"
    },
    {
        "email": "demo.reader@dnsmate.com",
        "password": "demo123", 
        "first_name": "Demo",
        "last_name": "Reader",
        "role": UserRole.READER,
        "description": "Read-only access - can view zones and records but not modify"
    },
    {
        "email": "demo.manager@dnsmate.com",
        "password": "demo123",
        "first_name": "Demo", 
        "last_name": "Manager",
        "role": UserRole.EDITOR,
        "description": "Zone manager - can manage specific zones assigned to them"
    }
]

async def create_demo_users():
    """Create demo users for showcasing DNSMate features"""
    print("🎭 Creating demo users for DNSMate...")
    print("=" * 50)
    
    async for session in get_async_session():
        user_db = SQLAlchemyUserDatabase(session, User)
        password_helper = PasswordHelper()
        
        created_users = []
        existing_users = []
        
        for user_config in DEMO_USERS:
            email = user_config["email"]
            
            # Check if user already exists
            existing_user = await user_db.get_by_email(email)
            if existing_user:
                existing_users.append(email)
                continue
            
            # Create user
            hashed_password = password_helper.hash(user_config["password"])
            user_data = {
                "email": email,
                "hashed_password": hashed_password,
                "first_name": user_config["first_name"],
                "last_name": user_config["last_name"],
                "role": user_config["role"],
                "is_active": True,
                "is_superuser": user_config["role"] == UserRole.ADMIN,
                "is_verified": True
            }
            
            try:
                user = await user_db.create(user_data)
                created_users.append({
                    "email": email,
                    "role": user_config["role"].value,
                    "description": user_config["description"]
                })
                print(f"✅ Created: {email} ({user_config['role'].value})")
            except Exception as e:
                print(f"❌ Error creating {email}: {e}")
        
        break
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 Demo Users Summary")
    print("=" * 50)
    
    if created_users:
        print(f"✅ Created {len(created_users)} demo users:")
        for user in created_users:
            print(f"   👤 {user['email']}")
            print(f"      Role: {user['role']}")
            print(f"      Description: {user['description']}")
            print()
    
    if existing_users:
        print(f"ℹ️  {len(existing_users)} demo users already existed:")
        for email in existing_users:
            print(f"   👤 {email}")
        print()
    
    print("🔑 All demo users use password: demo123")
    print()
    print("🎯 Demo User Roles:")
    print("   👑 Admin: Full system access, user management, settings")
    print("   ✏️  Editor: Create/edit zones and records") 
    print("   👁️  Reader: View-only access to zones and records")
    print("   🏢 Manager: Zone-specific management permissions")
    print()
    print("💡 Tip: Admin users can delete demo users after exploring features")
    print("=" * 50)

async def delete_demo_users():
    """Delete all demo users"""
    print("🗑️  Deleting demo users...")
    
    async for session in get_async_session():
        user_db = SQLAlchemyUserDatabase(session, User)
        
        deleted_count = 0
        for user_config in DEMO_USERS:
            email = user_config["email"]
            existing_user = await user_db.get_by_email(email)
            if existing_user:
                try:
                    await user_db.delete(existing_user)
                    deleted_count += 1
                    print(f"✅ Deleted: {email}")
                except Exception as e:
                    print(f"❌ Error deleting {email}: {e}")
        
        break
    
    print(f"\n🎯 Deleted {deleted_count} demo users")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--delete":
        asyncio.run(delete_demo_users())
    else:
        asyncio.run(create_demo_users())
