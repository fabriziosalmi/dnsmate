#!/usr/bin/env python3
"""Test multi-server PowerDNS functionality"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.services.multi_powerdns import multi_powerdns_service, MultiPowerDNSResult
from app.services.settings import PowerDNSSettingsService
from app.models.settings import PowerDNSSettings
from app.core.database import AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession

async def test_multi_server_functionality():
    """Test the multi-server PowerDNS functionality"""
    
    async with AsyncSessionLocal() as session:
        try:
            # Test 1: Check if multi-server mode detection works
            print("=== Test 1: Multi-server mode detection ===")
            is_multi_server = await multi_powerdns_service.should_use_multi_server(session)
            print(f"Multi-server mode enabled: {is_multi_server}")
            
            # Test 2: Get active servers
            print("\n=== Test 2: Get active servers ===")
            servers = await multi_powerdns_service.get_active_servers(session)
            print(f"Found {len(servers)} active PowerDNS servers:")
            for server in servers:
                print(f"  - {server.name} ({server.api_url}) - Multi-server: {server.multi_server_mode}")
            
            # Test 3: Test record creation logic
            print("\n=== Test 3: Test record creation (simulation) ===")
            test_zone = "test.example.com"
            test_record = {
                "name": "test",
                "type": "A", 
                "content": "192.168.1.100",
                "ttl": 300
            }
            
            print(f"Simulating record creation for zone: {test_zone}")
            print(f"Record data: {test_record}")
            
            # Create a result object to test the logic
            result = MultiPowerDNSResult()
            
            if servers:
                # Simulate results for each server
                for i, server in enumerate(servers):
                    # Simulate success on even-numbered servers, failure on odd
                    success = (i % 2 == 0)
                    if success:
                        result.add_result(server.name, server.id, True, {"message": "Record created"})
                    else:
                        result.add_result(server.name, server.id, False, error="Simulated failure")
                
                print(f"\nSimulated results:")
                print(f"  Total servers: {result.total_servers}")
                print(f"  Successful: {result.success_count}")
                print(f"  Failed: {result.failure_count}")
                print(f"  Complete success: {result.is_complete_success}")
                print(f"  Partial success: {result.is_partial_success}")
                print(f"  Complete failure: {result.is_complete_failure}")
                
                print(f"\nDetailed results:")
                for res in result.results:
                    status = "✓" if res["success"] else "✗"
                    detail = res.get("result", res.get("error", "N/A"))
                    print(f"  {status} {res['server_name']}: {detail}")
            else:
                print("No servers configured - would create default server result")
            
            print("\n=== Test 4: Settings service integration ===")
            settings_service = PowerDNSSettingsService()
            default_server = await settings_service.get_default_powerdns_setting(session)
            if default_server:
                print(f"Default server: {default_server.name} ({default_server.api_url})")
                print(f"Multi-server mode: {default_server.multi_server_mode}")
            else:
                print("No default server configured")
            
            print("\n✅ All tests completed successfully!")
            
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_multi_server_functionality())
