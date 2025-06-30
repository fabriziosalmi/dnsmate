.PHONY: help dev prod test stop clean logs shell status build

# Default target
help: ## Show this help message
	@echo "DNSMate Docker Management Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment with hot reload
	@echo "🚀 Starting development environment..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up -d postgres
	@echo "⏳ Waiting for database to be ready..."
	@sleep 15
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up -d backend frontend-dev
	@echo "✅ Development environment started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔗 Backend API: http://localhost:8000"
	@echo "📖 API Docs: http://localhost:8000/docs"

prod: ## Start production environment
	@echo "🚀 Starting production environment..."
	@docker-compose --env-file .env.production up -d --build
	@echo "✅ Production environment started!"
	@echo "🌐 Frontend: http://localhost:8021"
	@echo "🔗 Backend API: http://localhost:8000"
	@echo "📖 API Docs: http://localhost:8000/docs"

test: ## Run tests in isolated environment
	@echo "🧪 Running tests..."
	@docker-compose -f docker-compose.test.yml up -d postgres-test powerdns-test
	@echo "⏳ Waiting for test services to be ready..."
	@sleep 20
	@docker-compose -f docker-compose.test.yml run --rm backend-test
	@echo "🧹 Cleaning up test environment..."
	@docker-compose -f docker-compose.test.yml down

test-watch: ## Run tests in watch mode
	@echo "🧪 Running tests in watch mode..."
	@docker-compose -f docker-compose.test.yml up -d postgres-test powerdns-test
	@echo "⏳ Waiting for test services to be ready..."
	@sleep 20
	@docker-compose -f docker-compose.test.yml run --rm backend-test pytest -f

stop: ## Stop all running services
	@echo "🛑 Stopping all services..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true
	@docker-compose --env-file .env.production down 2>/dev/null || true
	@docker-compose -f docker-compose.test.yml down 2>/dev/null || true
	@echo "✅ All services stopped!"

clean: ## Clean up all Docker resources (removes volumes and images)
	@echo "🧹 Cleaning up Docker resources..."
	@make stop
	@docker-compose down -v --rmi all 2>/dev/null || true
	@docker volume prune -f
	@docker image prune -f
	@echo "✅ Cleanup completed!"

logs: ## Show logs for all services
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs -f

logs-backend: ## Show backend logs
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

logs-frontend: ## Show frontend logs
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend-dev

shell-backend: ## Open shell in backend container
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend /bin/bash

shell-frontend: ## Open shell in frontend container
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec frontend-dev /bin/sh

status: ## Show status of all services
	@echo "📊 Service Status:"
	@echo ""
	@echo "Development:"
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml ps 2>/dev/null || echo "Not running"
	@echo ""
	@echo "Production:"
	@docker-compose --env-file .env.production ps 2>/dev/null || echo "Not running"
	@echo ""
	@echo "Test:"
	@docker-compose -f docker-compose.test.yml ps 2>/dev/null || echo "Not running"

build: ## Build all images without cache
	@echo "🔨 Building all images..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml build --no-cache

restart: ## Restart development environment
	@make stop
	@make dev

install: ## Install/update dependencies in development environment
	@echo "📦 Installing/updating dependencies..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend pip install -r requirements.txt
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec frontend-dev npm install

migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend alembic upgrade head

create-user: ## Create a new user (admin)
	@echo "👤 Creating admin user..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend python create_user.py

backup: ## Create database backup
	@echo "💾 Creating database backup..."
	@mkdir -p ./backups
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec postgres pg_dump -U dnsmate dnsmate > ./backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in ./backups/"

check-ignore: ## Check what files are ignored by git and docker
	@echo "📋 Checking ignore files..."
	@echo ""
	@echo "🔍 Git ignored files (sample):"
	@git ls-files --ignored --exclude-standard | head -20 || echo "No ignored files found"
	@echo ""
	@echo "📁 .dockerignore files:"
	@find . -name ".dockerignore" -exec echo "  {}" \;
	@echo ""
	@echo "📄 .gitignore file:"
	@ls -la .gitignore 2>/dev/null || echo "  .gitignore not found"
