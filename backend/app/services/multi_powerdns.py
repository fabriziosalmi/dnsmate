"""Multi-PowerDNS operations service with enhanced reliability"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.powerdns import PowerDNSClient, PowerDNSRecord
from app.services.settings import PowerDNSSettingsService
from app.models.settings import PowerDNSSettings

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, circuit is open
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """Simple circuit breaker for server reliability"""
    failure_threshold: int = 5
    recovery_timeout: int = 60  # seconds
    failure_count: int = field(default=0)
    last_failure_time: float = field(default=0)
    state: CircuitState = field(default=CircuitState.CLOSED)
    successful_calls: int = field(default=0)
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == CircuitState.CLOSED:
            return True
        elif self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self):
        """Record successful operation"""
        self.failure_count = 0
        self.successful_calls += 1
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
    
    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN


class MultiPowerDNSResult:
    """Enhanced result tracking for multi-server operations"""
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
        self.success_count = 0
        self.failure_count = 0
        self.total_servers = 0
        self.execution_time_ms = 0
        self.operation_metadata: Dict[str, Any] = {}
    
    def add_result(self, server_name: str, server_id: int, success: bool, 
                   result: Any = None, error: str = None, response_time_ms: float = 0):
        """Add a server operation result with enhanced metrics"""
        self.results.append({
            "server_name": server_name,
            "server_id": server_id,
            "success": success,
            "result": result,
            "error": error,
            "response_time_ms": response_time_ms,
            "timestamp": time.time()
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
    
    @property
    def average_response_time(self) -> float:
        """Calculate average response time across all operations"""
        if not self.results:
            return 0.0
        return sum(r.get("response_time_ms", 0) for r in self.results) / len(self.results)
    
    def get_fastest_server(self) -> Optional[str]:
        """Get the server with fastest response time"""
        successful_results = [r for r in self.results if r["success"]]
        if not successful_results:
            return None
        return min(successful_results, key=lambda x: x.get("response_time_ms", float('inf')))["server_name"]


class MultiPowerDNSService:
    """Enhanced service for managing multiple PowerDNS servers"""
    
    def __init__(self):
        self.settings_service = PowerDNSSettingsService()
        self.circuit_breakers: Dict[int, CircuitBreaker] = {}
        self.operation_cache: Dict[str, Any] = {}
        self.performance_metrics: Dict[int, List[float]] = {}
    
    def _get_circuit_breaker(self, server_id: int) -> CircuitBreaker:
        """Get or create circuit breaker for server"""
        if server_id not in self.circuit_breakers:
            self.circuit_breakers[server_id] = CircuitBreaker()
        return self.circuit_breakers[server_id]
    
    async def should_use_multi_server(self, db: AsyncSession) -> bool:
        """Check if multi-server mode is enabled with enhanced logic"""
        try:
            settings = await self.settings_service.get_powerdns_settings(db)
            active_multi_servers = [s for s in settings if s.multi_server_mode and s.is_active]
            return len(active_multi_servers) > 1
        except Exception as e:
            logger.error(f"Error checking multi-server mode: {e}")
            return False
    
    async def get_active_servers(self, db: AsyncSession) -> List[PowerDNSSettings]:
        """Get all active PowerDNS servers with health filtering"""
        try:
            all_servers = await self.settings_service.get_powerdns_settings(db)
            healthy_servers = []
            
            for server in all_servers:
                if not server.is_active:
                    continue
                
                circuit_breaker = self._get_circuit_breaker(server.id)
                if circuit_breaker.can_execute():
                    healthy_servers.append(server)
                else:
                    logger.warning(f"Server {server.name} circuit breaker is open, skipping")
            
            return healthy_servers
        except Exception as e:
            logger.error(f"Error getting active servers: {e}")
            return []
    
    async def _execute_on_server_with_metrics(
        self, 
        server: PowerDNSSettings, 
        operation_func: Callable,
        *args, 
        **kwargs
    ) -> Dict[str, Any]:
        """Execute operation on server with performance tracking"""
        circuit_breaker = self._get_circuit_breaker(server.id)
        start_time = time.time()
        
        try:
            if not circuit_breaker.can_execute():
                raise Exception(f"Circuit breaker open for server {server.name}")
            
            client = PowerDNSClient(server.api_url, server.api_key)
            result = await operation_func(client, *args, **kwargs)
            
            response_time = (time.time() - start_time) * 1000  # ms
            circuit_breaker.record_success()
            
            # Track performance metrics
            if server.id not in self.performance_metrics:
                self.performance_metrics[server.id] = []
            self.performance_metrics[server.id].append(response_time)
            
            # Keep only last 100 measurements
            if len(self.performance_metrics[server.id]) > 100:
                self.performance_metrics[server.id] = self.performance_metrics[server.id][-100:]
            
            return {
                "success": True,
                "result": result,
                "error": None,
                "response_time_ms": response_time
            }
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            circuit_breaker.record_failure()
            logger.error(f"Operation failed on server {server.name}: {e}")
            
            return {
                "success": False,
                "result": None,
                "error": str(e),
                "response_time_ms": response_time
            }
    
    async def execute_on_all_servers(
        self, 
        db: AsyncSession, 
        operation_func: Callable,
        *args,
        **kwargs
    ) -> MultiPowerDNSResult:
        """Execute operation on all active servers with enhanced error handling"""
        start_time = time.time()
        servers = await self.get_active_servers(db)
        result = MultiPowerDNSResult()
        
        if not servers:
            logger.warning("No active PowerDNS servers found")
            return result
        
        # Prepare concurrent tasks with timeout
        timeout = kwargs.pop('timeout', 30)  # Default 30 second timeout
        tasks = []
        
        for server in servers:
            task = asyncio.create_task(
                self._execute_on_server_with_metrics(server, operation_func, *args, **kwargs)
            )
            tasks.append((server, task))
        
        # Execute with timeout protection
        try:
            results_list = await asyncio.wait_for(
                asyncio.gather(*[task for _, task in tasks], return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"Multi-server operation timed out after {timeout}s")
            # Cancel pending tasks
            for _, task in tasks:
                if not task.done():
                    task.cancel()
            results_list = [Exception("Operation timed out") for _ in tasks]
        
        # Process results
        for (server, _), operation_result in zip(tasks, results_list):
            try:
                if isinstance(operation_result, Exception):
                    raise operation_result
                
                result.add_result(
                    server_name=server.name,
                    server_id=server.id,
                    success=operation_result["success"],
                    result=operation_result["result"],
                    error=operation_result["error"],
                    response_time_ms=operation_result["response_time_ms"]
                )
                
            except Exception as e:
                logger.error(f"Failed to execute operation on server {server.name}: {e}")
                result.add_result(
                    server_name=server.name,
                    server_id=server.id,
                    success=False,
                    result=None,
                    error=str(e),
                    response_time_ms=0
                )
        
        result.execution_time_ms = (time.time() - start_time) * 1000
        
        # Log operation summary
        logger.info(
            f"Multi-server operation completed: {result.success_count}/{result.total_servers} succeeded "
            f"in {result.execution_time_ms:.1f}ms"
        )
        
        return result
    
    async def get_server_performance_metrics(self, server_id: int) -> Dict[str, float]:
        """Get performance metrics for a specific server"""
        if server_id not in self.performance_metrics:
            return {"avg_response_time": 0.0, "total_calls": 0}
        
        metrics = self.performance_metrics[server_id]
        return {
            "avg_response_time": sum(metrics) / len(metrics) if metrics else 0.0,
            "min_response_time": min(metrics) if metrics else 0.0,
            "max_response_time": max(metrics) if metrics else 0.0,
            "total_calls": len(metrics)
        }
    
    async def get_health_status(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall health status of all servers"""
        servers = await self.settings_service.get_powerdns_settings(db)
        health_data = {
            "total_servers": len(servers),
            "active_servers": len([s for s in servers if s.is_active]),
            "healthy_servers": 0,
            "circuit_breaker_status": {},
            "performance_summary": {}
        }
        
        for server in servers:
            if server.id in self.circuit_breakers:
                circuit_breaker = self.circuit_breakers[server.id]
                health_data["circuit_breaker_status"][server.name] = {
                    "state": circuit_breaker.state.value,
                    "failure_count": circuit_breaker.failure_count,
                    "successful_calls": circuit_breaker.successful_calls
                }
                
                if circuit_breaker.state == CircuitState.CLOSED:
                    health_data["healthy_servers"] += 1
            
            # Add performance metrics
            metrics = await self.get_server_performance_metrics(server.id)
            health_data["performance_summary"][server.name] = metrics
        
        return health_data
    
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


# Global instance with enhanced features
multi_powerdns_service = MultiPowerDNSService()
