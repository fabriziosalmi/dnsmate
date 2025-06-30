#!/bin/bash

# DNSMate Health Check Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check if a service is responding
check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    print_status "Checking $name at $url..."
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        print_success "$name is responding correctly"
        return 0
    else
        print_error "$name is not responding correctly"
        return 1
    fi
}

# Function to check if containers are running
check_containers() {
    print_status "Checking Docker containers..."
    
    local containers=(
        "dnsmate-backend"
        "dnsmate-frontend-dev"
        "dnsmate-postgres"
    )
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            print_success "$container is running"
        else
            print_error "$container is not running"
            return 1
        fi
    done
}

# Function to test API endpoints
test_api() {
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    if check_service "Backend Health" "http://localhost:8000/api/health"; then
        print_success "Backend API is healthy"
    else
        print_error "Backend API health check failed"
        return 1
    fi
    
    # Test API docs
    if check_service "API Documentation" "http://localhost:8000/docs"; then
        print_success "API documentation is accessible"
    else
        print_warning "API documentation may not be accessible"
    fi
    
    # Test auth endpoint (should return 422 for missing data, which means it's working)
    if check_service "Auth Endpoint" "http://localhost:8000/auth/jwt/login" "422"; then
        print_success "Authentication endpoint is responding"
    else
        print_warning "Authentication endpoint may have issues"
    fi
}

# Function to test frontend
test_frontend() {
    print_status "Testing frontend..."
    
    if check_service "Frontend" "http://localhost:3000"; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔍 DNSMate Health Check${NC}"
    echo "=================================="
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check containers
    if ! check_containers; then
        print_error "Some containers are not running. Please start the development environment first:"
        echo "  make dev"
        exit 1
    fi
    
    # Wait a moment for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 5
    
    # Test backend
    if ! test_api; then
        print_error "Backend API tests failed"
        exit 1
    fi
    
    # Test frontend
    if ! test_frontend; then
        print_error "Frontend tests failed"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 All health checks passed!${NC}"
    echo ""
    echo "📍 Services are running at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "🔐 To create an admin user (if you haven't already):"
    echo "   make create-user"
    echo ""
    echo "📝 To view logs:"
    echo "   make logs"
}

# Run main function
main "$@"
