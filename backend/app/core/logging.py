"""Structured logging configuration"""

import logging
import logging.config
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
import traceback
import uuid
from contextvars import ContextVar

from app.core.config import settings

# Context variables for request tracking
request_id_context: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_context: ContextVar[Optional[int]] = ContextVar('user_id', default=None)


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Create base log structure
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": record.process,
            "thread_id": record.thread,
        }
        
        # Add request context if available
        request_id = request_id_context.get()
        if request_id:
            log_entry["request_id"] = request_id
        
        user_id = user_id_context.get()
        if user_id:
            log_entry["user_id"] = user_id
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add any extra fields from the log record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'message']:
                extra_fields[key] = value
        
        if extra_fields:
            log_entry["extra"] = extra_fields
        
        return json.dumps(log_entry, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable text formatter for development"""
    
    def format(self, record: logging.LogRecord) -> str:
        # Add request context to the message
        request_id = request_id_context.get()
        user_id = user_id_context.get()
        
        context_parts = []
        if request_id:
            context_parts.append(f"req:{request_id[:8]}")
        if user_id:
            context_parts.append(f"user:{user_id}")
        
        context_str = f"[{','.join(context_parts)}] " if context_parts else ""
        
        # Format the record
        formatted = super().format(record)
        return f"{context_str}{formatted}"


def setup_logging():
    """Configure logging based on settings"""
    
    # Determine log level
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    # Create formatter based on configuration
    if settings.log_format.lower() == "json":
        formatter = StructuredFormatter()
    else:
        formatter = TextFormatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler if specified
    if settings.log_file:
        file_handler = logging.FileHandler(settings.log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Configure specific loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    # Set application logger level
    app_logger = logging.getLogger("app")
    app_logger.setLevel(log_level)


class SecurityLogger:
    """Specialized logger for security events"""
    
    def __init__(self):
        self.logger = logging.getLogger("app.security")
    
    def log_authentication_attempt(
        self,
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ):
        """Log authentication attempts"""
        event_data = {
            "event_type": "authentication_attempt",
            "email": email,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "failure_reason": failure_reason
        }
        
        if success:
            self.logger.info("Successful authentication", extra=event_data)
        else:
            self.logger.warning("Failed authentication", extra=event_data)
    
    def log_authorization_failure(
        self,
        user_id: Optional[int],
        resource: str,
        action: str,
        ip_address: Optional[str] = None
    ):
        """Log authorization failures"""
        event_data = {
            "event_type": "authorization_failure",
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "ip_address": ip_address
        }
        
        self.logger.warning("Authorization denied", extra=event_data)
    
    def log_rate_limit_exceeded(
        self,
        ip_address: str,
        endpoint: str,
        limit: int,
        window: int
    ):
        """Log rate limit violations"""
        event_data = {
            "event_type": "rate_limit_exceeded",
            "ip_address": ip_address,
            "endpoint": endpoint,
            "limit": limit,
            "window": window
        }
        
        self.logger.warning("Rate limit exceeded", extra=event_data)
    
    def log_suspicious_activity(
        self,
        description: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log suspicious activities"""
        event_data = {
            "event_type": "suspicious_activity",
            "description": description,
            "user_id": user_id,
            "ip_address": ip_address,
            "metadata": metadata or {}
        }
        
        self.logger.error("Suspicious activity detected", extra=event_data)


class RequestLogger:
    """Logger for HTTP requests"""
    
    def __init__(self):
        self.logger = logging.getLogger("app.requests")
    
    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None
    ):
        """Log HTTP request"""
        event_data = {
            "event_type": "http_request",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_size": request_size,
            "response_size": response_size
        }
        
        if status_code >= 500:
            self.logger.error("HTTP request - server error", extra=event_data)
        elif status_code >= 400:
            self.logger.warning("HTTP request - client error", extra=event_data)
        else:
            self.logger.info("HTTP request", extra=event_data)


class DatabaseLogger:
    """Logger for database operations"""
    
    def __init__(self):
        self.logger = logging.getLogger("app.database")
    
    def log_query(
        self,
        query_type: str,
        table: str,
        duration_ms: float,
        user_id: Optional[int] = None,
        affected_rows: Optional[int] = None
    ):
        """Log database query"""
        event_data = {
            "event_type": "database_query",
            "query_type": query_type,
            "table": table,
            "duration_ms": duration_ms,
            "user_id": user_id,
            "affected_rows": affected_rows
        }
        
        if duration_ms > 1000:  # Log slow queries
            self.logger.warning("Slow database query", extra=event_data)
        else:
            self.logger.debug("Database query", extra=event_data)


# Global logger instances
security_logger = SecurityLogger()
request_logger = RequestLogger()
database_logger = DatabaseLogger()


def set_request_context(request_id: str, user_id: Optional[int] = None):
    """Set request context for logging"""
    request_id_context.set(request_id)
    if user_id:
        user_id_context.set(user_id)


def clear_request_context():
    """Clear request context"""
    request_id_context.set(None)
    user_id_context.set(None)


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())
