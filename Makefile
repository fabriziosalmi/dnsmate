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

dev-full: ## Start development environment with PowerDNS for testing
	@echo "🚀 Starting development environment with PowerDNS..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml --profile with-powerdns up -d postgres
	@echo "⏳ Waiting for database to be ready..."
	@sleep 15
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml --profile with-powerdns up -d backend frontend-dev powerdns
	@echo "✅ Development environment with PowerDNS started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔗 Backend API: http://localhost:8000"
	@echo "📖 API Docs: http://localhost:8000/docs"
	@echo "🌐 PowerDNS API: http://localhost:8081"
	@echo "💡 Test PowerDNS settings: URL=http://powerdns:8081, Key=dnsmate-test-key"

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

test-e2e: ## Run end-to-end Playwright tests (requires dev environment)
	@echo "🧪 Running end-to-end tests..."
	@./run-tests.sh

test-flows: ## Run comprehensive user flow tests (requires dev environment)
	@echo "🧪 Running user flow tests..."
	@if ! ./health-check.sh; then echo "❌ Services not ready. Run 'make dev-full' first."; exit 1; fi
	@cd tests && npm run test:flows

test-integration: ## Run PowerDNS integration tests (requires dev environment)
	@echo "🧪 Running integration tests..."
	@if ! ./health-check.sh; then echo "❌ Services not ready. Run 'make dev-full' first."; exit 1; fi
	@cd tests && npm run test:integration

test-verify: ## Verify PowerDNS data matches UI
	@echo "🔍 Verifying PowerDNS data..."
	@./verify-powerdns.sh

test-watch: ## Run tests in watch mode
	@echo "🧪 Running tests in watch mode..."
	@docker-compose -f docker-compose.test.yml up -d postgres-test powerdns-test
	@echo "⏳ Waiting for test services to be ready..."
	@sleep 20
	@docker-compose -f docker-compose.test.yml run --rm backend-test pytest -f

stop: ## Stop all running services
	@echo "🛑 Stopping all services..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml --profile with-powerdns down 2>/dev/null || true
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

create-admin: ## Create admin user with custom email (Usage: make create-admin EMAIL=your@email.com PASSWORD=yourpass)
	@echo "👤 Creating custom admin user..."
	@docker-compose exec -e ADMIN_EMAIL="$(EMAIL)" -e ADMIN_PASSWORD="$(PASSWORD)" -e ADMIN_FIRST_NAME="$(FIRSTNAME)" -e ADMIN_LAST_NAME="$(LASTNAME)" backend python create_user.py

demo-setup: ## Setup complete demo environment with users and zones
	@echo "🎭 Setting up demo environment..."
	@if ! ./health-check.sh; then echo "❌ Services not ready. Run 'make dev-full' first."; exit 1; fi
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend python setup_demo.py
	@echo "🎉 Demo environment ready! Visit http://localhost:3000"

demo-users: ## Create demo users only (without zones)
	@echo "👥 Creating demo users..."
	@if ! ./health-check.sh; then echo "❌ Services not ready. Run 'make dev-full' first."; exit 1; fi
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend python create_demo_users.py

demo-cleanup: ## Clean up demo environment (delete demo users and zones)
	@echo "🧹 Cleaning up demo environment..."
	@docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml exec backend python setup_demo.py --cleanup

setup: ## Full setup: stop, rebuild, start, and create admin user
	@echo "🚀 Running full setup..."
	@make stop
	@docker-compose build --no-cache backend
	@docker-compose up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 30
	@./create-admin.sh

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
