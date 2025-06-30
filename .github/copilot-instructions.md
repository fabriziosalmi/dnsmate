# Copilot Instructions for DNSMate

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
DNSMate is a Python-React application for managing remote PowerDNS instances with user authentication and role-based access control.

## Architecture
- **Backend**: FastAPI with FastAPI-Users for authentication
- **Frontend**: React with TypeScript
- **Database**: SQLAlchemy with SQLite/PostgreSQL
- **Authentication**: JWT-based with role-based access control

## User Roles
- **Admin**: Full permissions including user management
- **Editor**: Read/write access to specific zones
- **Reader**: Read-only access to specific zones

## Code Style Guidelines
- Use type hints for Python code
- Follow FastAPI best practices
- Use async/await for database operations
- Implement proper error handling and logging
- Use Pydantic models for data validation
- Follow React hooks patterns
- Use TypeScript for type safety

## Key Components
- PowerDNS API client for zone and record management
- User authentication and authorization system
- Role-based permission system
- Zone and record CRUD operations
- Responsive React UI with modern design patterns
