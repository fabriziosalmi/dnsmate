#!/bin/bash

echo "🚀 Starting DNSMate Development Environment..."

# Set environment variables for development
export TARGET=development
export ENVIRONMENT=development

# Stop any existing containers
echo "🛑 Stopping existing containers..."
make stop > /dev/null 2>&1

# Start development environment
echo "🔄 Starting development services..."
make dev

echo "✅ DNSMate is starting up!"
echo ""
echo "📍 Services:"
echo "   Frontend (React): http://localhost:3000"
echo "   Backend (API):    http://localhost:8000"
echo "   API Docs:         http://localhost:8000/docs"
echo "   Database:         localhost:5432"
echo ""
echo "⏱️  Please wait 30-60 seconds for all services to be ready."
echo ""
echo "🔐 To create an admin user, run:"
echo "   make create-user"
echo ""
echo "📝 To view logs:"
echo "   make logs"
echo ""
echo "🛑 To stop all services:"
echo "   make stop"
