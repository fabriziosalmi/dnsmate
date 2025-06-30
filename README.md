# DNSMate

A modern, full-featured DNS management interface for PowerDNS with user authentication, role-based access control, API token support, configuration versioning, and backup capabilities.

> **🐳 Docker-First Development**: DNSMate is designed to run completely in Docker containers for development, testing, and production. See [Complete Docker Guide](README-Docker.md) for detailed instructions.

## 🚀 Quick Start

### Prerequisites
- Docker 20.0+ and Docker Compose 2.0+
- Make (optional, for simplified commands)

### Start Development Environment
```bash
# Clone the repository
git clone <repository-url>
cd dnsmate

# Start development environment (with hot reload)
make dev

# Create an admin user
make create-user

# Check if everything is working
./health-check.sh
```

Your services will be available at:
- 🌐 **Frontend**: http://localhost:3000 (React with hot reload)
- 🔗 **Backend**: http://localhost:8000 (FastAPI with auto-reload)  
- 📖 **API Docs**: http://localhost:8000/docs

### Other Commands
```bash
make prod          # Start production environment
make test          # Run tests in isolated containers
make stop          # Stop all services
make clean         # Clean up all Docker resources
make logs          # View logs
make status        # Check service status
```

## 🚀 Features

### Core Features
- **Dual Authentication**: JWT-based web authentication + API tokens for programmatic access
- **Role-Based Access Control**: Admin, Editor, and Reader roles with granular permissions
- **Zone Management**: Create, view, and delete DNS zones with validation
- **Record Management**: Full CRUD operations for DNS records with type validation
- **PowerDNS Integration**: Direct API integration with PowerDNS instances

### Advanced Features
- **API Token Management**: Each user can create up to 10 API tokens for programmatic access
- **Configuration Versioning**: Per-user versioning system with rollback capabilities
- **BIND Backup Export**: Generate BIND-compatible zone file backups
- **Usage Limits**: Configurable limits (1000 zones, 5000 records per zone per user)
- **Comprehensive API Documentation**: Swagger/OpenAPI docs with examples
- **Docker Support**: Multi-architecture Docker containers with Docker Compose

### API & Documentation
- **RESTful API**: Complete REST API with OpenAPI 3.0 specification
- **Swagger UI**: Interactive API documentation at `/docs`
- **ReDoc**: Alternative API documentation at `/redoc`
- **API Token Authentication**: Bearer token authentication for API access

## Architecture

### Backend (FastAPI)
- **FastAPI**: Modern, fast web framework for building APIs
- **FastAPI-Users**: Complete user management solution
- **SQLAlchemy**: SQL toolkit and ORM
- **PowerDNS API Client**: Custom client for PowerDNS integration
- **JWT Authentication**: Secure token-based authentication

### Frontend (React)
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

## User Roles & Permissions

### Admin
- Full system access including user management
- Can create, edit, and delete zones
- Can manage user permissions and API tokens
- Access to user management interface
- Can view and rollback all zone versions
- No usage limits

### Editor
- Read/write access to assigned zones
- Can create new zones (auto-assigned permissions)
- Can manage records within assigned zones
- Can create zone versions and rollback
- Limited to 1000 zones, 5000 records per zone

### Reader
- Read-only access to assigned zones
- Can view zones and records but cannot modify
- Can download backups of accessible zones
- Can view zone version history
- No modification capabilities

## 🚀 Quick Start with Docker (Recommended)

### Option 1: With Test PowerDNS Instance (Easiest)

Perfect for testing and development. Includes a preconfigured PowerDNS instance with test data.

```bash
# Clone the repository
git clone https://github.com/yourusername/dnsmate.git
cd dnsmate

# Start everything with test PowerDNS instance
./test-stack.sh start --with-powerdns

# Create a test admin user
./test-stack.sh user

# Open in browser: http://localhost
# Login: admin@dnsmate.com / admin123
```

### Option 2: With External PowerDNS Instance

