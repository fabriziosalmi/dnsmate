"""Rate limiting middleware and service"""

import time
from typing import Dict, Optional, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from datetime import datetime, timedelta
import logging

# Import redis with error handling
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """In-memory rate limiter for development/small deployments"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.blocked_ips = defaultdict(float)  # IP -> timestamp when block expires
    
    def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed within rate limit"""
        now = time.time()
        
        # Check if IP is currently blocked
        if key in self.blocked_ips and self.blocked_ips[key] > now:
            remaining_block_time = int(self.blocked_ips[key] - now)
            return False, {
                "allowed": limit,
                "remaining": 0,
                "reset_time": int(self.blocked_ips[key]),
                "blocked_for": remaining_block_time
            }
        
        # Clean up old requests
        self.requests[key] = [req_time for req_time in self.requests[key] if now - req_time < window]
        
        # Check rate limit
        current_requests = len(self.requests[key])
        
        if current_requests >= limit:
            # Block IP for extended period on repeated violations
            if current_requests >= limit * 2:
                self.blocked_ips[key] = now + 3600  # Block for 1 hour
            
            return False, {
                "allowed": limit,
                "remaining": 0,
                "reset_time": int(now + window),
                "current": current_requests
            }
        
        # Add current request
        self.requests[key].append(now)
        
        return True, {
            "allowed": limit,
            "remaining": limit - current_requests - 1,
            "reset_time": int(now + window),
            "current": current_requests + 1
        }


class RedisRateLimiter:
    """Redis-based rate limiter for production"""
    
    def __init__(self, redis_url: str):
        if not REDIS_AVAILABLE or redis is None:
            raise RuntimeError("Redis is not available but RedisRateLimiter was instantiated")
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    async def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed within rate limit"""
        now = int(time.time())
        pipeline = self.redis.pipeline()
        
        # Check if IP is blocked
        blocked_key = f"blocked:{key}"
        blocked_until = self.redis.get(blocked_key)
        if blocked_until and int(blocked_until) > now:
            remaining_block_time = int(blocked_until) - now
            return False, {
                "allowed": limit,
                "remaining": 0,
                "reset_time": int(blocked_until),
                "blocked_for": remaining_block_time
            }
        
        # Use sliding window counter
        window_key = f"rate_limit:{key}:{now // window}"
        
        # Get current count
        current_count = self.redis.get(window_key)
        current_count = int(current_count) if current_count else 0
        
        if current_count >= limit:
            # Block IP for extended period on repeated violations
            if current_count >= limit * 2:
                self.redis.setex(blocked_key, 3600, now + 3600)  # Block for 1 hour
            
            return False, {
                "allowed": limit,
                "remaining": 0,
                "reset_time": (now // window + 1) * window,
                "current": current_count
            }
        
        # Increment counter
        pipeline.incr(window_key)
        pipeline.expire(window_key, window)
        pipeline.execute()
        
        return True, {
            "allowed": limit,
            "remaining": limit - current_count - 1,
            "reset_time": (now // window + 1) * window,
            "current": current_count + 1
        }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, redis_url: Optional[str] = None):
        super().__init__(app)
        # Only use Redis if it's available and redis_url is provided
        if redis_url and REDIS_AVAILABLE:
            self.limiter = RedisRateLimiter(redis_url)
        else:
            self.limiter = InMemoryRateLimiter()
            if redis_url and not REDIS_AVAILABLE:
                logger.warning("Redis URL provided but redis package not available, falling back to in-memory rate limiting")
        
        # Rate limit configurations
        self.rate_limits = {
            # Authentication endpoints - strict limits
            "/auth/jwt/login": {"limit": 5, "window": 300},  # 5 attempts per 5 minutes
            "/auth/register": {"limit": 3, "window": 3600},  # 3 registrations per hour
            "/auth/reset-password": {"limit": 3, "window": 3600},  # 3 reset attempts per hour
            
            # API endpoints - moderate limits
            "/api/": {"limit": 1000, "window": 3600},  # 1000 API calls per hour
            
            # Default limit for all other endpoints
            "default": {"limit": 100, "window": 300}  # 100 requests per 5 minutes
        }
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded IP headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def get_rate_limit_config(self, path: str) -> Dict[str, int]:
        """Get rate limit configuration for a specific path"""
        # Check for exact matches first
        for endpoint, config in self.rate_limits.items():
            if endpoint != "default" and path.startswith(endpoint):
                return config
        
        # Return default configuration
        return self.rate_limits["default"]
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        path = request.url.path
        client_ip = self.get_client_ip(request)
        
        # Skip rate limiting for health checks and static files
        if path in ["/api/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get rate limit configuration
        config = self.get_rate_limit_config(path)
        limit = config["limit"]
        window = config["window"]
        
        # Create rate limit key
        rate_limit_key = f"{client_ip}:{path}"
        
        # Check rate limit
        try:
            if isinstance(self.limiter, RedisRateLimiter):
                allowed, info = await self.limiter.is_allowed(rate_limit_key, limit, window)
            else:
                allowed, info = self.limiter.is_allowed(rate_limit_key, limit, window)
            
            if not allowed:
                # Log rate limit violation
                logger.warning(f"Rate limit exceeded for {client_ip} on {path}: {info}")
                
                # Return rate limit error
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded",
                        "error": "too_many_requests",
                        **info
                    },
                    headers={
                        "X-RateLimit-Limit": str(info["allowed"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset_time"]),
                        "Retry-After": str(info.get("blocked_for", window))
                    }
                )
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(info["allowed"])
            response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(info["reset_time"])
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Continue without rate limiting if there's an error
            return await call_next(request)


# Dependency for rate limiting specific endpoints
async def rate_limit_dependency(request: Request, limit: int = 60, window: int = 60):
    """Dependency function for additional rate limiting"""
    # This can be used with FastAPI's Depends() for specific endpoints
    # that need custom rate limiting beyond the middleware
    pass
