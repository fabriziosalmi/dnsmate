"""Enhanced application configuration with comprehensive settings management"""

from pydantic_settings import BaseSettings
from pydantic import Field, validator, model_validator
from typing import Optional, List, Dict, Any, Union
import os
import secrets
from pathlib import Path


class Settings(BaseSettings):
    """Main application settings"""
    
    # Environment and app info
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    app_name: str = Field(default="DNSMate", description="Application name")
    version: str = Field(default="1.1.0", description="Application version")
    debug: bool = Field(default=True, description="Debug mode")
    
    # Server configuration
    host: str = Field(default="0.0.0.0", description="Host to bind to")
    port: int = Field(default=8000, description="Port to bind to")
    reload: bool = Field(default=True, description="Auto-reload on code changes")
    
    # Database
    database_url: str = Field(default="sqlite:///./dnsmate.db", description="Database connection URL")
    
    # CORS configuration
    cors_origins: Union[str, List[str]] = Field(default="*", description="CORS allowed origins")
    
    # PowerDNS configuration
    powerdns_api_url: str = Field(default="http://localhost:8081", description="PowerDNS API URL")
    powerdns_api_key: str = Field(default="changeme", description="PowerDNS API key")
    powerdns_timeout: int = Field(default=30, description="PowerDNS request timeout")
    powerdns_verify_ssl: bool = Field(default=True, description="Verify PowerDNS SSL certificates")
    
    # Multi-server support
    multi_server_mode: bool = Field(default=False, description="Enable multi-server mode")
    
    # Security
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="Secret key")
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="JWT secret key")
    reset_password_token_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="Reset password token secret")
    verification_token_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="Verification token secret")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration")
    
    # Logging
    log_level: str = Field(default="INFO", description="Log level")
    log_format: str = Field(default="text", description="Log format")
    log_file: Optional[str] = Field(default=None, description="Log file path")
    
    # Monitoring
    slow_query_threshold_ms: float = Field(default=1000.0, description="Slow query threshold")
    
    # Email
    email_enabled: bool = Field(default=False, description="Enable email")
    
    # Rate limiting
    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    
    @validator('cors_origins', pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    @validator('environment')
    def validate_environment(cls, v):
        valid_envs = ["development", "staging", "production"]
        if v not in valid_envs:
            raise ValueError(f"Environment must be one of: {valid_envs}")
        return v
    
    # Property accessors for backward compatibility
    @property
    def backend_cors_origins(self) -> List[str]:
        """Get CORS origins as list"""
        cors_origins_env = os.getenv("CORS_ORIGINS")
        if cors_origins_env:
            return [origin.strip() for origin in cors_origins_env.split(",")]
        if isinstance(self.cors_origins, str):
            if self.cors_origins == "*":
                return ["*"]
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
