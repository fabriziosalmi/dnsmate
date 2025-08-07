"""Multi-PowerDNS operations service"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.powerdns import PowerDNSClient, PowerDNSRecord
from app.services.settings import PowerDNSSettingsService
from app.models.settings import PowerDNSSettings

logger = logging.getLogger(__name__)


class MultiPowerDNSResult:
    """Result of multi-server PowerDNS operation"""
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
        self.success_count = 0
        self.failure_count = 0
        self.total_servers = 0
    
    def add_result(self, server_name: str, server_id: int, success: bool, result: Any = None, error: str = None):
        """Add a server operation result"""
        self.results.append({
            "server_name": server_name,
            "server_id": server_id,
            "success": success,
            "result": result,
            "error": error
        })
        
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
        
        self.total_servers += 1
    
    @property
    def is_partial_success(self) -> bool:
        """True if some but not all servers succeeded"""
        return 0 < self.success_count < self.total_servers
    
    @property
    def is_complete_success(self) -> bool:
        """True if all servers succeeded"""
        return self.success_count == self.total_servers and self.total_servers > 0
    
    @property
    def is_complete_failure(self) -> bool:
        """True if all servers failed"""
        return self.failure_count == self.total_servers and self.total_servers > 0


class MultiPowerDNSService:
    """Service for managing multiple PowerDNS servers"""
    
    def __init__(self):
        self.settings_service = PowerDNSSettingsService()
    
    async def should_use_multi_server(self, db: AsyncSession) -> bool:
        """Check if multi-server mode is enabled"""
        settings = await self.settings_service.get_powerdns_settings(db)
        return any(server.multi_server_mode for server in settings) if settings else False
    
    async def get_active_servers(self, db: AsyncSession) -> List[PowerDNSSettings]:
        """Get all active PowerDNS servers"""
        return await self.settings_service.get_powerdns_settings(db)
    
    async def execute_on_all_servers(
        self, 
        db: AsyncSession, 
        operation_func,
        *args,
        **kwargs
    ) -> MultiPowerDNSResult:
        """Execute an operation on all active PowerDNS servers"""
        servers = await self.get_active_servers(db)
        result = MultiPowerDNSResult()
        
        if not servers:
            logger.warning("No active PowerDNS servers found")
            return result
        
        # Create tasks for concurrent execution
        tasks = []
        for server in servers:
            task = self._execute_on_server(server, operation_func, *args, **kwargs)
            tasks.append((server, task))
        
        # Execute all operations concurrently
        results_list = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
        
        for (server, _), operation_result in zip(tasks, results_list):
            try:
                if isinstance(operation_result, Exception):
                    raise operation_result
                
                result.add_result(
                    server_name=server.name,
                    server_id=server.id,
                    success=True,
                    result=operation_result
                )
                logger.info(f"Operation succeeded on server {server.name}")
            except Exception as e:
                result.add_result(
                    server_name=server.name,
                    server_id=server.id,
                    success=False,
                    error=str(e)
                )
                logger.error(f"Operation failed on server {server.name}: {e}")
        
        return result
    
    async def _execute_on_server(self, server: PowerDNSSettings, operation_func, *args, **kwargs):
        """Execute operation on a single server"""
        client = PowerDNSClient(
            api_url=server.api_url,
            api_key=server.api_key
        )
        
        # If the operation function is a method of PowerDNSClient, bind it
        if hasattr(client, operation_func.__name__):
            bound_func = getattr(client, operation_func.__name__)
            return await bound_func(*args, **kwargs)
        else:
            # For custom operations, pass the client as first argument
            return await operation_func(client, *args, **kwargs)
    
    async def add_record_to_all(
        self, 
        db: AsyncSession, 
        zone_name: str, 
        record_data: Dict[str, Any]
    ) -> MultiPowerDNSResult:
        """Add a DNS record to all active PowerDNS servers or default server based on settings"""
        
        # Check if multi-server mode is enabled
        if not await self.should_use_multi_server(db):
            # Use default server only
            default_server = await self.settings_service.get_default_powerdns_setting(db)
            if not default_server:
                result = MultiPowerDNSResult()
                result.add_result("No default server", 0, False, error="No default PowerDNS server configured")
                return result
            
            result = MultiPowerDNSResult()
            try:
                client = PowerDNSClient(api_url=default_server.api_url, api_key=default_server.api_key)
                operation_result = await client.add_record(zone_name, record_data)
                result.add_result(default_server.name, default_server.id, True, operation_result)
            except Exception as e:
                result.add_result(default_server.name, default_server.id, False, error=str(e))
            return result
        
        async def add_record_operation(client: PowerDNSClient, zone: str, data: Dict[str, Any]):
            return await client.add_record(zone, data)
        
        return await self.execute_on_all_servers(
            db, 
            add_record_operation, 
            zone_name, 
            record_data
        )
    
    async def update_record_on_all(
        self, 
        db: AsyncSession, 
        zone_name: str, 
        record_data: Dict[str, Any]
    ) -> MultiPowerDNSResult:
        """Update a DNS record on all active PowerDNS servers or default server based on settings"""
        
        # Check if multi-server mode is enabled
        if not await self.should_use_multi_server(db):
            # Use default server only
            default_server = await self.settings_service.get_default_powerdns_setting(db)
            if not default_server:
                result = MultiPowerDNSResult()
                result.add_result("No default server", 0, False, error="No default PowerDNS server configured")
                return result
            
            result = MultiPowerDNSResult()
            try:
                client = PowerDNSClient(api_url=default_server.api_url, api_key=default_server.api_key)
                operation_result = await client.update_record(zone_name, record_data)
                result.add_result(default_server.name, default_server.id, True, operation_result)
            except Exception as e:
                result.add_result(default_server.name, default_server.id, False, error=str(e))
            return result
        
        async def update_record_operation(client: PowerDNSClient, zone: str, data: Dict[str, Any]):
            return await client.update_record(zone, data)
        
        return await self.execute_on_all_servers(
            db, 
            update_record_operation, 
            zone_name, 
            record_data
        )
    
    async def delete_record_from_all(
        self, 
        db: AsyncSession, 
        zone_name: str, 
        record_name: str, 
        record_type: str
    ) -> MultiPowerDNSResult:
        """Delete a DNS record from all active PowerDNS servers or default server based on settings"""
        
        # Check if multi-server mode is enabled
        if not await self.should_use_multi_server(db):
            # Use default server only
            default_server = await self.settings_service.get_default_powerdns_setting(db)
            if not default_server:
                result = MultiPowerDNSResult()
                result.add_result("No default server", 0, False, error="No default PowerDNS server configured")
                return result
            
            result = MultiPowerDNSResult()
            try:
                client = PowerDNSClient(api_url=default_server.api_url, api_key=default_server.api_key)
                operation_result = await client.delete_record(zone_name, record_name, record_type)
                result.add_result(default_server.name, default_server.id, True, operation_result)
            except Exception as e:
                result.add_result(default_server.name, default_server.id, False, error=str(e))
            return result
        
        async def delete_record_operation(client: PowerDNSClient, zone: str, name: str, rtype: str):
            return await client.delete_record(zone, name, rtype)
        
        return await self.execute_on_all_servers(
            db, 
            delete_record_operation, 
            zone_name, 
            record_name, 
            record_type
        )
    
    async def create_zone_on_all(
        self, 
        db: AsyncSession, 
        zone_data: Dict[str, Any]
    ) -> MultiPowerDNSResult:
        """Create a DNS zone on all active PowerDNS servers or default server based on settings"""
        
        # Check if multi-server mode is enabled
        if not await self.should_use_multi_server(db):
            # Use default server only
            default_server = await self.settings_service.get_default_powerdns_setting(db)
            if not default_server:
                result = MultiPowerDNSResult()
                result.add_result("No default server", 0, False, error="No default PowerDNS server configured")
                return result
            
            result = MultiPowerDNSResult()
            try:
                client = PowerDNSClient(api_url=default_server.api_url, api_key=default_server.api_key)
                operation_result = await client.create_zone(zone_data)
                result.add_result(default_server.name, default_server.id, True, operation_result)
            except Exception as e:
                result.add_result(default_server.name, default_server.id, False, error=str(e))
            return result
        
        async def create_zone_operation(client: PowerDNSClient, data: Dict[str, Any]):
            return await client.create_zone(data)
        
        return await self.execute_on_all_servers(
            db, 
            create_zone_operation, 
            zone_data
        )
    
    async def delete_zone_from_all(
        self, 
        db: AsyncSession, 
        zone_name: str
    ) -> MultiPowerDNSResult:
        """Delete a DNS zone from all active PowerDNS servers or default server based on settings"""
        
        # Check if multi-server mode is enabled
        if not await self.should_use_multi_server(db):
            # Use default server only
            default_server = await self.settings_service.get_default_powerdns_setting(db)
            if not default_server:
                result = MultiPowerDNSResult()
                result.add_result("No default server", 0, False, error="No default PowerDNS server configured")
                return result
            
            result = MultiPowerDNSResult()
            try:
                client = PowerDNSClient(api_url=default_server.api_url, api_key=default_server.api_key)
                operation_result = await client.delete_zone(zone_name)
                result.add_result(default_server.name, default_server.id, True, operation_result)
            except Exception as e:
                result.add_result(default_server.name, default_server.id, False, error=str(e))
            return result
        
        async def delete_zone_operation(client: PowerDNSClient, zone: str):
            return await client.delete_zone(zone)
        
        return await self.execute_on_all_servers(
            db, 
            delete_zone_operation, 
            zone_name
        )


# Global instance
multi_powerdns_service = MultiPowerDNSService()
