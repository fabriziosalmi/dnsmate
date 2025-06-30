#!/bin/bash

# DNSMate Testing Script
# This script helps you test the complete DNSMate stack with PowerDNS

set -e

echo "🚀 DNSMate Testing Setup"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_step "Creating .env file from .env.example"
    cp .env.example .env
    print_success "Created .env file"
else
    print_warning ".env file already exists"
fi

# Function to start services
start_services() {
    print_step "Starting DNSMate services..."
    
    if [ "$1" == "--with-powerdns" ]; then
        print_step "Starting with PowerDNS test instance"
        docker-compose --profile with-powerdns up -d
    else
        print_step "Starting without PowerDNS (use existing instance)"
        docker-compose up -d
    fi
    
    print_success "Services started"
}

# Function to check service health
check_health() {
    print_step "Checking service health..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy (http://localhost:8000)"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        print_success "Frontend is accessible (http://localhost)"
    else
        print_warning "Frontend is not accessible yet (may still be starting)"
    fi
    
    # Check PowerDNS if running with profile
    if docker-compose ps | grep -q powerdns; then
        if curl -f http://localhost:8081/api/v1/servers > /dev/null 2>&1; then
            print_success "PowerDNS API is accessible (http://localhost:8081)"
        else
            print_warning "PowerDNS API check failed"
        fi
    fi
    
    # Check database
    if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
        print_success "Database is ready"
    else
        print_warning "Database is not ready"
    fi
}

# Function to show logs
show_logs() {
    print_step "Recent logs from all services:"
    docker-compose logs --tail=50
}

# Function to stop services
stop_services() {
    print_step "Stopping DNSMate services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to clean up
cleanup() {
    print_step "Cleaning up (removing volumes and images)..."
    docker-compose down -v --rmi local
    print_success "Cleanup complete"
}

# Function to run tests
run_tests() {
    print_step "Running backend tests..."
    docker-compose exec backend python -m pytest tests/ -v
    print_success "Tests completed"
}

# Function to create test user
create_test_user() {
    print_step "Creating test admin user..."
    
    cat << 'EOF' > create_user.py
import asyncio
import sys
sys.path.append('/app')
from app.core.database import get_async_session
from app.models.user import User
from app.core.auth import get_user_manager
from app.schemas.user import UserCreate
from sqlalchemy.ext.asyncio import AsyncSession

async def create_admin_user():
    async for session in get_async_session():
        user_manager = get_user_manager()
        user_data = UserCreate(
            email="admin@dnsmate.com",
            password="admin123",
            first_name="Admin",
            last_name="User",
            role="admin",
            is_superuser=True,
            is_verified=True
        )
        try:
            user = await user_manager.create(user_data, session)
            print(f"Created admin user: {user.email}")
        except Exception as e:
            print(f"User might already exist: {e}")
        break

if __name__ == "__main__":
    asyncio.run(create_admin_user())
EOF

    docker-compose exec backend python create_user.py
    docker-compose exec backend rm create_user.py
    print_success "Test admin user created (admin@dnsmate.com / admin123)"
}

# Function to show API endpoints
show_endpoints() {
    print_step "Available API endpoints:"
    echo ""
    echo "🌐 Frontend: http://localhost"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo "🔍 Alternative API Docs: http://localhost:8000/redoc"
    echo "💾 Database: localhost:5432 (user: dnsmate, password: dnsmate_password)"
    
    if docker-compose ps | grep -q powerdns; then
        echo "🎯 PowerDNS API: http://localhost:8081/api/v1"
        echo "   API Key: dnsmate-test-key"
        echo "   Test domain: example.com"
    fi
    echo ""
}

# Main menu
case "$1" in
    "start")
        start_services $2
        check_health
        show_endpoints
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        start_services $2
        check_health
        show_endpoints
        ;;
    "logs")
        show_logs
        ;;
    "health")
        check_health
        ;;
    "test")
        run_tests
        ;;
    "user")
        create_test_user
        ;;
    "clean")
        cleanup
        ;;
    "endpoints")
        show_endpoints
        ;;
    *)
        echo "DNSMate Testing Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|logs|health|test|user|clean|endpoints} [--with-powerdns]"
        echo ""
        echo "Commands:"
        echo "  start [--with-powerdns]  Start all services (optionally with PowerDNS test instance)"
        echo "  stop                     Stop all services"
        echo "  restart [--with-powerdns] Restart all services"
        echo "  logs                     Show recent logs"
        echo "  health                   Check service health"
        echo "  test                     Run backend tests"
        echo "  user                     Create test admin user"
        echo "  clean                    Clean up all containers and volumes"
        echo "  endpoints                Show available endpoints"
        echo ""
        echo "Examples:"
        echo "  $0 start --with-powerdns    # Start with PowerDNS test instance"
        echo "  $0 start                    # Start without PowerDNS (use external)"
        echo "  $0 user                     # Create test admin user"
        echo ""
        exit 1
        ;;
esac