If you have an existing PowerDNS instance:

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your PowerDNS settings

# Start without built-in PowerDNS
./test-stack.sh start

# Create admin user
./test-stack.sh user
```

### Test Script Commands

The `test-stack.sh` script provides easy management:

```bash
./test-stack.sh start [--with-powerdns]  # Start services
./test-stack.sh stop                     # Stop services  
./test-stack.sh restart [--with-powerdns] # Restart services
./test-stack.sh logs                     # View logs
./test-stack.sh health                   # Check health
./test-stack.sh user                     # Create test admin user
./test-stack.sh endpoints                # Show available URLs
./test-stack.sh clean                    # Clean up everything
```

### Available Services

When running with Docker:

- **Frontend**: http://localhost (React web interface)
- **Backend API**: http://localhost:8000 (FastAPI backend)
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **PowerDNS API**: http://localhost:8081 (if using --with-powerdns)
- **Database**: localhost:5432 (PostgreSQL)

## 🛠️ Manual Setup

If you prefer to set up components individually:

### Prerequisites
- **Web Interface**: http://localhost
- **API Documentation**: http://localhost/docs
- **Alternative API Docs**: http://localhost/redoc
- **Backend API**: http://localhost:8000

### 4. Default Admin Setup
```bash
# Create first admin user via API
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure_password",
    "role": "admin"
  }'
```

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Set Environment Variables**
   ```bash
   # Required settings in .env
   SECRET_KEY=your-secret-key-change-this-in-production
   DATABASE_URL=sqlite:///./dnsmate.db
   POWERDNS_API_URL=http://localhost:8081
   POWERDNS_API_KEY=your-powerdns-api-key
   JWT_SECRET=your-jwt-secret-key
   ```

4. **Run Backend**
   ```bash
   python run.py
   ```

   The API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Alternative Docs: `http://localhost:8000/redoc`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

### PowerDNS Configuration

Ensure your PowerDNS instance has the API enabled:

```ini
# pdns.conf
api=yes
api-key=your-api-key-here
webserver=yes
webserver-address=0.0.0.0
webserver-port=8081
webserver-allow-from=127.0.0.1,::1
```

## Project Structure

```
dnsmate/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/     # API route definitions
│   │   ├── core/           # Core configuration and auth
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic and external APIs
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py             # Development server
├── frontend/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API client and services
│   │   └── App.tsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## API Usage Examples

### Authentication
```bash
# Login to get JWT token
curl -X POST "http://localhost:8000/auth/jwt/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password"

# Create API token
curl -X POST "http://localhost:8000/api/tokens/" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Token",
    "description": "Token for automation scripts"
  }'
```

### Zone Management
```bash
# List zones (with API token)
curl -X GET "http://localhost:8000/api/zones/" \
  -H "Authorization: Bearer dnsmate_<your_api_token>"

# Create zone
curl -X POST "http://localhost:8000/api/zones/" \
  -H "Authorization: Bearer dnsmate_<your_api_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example.com",
    "kind": "Native"
  }'
```

### Record Management
```bash
# Create A record
curl -X POST "http://localhost:8000/api/records/example.com" \
  -H "Authorization: Bearer dnsmate_<your_api_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "www.example.com",
    "type": "A",
    "content": "192.168.1.100",
    "ttl": 300
  }'

# List records
curl -X GET "http://localhost:8000/api/records/example.com" \
  -H "Authorization: Bearer dnsmate_<your_api_token>"
```

### Versioning & Backup
```bash
# Create version snapshot
curl -X POST "http://localhost:8000/api/zones/example.com/versions" \
  -H "Authorization: Bearer dnsmate_<your_api_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Before adding new records",
    "changes_summary": "Backup before bulk changes"
  }'

# Download zone backup
curl -X GET "http://localhost:8000/api/zones/example.com/backup" \
  -H "Authorization: Bearer dnsmate_<your_api_token>" \
  -o example.com.zone

