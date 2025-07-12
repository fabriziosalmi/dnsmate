#!/bin/bash

# Create admin user with custom email
echo "🔧 Creating admin user..."

# Set environment variables for user creation
export ADMIN_EMAIL="${1:-fabrizio.salmi@gmail.com}"
export ADMIN_PASSWORD="${2:-admin123}"
export ADMIN_FIRST_NAME="${3:-Fabrizio}"
export ADMIN_LAST_NAME="${4:-Salmi}"

echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Password: $ADMIN_PASSWORD"
echo "👤 Name: $ADMIN_FIRST_NAME $ADMIN_LAST_NAME"

# Stop current containers to rebuild with fixed dependencies
echo "🛑 Stopping current containers..."
docker-compose down

# Rebuild backend with updated requirements
echo "🔨 Rebuilding backend container..."
docker-compose build --no-cache backend

# Start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 30

# Create the admin user
echo "👤 Creating admin user..."
docker-compose exec -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASSWORD" -e ADMIN_FIRST_NAME="$ADMIN_FIRST_NAME" -e ADMIN_LAST_NAME="$ADMIN_LAST_NAME" backend python create_user.py

echo "✅ Setup complete!"
echo "🌐 Frontend: http://localhost:8021"
echo "🔗 Backend: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Login credentials:"
echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Password: $ADMIN_PASSWORD"
