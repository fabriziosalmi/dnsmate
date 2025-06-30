# 🌐 DNSMate - Complete Docker Development Guide

DNSMate is a Python-React application for managing remote PowerDNS instances with user authentication and role-based access control. This guide covers running everything in Docker containers for development, testing, and production.

## 🚀 Quick Start

### Prerequisites

- Docker 20.0 or later
- Docker Compose 2.0 or later
- Make (optional, for simplified commands)

### Development Environment

Start the complete development environment with hot reload:

```bash
# Using Make (recommended)
make dev

# Or using docker-compose directly
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This will start:
- 🌐 **Frontend (React)**: http://localhost:3000 (with hot reload)
- 🔗 **Backend (FastAPI)**: http://localhost:8000 (with auto-reload)
- 📖 **API Documentation**: http://localhost:8000/docs
- 🗄️ **PostgreSQL Database**: localhost:5432

### Production Environment

```bash
# Using Make
make prod

# Or using docker-compose
docker-compose --env-file .env.production up -d --build
```

Access:
- 🌐 **Frontend**: http://localhost:8021
- 🔗 **Backend API**: http://localhost:8000

### Testing

Run all tests in isolated containers:

```bash
# Run tests once
make test

# Run tests in watch mode (for development)
make test-watch
```

## 📋 Available Commands

### Make Commands (Recommended)

```bash
make help           # Show all available commands
make dev            # Start development environment
make prod           # Start production environment
make test           # Run tests in isolated environment
make stop           # Stop all services
make clean          # Clean up all Docker resources
make logs           # Show logs for all services
make status         # Show status of all services
make shell-backend  # Open shell in backend container
make shell-frontend # Open shell in frontend container
make restart        # Restart development environment
make migrate        # Run database migrations
make create-user    # Create an admin user
```

### Manual Docker Commands

#### Development
```bash
# Start development environment
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml down
```

#### Production
```bash
# Start production environment
docker-compose --env-file .env.production up -d --build

# View logs
docker-compose --env-file .env.production logs -f

# Stop production environment
docker-compose --env-file .env.production down
```

#### Testing
```bash
# Run tests
docker-compose -f docker-compose.test.yml up -d postgres-test powerdns-test
sleep 20  # Wait for services to be ready
docker-compose -f docker-compose.test.yml run --rm backend-test
docker-compose -f docker-compose.test.yml down
```

## 🏗️ Architecture

### Docker Services

#### Backend (FastAPI)
- **Development**: Auto-reload enabled, volume mounted for live code changes
- **Production**: Optimized build, no volumes
- **Testing**: Isolated environment with test database

#### Frontend (React)
- **Development**: React dev server with hot reload, volume mounted
- **Production**: Nginx serving built static files
- **Testing**: Not applicable (backend tests cover API)

#### Database (PostgreSQL)
- **Development/Production**: Persistent volumes
- **Testing**: Ephemeral containers, fresh for each test run

#### PowerDNS (Optional)
- **Development/Production**: Available with `--profile with-powerdns`
- **Testing**: Isolated test instance

### Multi-Stage Dockerfiles

Both backend and frontend use multi-stage builds:

**Backend Stages:**
- `base`: Common dependencies
- `development`: Dev tools + auto-reload
- `test`: Testing dependencies
- `production`: Optimized runtime

**Frontend Stages:**
- `base`: Node.js + dependencies
- `development`: Dev server
- `builder`: Build static files
- `production`: Nginx serving built files

## 🔧 Environment Configuration

### Environment Files

Three environment files control different setups:

- `.env.development` - Development with hot reload
- `.env.production` - Production optimized
- `.env.test` - Testing with isolated services

### Key Environment Variables

```bash
# Target build stage
TARGET=development|production|test

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Security (change in production!)
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
RESET_PASSWORD_TOKEN_SECRET=your-reset-secret
VERIFICATION_TOKEN_SECRET=your-verification-secret

