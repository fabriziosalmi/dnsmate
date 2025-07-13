"""Application configuration"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "sqlite:///./dnsmate.db"
    
    # Security
    secret_key: str = "your-secret-key-change-this-in-production"
    jwt_secret: str = "your-jwt-secret-key"
    reset_password_token_secret: str = "your-reset-password-secret"
    verification_token_secret: str = "your-verification-secret"
    
    # PowerDNS API
    powerdns_api_url: str = "http://localhost:8081"
    powerdns_api_key: str = "your-powerdns-api-key"
    
    # Environment
    environment: str = "production"
    
    # Email settings
    email_enabled: bool = False
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    from_email: str = "noreply@dnsmate.com"
    from_name: str = "DNSMate"
    frontend_url: str = "http://localhost:3000"
    
    # Rate limiting
    redis_url: Optional[str] = None
    rate_limit_enabled: bool = True
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # json or text
    log_file: Optional[str] = None
    
    # CORS - can be overridden by CORS_ORIGINS environment variable
    @property
    def backend_cors_origins(self) -> list[str]:
        """Get CORS origins from environment or use defaults"""
        cors_origins = os.getenv("CORS_ORIGINS")
        if cors_origins:
            return [origin.strip() for origin in cors_origins.split(",")]
        
        # Default origins based on environment
        default_origins = [
            "http://localhost:3000",
            "http://localhost:8021",
            "http://localhost",
            "http://127.0.0.1:8021",
            "http://127.0.0.1:3000",
            "http://127.0.0.1"
        ]
        
        # In development, allow all origins for easier testing
        if self.environment == "development":
            default_origins.extend([
                "http://localhost:8000",
                "http://127.0.0.1:8000"
            ])
        
        return default_origins
    
    class Config:
        env_file = ".env"


settings = Settings()
