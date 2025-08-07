"""Enhanced structured logging configuration with performance monitoring"""

import logging
import logging.config
import logging.handlers
import json
import sys
import time
from datetime import datetime
from typing import Any, Dict, Optional, Union
import traceback
import uuid
from contextvars import ContextVar
from pathlib import Path

# Use try-catch for settings import to handle circular dependencies
try:
    from app.core.config import settings
except ImportError:
    settings = None

# Context variables for request tracking
request_id_context: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_context: ContextVar[Optional[int]] = ContextVar('user_id', default=None)
operation_context: ContextVar[Optional[str]] = ContextVar('operation', default=None)


class EnhancedStructuredFormatter(logging.Formatter):
    """Enhanced formatter for structured JSON logging with additional context"""
    
    def __init__(self, include_extra: bool = True):
        super().__init__()
        self.include_extra = include_extra
    
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
            "environment": settings.environment if settings else "development",
        }
        
        # Add request context if available
        request_id = request_id_context.get()
        if request_id:
            log_entry["request_id"] = request_id
        
        user_id = user_id_context.get()
        if user_id:
            log_entry["user_id"] = user_id
        
        operation = operation_context.get()
        if operation:
            log_entry["operation"] = operation
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry, default=str, ensure_ascii=False)


def setup_logging():
    """Configure enhanced logging based on settings"""
    
    # Determine log level
    log_level = logging.INFO
    if settings:
        log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    
    # Create formatter based on configuration and environment
    if settings and settings.log_format.lower() == "json":
        formatter = EnhancedStructuredFormatter()
    else:
        # Production text format
        formatter = logging.Formatter(
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
    
    # Set specific logger levels
    logger_levels = {
        'uvicorn': logging.INFO,
        'uvicorn.access': logging.WARNING,
        'sqlalchemy.engine': logging.WARNING,
        'httpx': logging.WARNING,
        'asyncio': logging.WARNING,
    }
    
    for logger_name, level in logger_levels.items():
        logging.getLogger(logger_name).setLevel(level)
    
    # Log the setup completion
    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully")


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name"""
    return logging.getLogger(name)


# Convenience request logger
request_logger = get_logger("app.request")


# Context management functions
def set_request_context(request_id: str, user_id: Optional[int] = None, operation: Optional[str] = None):
    """Set request context for logging"""
    request_id_context.set(request_id)
    if user_id is not None:
        user_id_context.set(user_id)
    if operation is not None:
        operation_context.set(operation)


def clear_request_context():
    """Clear request context"""
    request_id_context.set(None)
    user_id_context.set(None)
    operation_context.set(None)


def get_request_context() -> Dict[str, Any]:
    """Get current request context"""
    return {
        'request_id': request_id_context.get(),
        'user_id': user_id_context.get(),
        'operation': operation_context.get()
    }


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())