# PowerDNS
POWERDNS_API_URL=http://powerdns:8081
POWERDNS_API_KEY=your-api-key

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8021

# Frontend
REACT_APP_API_URL=http://localhost:8000
GENERATE_SOURCEMAP=true|false
```

## 🧪 Testing Strategy

### Backend Tests

Tests run in completely isolated Docker containers:

```bash
# Run all tests
make test

# Run specific test file
docker-compose -f docker-compose.test.yml run --rm backend-test pytest tests/test_auth.py -v

# Run with coverage
docker-compose -f docker-compose.test.yml run --rm backend-test pytest --cov=app --cov-report=html
```

### Test Database

Each test run gets a fresh PostgreSQL instance:
- Database: `dnsmate_test`
- User: `dnsmate_test`
- Password: `dnsmate_test_password`

### PowerDNS Testing

Test PowerDNS instance available for integration tests:
- API URL: `http://powerdns-test:8081`
- API Key: `test-key`

## 🔐 User Management

### Create Admin User

```bash
# In development environment
make create-user

# Or manually
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend python create_user.py
```

### User Roles

- **Admin**: Full permissions including user management
- **Editor**: Read/write access to assigned zones  
- **Reader**: Read-only access to assigned zones

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :8000
lsof -i :3000
lsof -i :8021

# Stop conflicting services or change ports in environment files
```

#### 2. Frontend Source Map Errors
The error you mentioned is usually caused by source map generation in production. This is fixed by:
- Setting `GENERATE_SOURCEMAP=false` in production
- Using proper nginx configuration for static files

#### 3. Database Connection Issues
```bash
# Check if database is ready
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec postgres pg_isready -U dnsmate

# View database logs
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs postgres
```

#### 4. CORS Issues
Ensure `CORS_ORIGINS` includes your frontend URL:
```bash
# Development
CORS_ORIGINS=http://localhost:3000,http://localhost:8021

# Production
CORS_ORIGINS=https://yourdomain.com
```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml ps

# Manual health check
curl http://localhost:8000/api/health
```

### Logs and Debugging

```bash
# View all logs
make logs

# View specific service logs
make logs-backend
make logs-frontend

# Follow logs in real-time
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Shell into containers for debugging
make shell-backend
make shell-frontend
```

## 📦 Development Workflow

### 1. Start Development Environment
```bash
make dev
```

### 2. Make Code Changes
- Backend: Changes auto-reload via uvicorn
- Frontend: Changes hot-reload via React dev server

### 3. Run Tests
```bash
make test
```

### 4. Debug Issues
```bash
# Check logs
make logs-backend

# Shell into container
make shell-backend

# Run specific tests
docker-compose -f docker-compose.test.yml run --rm backend-test pytest tests/test_auth.py -v -s
```

### 5. Build Production
```bash
make prod
```

## 🐳 Docker Best Practices

### Volume Mounts (Development)
- Backend: `./backend:/app` - Live code reload
- Frontend: `./frontend:/app` + `/app/node_modules` - Hot reload with preserved dependencies

### Multi-Stage Builds
- Optimized image sizes
- Separate development and production builds
- Cached dependency layers

### Health Checks
- All services include health checks
- Services wait for dependencies to be healthy
- Automatic restart on failure

### Security
- Non-root users in containers
- Minimal base images (Alpine)
- Environment-specific configurations

### Networking
- Isolated networks for different environments
- Service discovery via container names
- Health-checked service dependencies

## 📝 Next Steps

1. **Configure Production Secrets**: Update `.env.production` with secure keys
2. **Set Up CI/CD**: Use the test commands in your pipeline
3. **Configure Reverse Proxy**: Set up nginx/traefik for production
4. **Database Backups**: Use `make backup` or set up automated backups
5. **Monitoring**: Add logging and monitoring solutions
6. **SSL/TLS**: Configure HTTPS for production

## 🤝 Contributing

1. Fork the repository
2. Start development environment: `make dev`
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

All development, testing, and production environments run in Docker containers, ensuring consistency across all stages of development.
