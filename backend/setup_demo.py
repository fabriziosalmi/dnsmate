#!/usr/bin/env python3
"""Complete demo setup for DNSMate - creates users, zones, and permissions"""

import asyncio
import sys
import os
sys.path.append('/app')
from app.core.database import get_async_session
from app.models.user import User, UserRole
from app.models.dns import Zone, Record
from app.core.auth import get_user_db
from app.services.powerdns import PowerDNSClient
from fastapi_users.password import PasswordHelper
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

# Demo configuration
DEMO_ZONES = [
    {
        "name": "demo-company.com",
        "kind": "Native",
        "description": "Demo company zone - showcases typical corporate DNS setup",
        "records": [
            {"name": "@", "type": "A", "content": "192.168.1.100", "ttl": 3600},
            {"name": "www", "type": "A", "content": "192.168.1.100", "ttl": 3600},
            {"name": "mail", "type": "A", "content": "192.168.1.101", "ttl": 3600},
            {"name": "ftp", "type": "A", "content": "192.168.1.102", "ttl": 3600},
            {"name": "@", "type": "MX", "content": "10 mail.demo-company.com.", "ttl": 3600},
            {"name": "@", "type": "TXT", "content": "\"v=spf1 mx a -all\"", "ttl": 3600},
        ]
    },
    {
        "name": "demo-project.org",
        "kind": "Native", 
        "description": "Demo project zone - shows project/development DNS setup",
        "records": [
            {"name": "@", "type": "A", "content": "10.0.1.50", "ttl": 300},
            {"name": "www", "type": "CNAME", "content": "demo-project.org.", "ttl": 300},
            {"name": "api", "type": "A", "content": "10.0.1.51", "ttl": 300},
            {"name": "staging", "type": "A", "content": "10.0.1.52", "ttl": 300},
            {"name": "dev", "type": "A", "content": "10.0.1.53", "ttl": 300},
        ]
    },
    {
        "name": "demo-testing.net",
        "kind": "Native",
        "description": "Demo testing zone - for experiments and testing",
        "records": [
            {"name": "@", "type": "A", "content": "203.0.113.10", "ttl": 60},
            {"name": "test1", "type": "A", "content": "203.0.113.11", "ttl": 60},
            {"name": "test2", "type": "A", "content": "203.0.113.12", "ttl": 60},
        ]
    }
]

# Permission assignments for demo users
DEMO_PERMISSIONS = [
    # Demo admin gets full access (no specific assignments needed)
    
    # Demo editor gets write access to company and project zones
    {"user_email": "demo.editor@dnsmate.com", "zone": "demo-company.com", "permission": "write"},
    {"user_email": "demo.editor@dnsmate.com", "zone": "demo-project.org", "permission": "write"},
    
    # Demo manager gets write access to project zone only
    {"user_email": "demo.manager@dnsmate.com", "zone": "demo-project.org", "permission": "write"},
    
    # Demo reader gets read access to all zones
    {"user_email": "demo.reader@dnsmate.com", "zone": "demo-company.com", "permission": "read"},
    {"user_email": "demo.reader@dnsmate.com", "zone": "demo-project.org", "permission": "read"},
    {"user_email": "demo.reader@dnsmate.com", "zone": "demo-testing.net", "permission": "read"},
]

async def setup_demo_environment():
    """Set up complete demo environment with users, zones, and permissions"""
    print("🎭 Setting up DNSMate Demo Environment")
    print("=" * 60)
    
    # First create demo users (import from create_demo_users)
    from create_demo_users import create_demo_users
    await create_demo_users()
    
    # Initialize PowerDNS client
    powerdns = PowerDNSClient()
    
    async for session in get_async_session():
        user_db = SQLAlchemyUserDatabase(session, User)
        
        print("\n🌐 Creating demo zones...")
        created_zones = []
        
        for zone_config in DEMO_ZONES:
            zone_name = zone_config["name"]
            
            try:
                # Check if zone already exists in PowerDNS
                try:
                    existing_zone = await powerdns.get_zone(zone_name)
                    print(f"ℹ️  Zone {zone_name} already exists, skipping...")
                    continue
                except:
                    pass  # Zone doesn't exist, proceed to create
                
                # Create zone in PowerDNS
                zone_data = {
                    "name": zone_name,
                    "kind": zone_config["kind"],
                    "nameservers": ["ns1.dnsmate.local.", "ns2.dnsmate.local."]
                }
                
                await powerdns.create_zone(zone_data)
                print(f"✅ Created zone: {zone_name}")
                
                # Add records to the zone
                for record in zone_config["records"]:
                    record_name = record["name"] if record["name"] != "@" else zone_name
                    if record["name"] != "@" and not record["name"].endswith("."):
                        record_name = f"{record['name']}.{zone_name}"
                    
                    record_data = {
                        "name": record_name,
                        "type": record["type"],
                        "content": record["content"],
                        "ttl": record.get("ttl", 3600)
                    }
                    
                    try:
                        await powerdns.create_record(zone_name, record_data)
                        print(f"   📝 Added record: {record_name} {record['type']} {record['content']}")
                    except Exception as e:
                        print(f"   ⚠️  Failed to add record {record_name}: {e}")
                
                created_zones.append(zone_name)
                
            except Exception as e:
                print(f"❌ Error creating zone {zone_name}: {e}")
        
        # Note: Zone permissions would be implemented when the permission system is ready
        print(f"\n📋 Zone permissions will be set up when the permission system is implemented")
        
        break
    
    # Print summary
    print("\n" + "=" * 60)
    print("🎉 Demo Environment Setup Complete!")
    print("=" * 60)
    print(f"✅ Created {len(created_zones)} demo zones:")
    for zone in created_zones:
        print(f"   🌐 {zone}")
    
    print("\n🔑 Demo Login Credentials:")
    print("   👑 Admin:   demo.admin@dnsmate.com   / demo123")
    print("   ✏️  Editor:  demo.editor@dnsmate.com  / demo123") 
    print("   🏢 Manager: demo.manager@dnsmate.com / demo123")
    print("   👁️  Reader:  demo.reader@dnsmate.com  / demo123")
    
    print("\n🎯 Demo Scenarios:")
    print("   1. Login as admin to see full system management")
    print("   2. Login as editor to create/modify zones and records")
    print("   3. Login as manager to see limited zone access")
    print("   4. Login as reader to see read-only interface")
    
    print("\n💡 Next Steps:")
    print("   1. Visit the web interface at http://localhost:3000")
    print("   2. Try logging in with different demo accounts")
    print("   3. Explore zone management and versioning features") 
    print("   4. Test API endpoints with generated tokens")
    print("   5. Admin can delete demo data when done exploring")
    print("=" * 60)

async def cleanup_demo_environment():
    """Clean up demo environment - delete zones and users"""
    print("🧹 Cleaning up demo environment...")
    
    # Delete demo zones from PowerDNS
    powerdns = PowerDNSClient()
    
    for zone_config in DEMO_ZONES:
        zone_name = zone_config["name"]
        try:
            await powerdns.delete_zone(zone_name)
            print(f"✅ Deleted zone: {zone_name}")
        except Exception as e:
            print(f"ℹ️  Zone {zone_name} not found or already deleted")
    
    # Delete demo users
    from create_demo_users import delete_demo_users
    await delete_demo_users()
    
    print("\n🎯 Demo environment cleaned up!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--cleanup":
        asyncio.run(cleanup_demo_environment())
    else:
        asyncio.run(setup_demo_environment())
