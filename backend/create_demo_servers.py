#!/usr/bin/env python3
"""Create demo PowerDNS server configurations to test multi-server functionality"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.services.settings import PowerDNSSettingsService
from app.models.settings import PowerDNSSettings
from app.core.database import async_session_maker
from app.schemas.settings import PowerDNSSettingCreate

async def create_demo_servers():
    """Create demo PowerDNS server configurations"""
    
    async with async_session_maker() as session:
        settings_service = PowerDNSSettingsService()
        
        try:
            # Check existing servers
            existing_servers = await settings_service.get_powerdns_settings(session)
            print(f"Found {len(existing_servers)} existing PowerDNS servers")
            
            # Server configurations for testing
            demo_servers = [
                {
                    "name": "Primary PowerDNS",
                    "api_url": "http://powerdns:8081",
                    "api_key": "dnsmate-test-key",
                    "description": "Primary PowerDNS server (built-in test instance)",
                    "is_default": True,
                    "is_active": True,
                    "timeout": 30,
                    "verify_ssl": False,
                    "multi_server_mode": True
                },
                {
                    "name": "Secondary PowerDNS",
                    "api_url": "http://powerdns-backup:8081",
                    "api_key": "dnsmate-test-key-backup",
                    "description": "Secondary PowerDNS server for high availability",
                    "is_default": False,
                    "is_active": True,
                    "timeout": 30,
                    "verify_ssl": False,
                    "multi_server_mode": True
                },
                {
                    "name": "Legacy PowerDNS",
                    "api_url": "http://powerdns-legacy:8081",
                    "api_key": "dnsmate-legacy-key",
                    "description": "Legacy PowerDNS server (single-server mode)",
                    "is_default": False,
                    "is_active": True,
                    "timeout": 30,
                    "verify_ssl": False,
                    "multi_server_mode": False
                }
            ]
            
            # Create servers if they don't exist
            for server_config in demo_servers:
                # Check if server with this name already exists
                server_exists = any(s.name == server_config["name"] for s in existing_servers)
                
                if not server_exists:
                    # Create the server
                    setting_data = PowerDNSSettingCreate(**server_config)
                    created_server = await settings_service.create_powerdns_setting(session, setting_data)
                    print(f"✅ Created server: {created_server.name}")
                else:
                    print(f"⏭️  Server already exists: {server_config['name']}")
            
            await session.commit()
            
            # Show final configuration
            print("\n" + "="*60)
            print("DEMO MULTI-SERVER CONFIGURATION")
            print("="*60)
            
            final_servers = await settings_service.get_powerdns_settings(session)
            for server in final_servers:
                print(f"""
📊 {server.name}
   URL: {server.api_url}
   Default: {'Yes' if server.is_default else 'No'}
   Active: {'Yes' if server.is_active else 'No'}
   Multi-server mode: {'Enabled' if server.multi_server_mode else 'Disabled'}
   Description: {server.description or 'N/A'}
""")
            
            print("\n" + "="*60)
            print("MULTI-SERVER OPERATIONS SUMMARY")
            print("="*60)
            
            multi_enabled = [s for s in final_servers if s.multi_server_mode]
            single_only = [s for s in final_servers if not s.multi_server_mode]
            
            print(f"🌐 Multi-server enabled: {len(multi_enabled)} servers")
            for server in multi_enabled:
                print(f"   • {server.name} - {server.api_url}")
            
            print(f"📍 Single-server mode: {len(single_only)} servers")
            for server in single_only:
                print(f"   • {server.name} - {server.api_url}")
            
            print(f"\n🎯 When creating DNS records:")
            if multi_enabled:
                print(f"   • Operations will be performed on {len(multi_enabled)} servers concurrently")
                print(f"   • Each server will receive the same DNS operations")
                print(f"   • Results will show per-server success/failure status")
            else:
                print(f"   • Operations will use the default server only")
            
            print(f"\n✨ Demo setup complete! You can now test multi-server operations in the frontend.")
            
        except Exception as e:
            print(f"❌ Error creating demo servers: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(create_demo_servers())
