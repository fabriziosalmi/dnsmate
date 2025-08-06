#!/bin/bash

echo "🚀 Starting DNSMate Development Environment..."

# Set environment variables for development
export TARGET=development
export ENVIRONMENT=development

# Stop any existing containers
echo "🛑 Stopping existing containers..."
make stop > /dev/null 2>&1

# Start development environment with PowerDNS
echo "🔄 Starting development services with PowerDNS..."
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml --profile with-powerdns up -d

echo "✅ DNSMate is starting up!"
echo ""
echo "📍 Services:"
echo "   Frontend (React): http://localhost:3000"
echo "   Backend (API):    http://localhost:8000"
echo "   API Docs:         http://localhost:8000/docs"
echo "   Database:         localhost:5432"
echo "   PowerDNS API:     http://localhost:8081"
echo ""
echo "⏱️  Please wait 30-60 seconds for all services to be ready."
echo ""
echo "🔐 To create an admin user, run:"
echo "   make create-user"
echo ""
echo "💡 Quick PowerDNS Setup in DNSMate Settings:"
echo "   Server Name: Test PowerDNS"
echo "   API URL: http://powerdns:8081"
echo "   API Key: dnsmate-test-key"
echo ""
echo "📝 To view logs:"
echo "   make logs"
echo ""
echo "🛑 To stop all services:"
echo "   make stop"
