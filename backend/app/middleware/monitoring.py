"""Enhanced monitoring and error tracking middleware"""

import time
import logging
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import json
import uuid
from contextlib import asynccontextmanager

from app.core.logging import request_logger, set_request_context, clear_request_context

logger = logging.getLogger(__name__)


class RequestMetrics:
    """In-memory request metrics collection"""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.endpoint_metrics: Dict[str, Dict[str, Any]] = {}
        self.recent_errors: list = []
    
    def record_request(self, endpoint: str, method: str, status_code: int, response_time: float):
        """Record request metrics"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if status_code >= 400:
            self.error_count += 1
        
        # Track per-endpoint metrics
        key = f"{method} {endpoint}"
        if key not in self.endpoint_metrics:
            self.endpoint_metrics[key] = {
                "count": 0,
                "errors": 0,
                "total_time": 0.0,
                "avg_time": 0.0,
                "min_time": float('inf'),
                "max_time": 0.0
            }
        
        metrics = self.endpoint_metrics[key]
        metrics["count"] += 1
        metrics["total_time"] += response_time
        metrics["avg_time"] = metrics["total_time"] / metrics["count"]
        metrics["min_time"] = min(metrics["min_time"], response_time)
        metrics["max_time"] = max(metrics["max_time"], response_time)
        
        if status_code >= 400:
            metrics["errors"] += 1
    
    def record_error(self, error_details: Dict[str, Any]):
        """Record error details"""
        error_details["timestamp"] = time.time()
        self.recent_errors.append(error_details)
        
        # Keep only last 100 errors
        if len(self.recent_errors) > 100:
            self.recent_errors = self.recent_errors[-100:]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0.0
        )
        
        error_rate = (
            (self.error_count / self.request_count) * 100 
            if self.request_count > 0 else 0.0
        )
        
        return {
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate_percent": round(error_rate, 2),
            "avg_response_time_ms": round(avg_response_time * 1000, 2),
            "endpoints": self.endpoint_metrics,
            "recent_errors": self.recent_errors[-10:]  # Last 10 errors
        }


# Global metrics instance
request_metrics = RequestMetrics()


class EnhancedMonitoringMiddleware(BaseHTTPMiddleware):
    """Enhanced monitoring middleware with comprehensive tracking"""
    
    def __init__(self, app, enable_detailed_logging: bool = True):
        super().__init__(app)
        self.enable_detailed_logging = enable_detailed_logging
        self.excluded_paths = {"/health", "/docs", "/redoc", "/openapi.json"}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip monitoring for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Extract user information if available
        user_id = None
        try:
            # Try to get user from authorization header or session
            if hasattr(request.state, "user") and request.state.user:
                user_id = getattr(request.state.user, "id", None)
        except:
            pass
        
        # Set request context for logging
        set_request_context(request_id, user_id)
        
        start_time = time.time()
        
        try:
            # Log request start
            if self.enable_detailed_logging:
                await self._log_request_start(request, request_id)
            
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Record metrics
            request_metrics.record_request(
                endpoint=self._get_endpoint_pattern(request),
                method=request.method,
                status_code=response.status_code,
                response_time=response_time
            )
            
            # Log successful request
            if self.enable_detailed_logging:
                await self._log_request_success(request, response, response_time, request_id)
            
            # Add monitoring headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{response_time * 1000:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate response time for errors
            response_time = time.time() - start_time
            
            # Record error metrics
            error_details = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "error": str(e),
                "error_type": type(e).__name__,
                "response_time": response_time,
                "user_id": user_id,
                "user_agent": request.headers.get("user-agent"),
                "ip_address": self._get_client_ip(request)
            }
            
            request_metrics.record_error(error_details)
            
            # Log error
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "response_time": response_time,
                    "user_id": user_id
                }
            )
            
            # Return structured error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "request_id": request_id,
                    "timestamp": time.time()
                },
                headers={
                    "X-Request-ID": request_id,
                    "X-Response-Time": f"{response_time * 1000:.2f}ms"
                }
            )
        
        finally:
            # Clean up request context
            clear_request_context()
    
    async def _log_request_start(self, request: Request, request_id: str):
        """Log request start details"""
        request_logger.log_request_start(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params),
            headers=dict(request.headers),
            ip_address=self._get_client_ip(request)
        )
    
    async def _log_request_success(self, request: Request, response: Response, response_time: float, request_id: str):
        """Log successful request completion"""
        request_logger.log_request_success(
            request_id=request_id,
            status_code=response.status_code,
            response_time=response_time,
            response_headers=dict(response.headers)
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"
    
    def _get_endpoint_pattern(self, request: Request) -> str:
        """Get endpoint pattern for metrics grouping"""
        path = request.url.path
        
        # Group similar endpoints together
        if path.startswith("/api/zones/") and len(path.split("/")) > 3:
            return "/api/zones/{zone_name}"
        elif path.startswith("/api/records/") and len(path.split("/")) > 3:
            return "/api/records/{zone_name}"
        elif path.startswith("/api/users/") and len(path.split("/")) > 3:
            return "/api/users/{user_id}"
        elif path.startswith("/api/tokens/") and len(path.split("/")) > 3:
            return "/api/tokens/{token_id}"
        elif path.startswith("/api/settings/powerdns/") and len(path.split("/")) > 4:
            return "/api/settings/powerdns/{setting_id}"
        
        return path


class HealthCheckMonitor:
    """Health check and status monitoring"""
    
    def __init__(self):
        self.start_time = time.time()
        self.health_checks: Dict[str, Dict[str, Any]] = {}
    
    def register_health_check(self, name: str, check_func: Callable):
        """Register a health check function"""
        self.health_checks[name] = {
            "check_func": check_func,
            "last_check": 0,
            "last_status": "unknown",
            "last_error": None
        }
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {
            "status": "healthy",
            "timestamp": time.time(),
            "uptime_seconds": time.time() - self.start_time,
            "checks": {},
            "metrics": request_metrics.get_summary()
        }
        
        overall_healthy = True
        
        for name, check_info in self.health_checks.items():
            try:
                check_result = await check_info["check_func"]()
                status = "healthy" if check_result else "unhealthy"
                error = None
            except Exception as e:
                status = "unhealthy"
                error = str(e)
                overall_healthy = False
            
            results["checks"][name] = {
                "status": status,
                "timestamp": time.time(),
                "error": error
            }
            
            # Update stored info
            check_info["last_check"] = time.time()
            check_info["last_status"] = status
            check_info["last_error"] = error
            
            if status != "healthy":
                overall_healthy = False
        
        results["status"] = "healthy" if overall_healthy else "unhealthy"
        return results


# Global health monitor
health_monitor = HealthCheckMonitor()


async def get_application_metrics() -> Dict[str, Any]:
    """Get comprehensive application metrics"""
    return {
        "request_metrics": request_metrics.get_summary(),
        "health_status": await health_monitor.run_health_checks(),
        "system_info": {
            "uptime_seconds": time.time() - health_monitor.start_time,
            "timestamp": time.time()
        }
    }
