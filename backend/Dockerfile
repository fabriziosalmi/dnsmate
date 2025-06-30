# DNSMate Backend Dockerfile - Multi-stage build
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base AS development

# Install additional development dependencies
RUN pip install --no-cache-dir \
    watchdog \
    python-multipart \
    pytest-watch \
    ipdb

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash dnsmate \
    && chown -R dnsmate:dnsmate /app
USER dnsmate

# Expose port
EXPOSE 8000

# Development command with auto-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Testing stage
FROM base AS test

# Install test dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    pytest-cov \
    httpx

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash dnsmate \
    && chown -R dnsmate:dnsmate /app
USER dnsmate

# Run tests by default
CMD ["pytest", "-v", "--tb=short", "--cov=app", "--cov-report=term-missing"]

# Production stage
FROM base AS production

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash dnsmate \
    && chown -R dnsmate:dnsmate /app
USER dnsmate

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