# Download all zones backup
curl -X GET "http://localhost:8000/api/zones/backup/all" \
  -H "Authorization: Bearer dnsmate_<your_api_token>" \
  -o all_zones_backup.zone
```

## Development Setup

### Backend Development

1. **Setup Python Environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run Backend**
   ```bash
   python run.py
   ```

### Frontend Development

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

### API Documentation

The backend provides comprehensive API documentation:
- **Swagger UI**: `http://localhost:8000/docs` - Interactive API explorer
- **ReDoc**: `http://localhost:8000/redoc` - Alternative documentation format
- **OpenAPI Spec**: `http://localhost:8000/openapi.json` - Machine-readable specification

## Production Deployment

### Using Docker (Recommended)

1. **Prepare Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Scale Services** (optional)
   ```bash
   docker-compose up -d --scale backend=3
   ```

### Manual Deployment

#### Backend
- Use a production WSGI server (Gunicorn + Uvicorn)
- Configure PostgreSQL instead of SQLite
- Set strong secret keys
- Enable HTTPS
- Configure proper CORS origins

#### Frontend
- Build for production: `npm run build`
- Serve with nginx or similar web server
- Configure proper proxy settings
- Enable gzip compression and caching

## Configuration Versioning

DNSMate includes a powerful versioning system that automatically tracks changes:

### Features
- **Automatic Snapshots**: Create version snapshots before major changes
- **Rollback Capability**: Restore any zone to a previous configuration
- **Change Tracking**: View detailed differences between versions
- **Per-User Versioning**: Each user's changes are tracked separately
- **Cleanup**: Automatically keeps the last 100 versions per zone

### Usage
1. Create a snapshot before making changes
2. Make your DNS modifications
3. If something goes wrong, rollback to the previous version
4. Compare versions to see what changed

## BIND Backup System

Generate BIND-compatible zone files for backup and migration:

### Features
- **Standard BIND Format**: Compatible with standard BIND DNS servers
- **Single Zone Export**: Download individual zone files
- **Bulk Export**: Download all accessible zones in one file
- **Named.conf Generation**: Get configuration snippets for BIND
- **Automatic Comments**: Includes metadata and timestamps

### Use Cases
- **Disaster Recovery**: Keep offline backups of your DNS configuration
- **Migration**: Move zones between different DNS systems
- **Compliance**: Meet backup requirements for DNS infrastructure
- **Testing**: Set up test environments with production data

## Usage Limits & Quotas

DNSMate includes configurable limits to prevent abuse:

### Default Limits
- **Zones per User**: 1000 zones maximum
- **Records per Zone**: 5000 records maximum
- **API Tokens per User**: 10 tokens maximum
- **Zone Versions**: 100 versions kept per zone

### Customization
Administrators can adjust limits per user:
```bash
# Update user limits via API
curl -X PATCH "http://localhost:8000/api/users/{user_id}" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "max_zones": 2000,
    "max_records_per_zone": 10000,
    "max_api_tokens": 20
  }'
```

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation. Key development features:

- Hot reload enabled in development mode
- Automatic OpenAPI schema generation
- SQLAlchemy ORM with async support
- Pydantic for data validation
- FastAPI-Users for authentication

### Frontend Development

The frontend is built with modern React patterns:

- TypeScript for type safety
- React Hooks for state management
- Context API for global state
- Tailwind CSS for styling
- Axios for HTTP requests

## Security

- JWT tokens for authentication
- Role-based access control
- Input validation with Pydantic
- CORS protection
- Environment variable configuration

## Production Deployment

### Backend
- Use a production WSGI server (Gunicorn + Uvicorn)
- Configure PostgreSQL instead of SQLite
- Set strong secret keys
- Enable HTTPS
- Configure proper CORS origins

### Frontend
- Build for production: `npm run build`
- Serve static files with a web server
- Configure environment variables
- Enable gzip compression

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the API documentation at `/docs`
- Review the code examples in the repository
