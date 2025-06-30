#!/bin/bash

# DNSMate Docker Development Scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to run development environment
dev() {
    print_section "Starting Development Environment"
    
    # Stop any running containers
    docker-compose --env-file .env.development down
    
    # Start development services
    docker-compose --env-file .env.development --profile development up -d postgres
    
    # Wait for postgres to be ready
    print_section "Waiting for database to be ready..."
    sleep 10
    
    # Start backend and frontend
    docker-compose --env-file .env.development --profile development up -d backend frontend-dev
    
    print_success "Development environment started!"
    echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "Backend API: ${GREEN}http://localhost:8000${NC}"
    echo -e "API Docs: ${GREEN}http://localhost:8000/docs${NC}"
    
    # Show logs
    docker-compose --env-file .env.development logs -f backend frontend-dev
}

# Function to run production environment
prod() {
    print_section "Starting Production Environment"
    
    # Stop any running containers
    docker-compose --env-file .env.production down
    
    # Build and start production services
    docker-compose --env-file .env.production up -d --build
    
    print_success "Production environment started!"
    echo -e "Frontend: ${GREEN}http://localhost:8021${NC}"
    echo -e "Backend API: ${GREEN}http://localhost:8000${NC}"
    echo -e "API Docs: ${GREEN}http://localhost:8000/docs${NC}"
}

# Function to run tests
test() {
    print_section "Running Tests"
    
    # Stop any running test containers
    docker-compose --env-file .env.test --profile test down
    
    # Start test database
    docker-compose --env-file .env.test --profile test up -d postgres-test powerdns-test
    
    # Wait for services to be ready
    print_section "Waiting for test services to be ready..."
    sleep 15
    
    # Run tests
    docker-compose --env-file .env.test --profile test run --rm backend-test
    
    # Cleanup
    docker-compose --env-file .env.test --profile test down
}

# Function to stop all services
stop() {
    print_section "Stopping All Services"
    docker-compose --env-file .env.development down
    docker-compose --env-file .env.production down
    docker-compose --env-file .env.test --profile test down
    print_success "All services stopped!"
}

# Function to clean up everything
clean() {
    print_section "Cleaning Up Docker Resources"
    
    # Stop all services
    stop
    
    # Remove volumes (optional)
    read -p "Remove volumes (this will delete all data)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker volume prune -f
        print_success "Volumes removed!"
    fi
    
    # Remove images
    docker-compose down --rmi all
    docker image prune -f
    
    print_success "Cleanup completed!"
}

# Function to show logs
logs() {
    local service=${2:-}
    if [ "$service" ]; then
        docker-compose --env-file .env.development logs -f "$service"
    else
        docker-compose --env-file .env.development logs -f
    fi
}

# Function to shell into a container
shell() {
    local service=${2:-backend}
    docker-compose --env-file .env.development exec "$service" /bin/bash
}

# Function to show status
status() {
    print_section "Service Status"
    docker-compose --env-file .env.development ps
    docker-compose --env-file .env.production ps
    docker-compose --env-file .env.test --profile test ps
}

# Function to show help
help() {
    echo "DNSMate Docker Management Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  dev      Start development environment (hot reload enabled)"
    echo "  prod     Start production environment"
    echo "  test     Run tests in isolated environment"
    echo "  stop     Stop all running services"
    echo "  clean    Clean up all Docker resources"
    echo "  logs     Show logs for all services or specific service"
    echo "  shell    Open shell in container (default: backend)"
    echo "  status   Show status of all services"
    echo "  help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Start development environment"
    echo "  $0 logs backend           # Show backend logs"
    echo "  $0 shell frontend-dev     # Shell into frontend dev container"
}

# Main command handler
case "${1:-help}" in
    "dev")
        dev
        ;;
    "prod")
        prod
        ;;
    "test")
        test
        ;;
    "stop")
        stop
        ;;
    "clean")
        clean
        ;;
    "logs")
        logs "$@"
        ;;
    "shell")
        shell "$@"
        ;;
    "status")
        status
        ;;
    "help"|*)
        help
        ;;
esac
