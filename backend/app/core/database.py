"""Database configuration and setup"""

import logging
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool
from typing import AsyncGenerator
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create async database URL
database_url = settings.database_url
if database_url.startswith("sqlite://"):
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

# Enhanced engine configuration with optimized settings
engine_kwargs = {
    "echo": settings.environment == "development",
    "future": True,
    "pool_pre_ping": True,  # Verify connections before use
}

# SQLite-specific optimizations
if "sqlite" in database_url:
    engine_kwargs.update({
        "poolclass": StaticPool,
        "connect_args": {
            "check_same_thread": False,
            "timeout": 30,
            "isolation_level": None,  # Autocommit mode
        }
    })
# PostgreSQL-specific optimizations
elif "postgresql" in database_url:
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 30,
        "pool_timeout": 30,
        "pool_recycle": 3600,  # Recycle connections every hour
    })

# Create async engine with enhanced settings
engine = create_async_engine(database_url, **engine_kwargs)

# Create async session factory with optimized settings
async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=True,
    autocommit=False
)


class Base(DeclarativeBase):
    """Enhanced base class for all models"""
    pass


async def create_db_and_tables():
    """Create database tables with proper error handling"""
    try:
        logger.info("Creating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Enhanced database session context manager with error handling"""
    session = async_session_maker()
    try:
        yield session
        await session.commit()
    except Exception as e:
        logger.error(f"Database session error: {e}")
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session - FastAPI dependency compatible"""
    async with get_db_session() as session:
        yield session


async def health_check() -> bool:
    """Check database connectivity"""
    try:
        async with get_db_session() as session:
            await session.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
