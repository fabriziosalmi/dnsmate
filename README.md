# DNSMate

A modern, full-featured DNS management interface for PowerDNS with user authentication, role-based access control, automatic versioning, and a beautiful web interface.

![DNSMate Dashboard](https://via.placeholder.com/800x400/1e3a8a/ffffff?text=DNSMate+Dashboard)

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker and Docker Compose installed
- A PowerDNS instance (or use our built-in test setup)

### Step 1: Clone and Setup
```bash
git clone https://github.com/fabriziosalmi/dnsmate.git
cd dnsmate
```

### Step 2: Start DNSMate with Built-in PowerDNS
```bash
# Recommended: Complete development environment with PowerDNS
make dev-full

# Alternative: Manual Docker Compose
docker compose --profile with-powerdns up -d

# Wait for services to start (about 30-60 seconds)
./health-check.sh  # Check if everything is ready
```

### Step 3: Try the Demo Environment
```bash
# Set up demo users and sample zones (RECOMMENDED for first-time users)
make demo-setup

# This creates:
# - Demo admin, editor, reader, and manager users
# - Sample DNS zones with realistic records
# - Perfect for exploring all features
```

### Step 4: Access DNSMate
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

### Step 5: Login with Demo Accounts
Try different user roles to see the full feature set:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| 👑 **Admin** | `demo.admin@dnsmate.com` | `demo123` | Full system access |
| ✏️ **Editor** | `demo.editor@dnsmate.com` | `demo123` | Zone creation & editing |
| 🏢 **Manager** | `demo.manager@dnsmate.com` | `demo123` | Assigned zone management |
| 👁️ **Reader** | `demo.reader@dnsmate.com` | `demo123` | Read-only access |

### Step 6: Configure Your Own PowerDNS (Optional)
1. Login as admin → **Settings** → **PowerDNS** tab
2. **Quick Setup**: Click "Use Test Server" for built-in PowerDNS
3. **Custom Setup**: Add your own PowerDNS server details
4. Test connection and save

**🎉 You're ready to go!** Explore DNS management, user roles, automatic versioning, and more.

---

## 🌟 Features

### 🔥 **New & Enhanced Features**
- **🤖 Automatic Versioning**: Track all DNS changes automatically with configurable settings
- **👥 Demo Environment**: Pre-configured users and zones to showcase all features
- **🔧 Smart Error Handling**: No more confusing error messages for empty states
- **🎯 Role-Based Demo**: Experience admin, editor, reader, and manager roles instantly
- **⚡ Health Checks**: Built-in system health monitoring and verification
- **🧪 End-to-End Testing**: Comprehensive Playwright tests for reliability

### Core Features
- **🌐 Web Interface**: Beautiful, responsive DNS management interface
- **🔐 User Management**: Role-based access control (Admin, Editor, Reader)
- **🎯 Zone Management**: Create, edit, and delete DNS zones
- **📝 Record Management**: Full CRUD operations for all DNS record types
- **🔑 API Access**: RESTful API with token authentication

### Advanced Features
- **🔄 Version Control**: Track and rollback DNS changes with automatic versioning
- **📦 Backup & Export**: BIND-compatible zone file backups
- **🚀 Multi-Server**: Support for multiple PowerDNS instances
- **⚡ Real-time Validation**: Instant feedback on DNS record validity
- **📊 Connection Testing**: Test PowerDNS connectivity before saving
- **🎭 Demo Mode**: Complete demonstration environment for evaluation

---

## 🎭 Demo Environment

DNSMate includes a comprehensive demo environment to showcase all features:

### Quick Demo Setup
```bash
# Start DNSMate with PowerDNS
make dev-full

# Set up demo users and zones
make demo-setup

# Visit http://localhost:3000 and login with demo accounts
```

### Demo Users & Capabilities

| User | Credentials | Features You Can Explore |
|------|-------------|---------------------------|
| **👑 Admin** | `demo.admin@dnsmate.com` / `demo123` | User management, system settings, auto-versioning config, all zones |
| **✏️ Editor** | `demo.editor@dnsmate.com` / `demo123` | Zone creation, record management, API tokens, version history |
| **🏢 Manager** | `demo.manager@dnsmate.com` / `demo123` | Assigned zone management, limited access control |
| **👁️ Reader** | `demo.reader@dnsmate.com` / `demo123` | Read-only zone browsing, backup downloads |

### Demo Scenarios
1. **Admin Experience**: User management, PowerDNS configuration, auto-versioning settings
2. **Editor Workflow**: Creating zones, adding records, generating API tokens
3. **Manager Collaboration**: Working with assigned zones, team permissions
4. **Reader Access**: Browsing DNS data, downloading backups

### Clean Up Demo
```bash
# Remove demo users and zones
make demo-cleanup
```

---

## 🤖 Automatic Versioning

DNSMate now features intelligent automatic versioning to track all DNS changes:

### Features
- **🔄 Auto-Version Creation**: Automatically create versions on zone/record changes
- **⚙️ Configurable Settings**: Fine-tune what triggers version creation
- **📊 Retention Management**: Automatic cleanup of old versions
- **🔍 Change Tracking**: Complete audit trail of all modifications

### Configuration (Admin Only)
1. Go to **Settings** → **Auto Versioning** tab
2. Configure your preferences:
   - **Enable Auto-versioning**: Master switch for automatic versions
   - **Version on Record Changes**: Track DNS record modifications
   - **Version on Zone Changes**: Track zone setting changes
   - **Max Versions per Zone**: Limit storage (10-500 versions)
   - **Retention Period**: Auto-delete old versions (7-365 days)

### Benefits
- **Never Lose Changes**: Every modification is automatically saved
- **Easy Rollbacks**: Restore previous states with one click
- **Compliance**: Complete audit trail for regulatory requirements
- **Team Collaboration**: See who changed what and when

---

## 🛠️ Make Commands

DNSMate includes helpful Make commands for easy management:

### Development Commands
```bash
make dev-full        # Complete dev environment with PowerDNS
make dev             # Basic development environment
make stop            # Stop all services
make clean           # Clean up Docker resources
make health-check    # Check system health
```

### Demo & Testing Commands
```bash
make demo-setup      # Create demo users and zones
make demo-users      # Create demo users only
make demo-cleanup    # Remove all demo data
make test-flows      # Run user flow tests
make test-integration # Run PowerDNS integration tests
make test-e2e        # Run end-to-end tests
```

### Production Commands
```bash
make prod            # Start production environment
make migrate         # Run database migrations
make create-user     # Create admin user interactively
make backup          # Create database backup
make logs            # View all service logs
```

---

## 🧪 Testing & Quality Assurance

DNSMate includes comprehensive testing to ensure reliability:

### Automated Tests
- **End-to-End Tests**: Playwright tests covering complete user workflows
- **Integration Tests**: PowerDNS API integration verification
- **User Flow Tests**: Role-based access and permission testing
- **Health Checks**: Service availability and connectivity monitoring

### Running Tests
```bash
# Run all test suites
make test-e2e

# Run specific test types
make test-flows       # User authentication and navigation
make test-integration # PowerDNS connectivity and operations
make test-verify      # Data consistency between UI and PowerDNS

# Development testing with hot reload
make test-watch
```

### Quality Features
- **Smart Error Handling**: Graceful degradation and helpful error messages
- **Input Validation**: Real-time validation of DNS records and zones
- **Connection Testing**: Verify PowerDNS connectivity before saving
- **Data Consistency**: Ensure UI data matches PowerDNS backend

---

## 📖 How to Use DNSMate

### For First-Time Users

#### 1. Environment Setup
Create your environment configuration:
```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env
```

Key settings in `.env`:
```env
# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://dnsmate:password@postgres:5432/dnsmate

# Security
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET=your-jwt-secret-key

# PowerDNS (optional - can be configured via web interface)
POWERDNS_API_URL=http://your-powerdns:8081
POWERDNS_API_KEY=your-api-key

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

#### 2. Production Deployment
```bash
# Start production services
docker-compose -f docker-compose.yml up -d

# Create admin user
docker-compose exec backend python create_admin_user.py
```

### For Administrators

#### Adding PowerDNS Servers
1. **Via Web Interface** (Recommended):
   - Login as admin
   - Go to Settings → PowerDNS tab
   - Click "Add PowerDNS Server"
   - Fill in connection details
   - Test connection before saving

2. **PowerDNS Configuration Requirements**:
   Your PowerDNS instance needs these settings in `pdns.conf`:
   ```ini
   # Enable API
   api=yes
   api-key=your-secure-api-key
   
   # Enable webserver for API access
   webserver=yes
   webserver-port=8081
   webserver-address=0.0.0.0
   webserver-allow-from=0.0.0.0/0
   
   # Optional: Enable CORS if needed
   webserver-allow-cors-from=*
   ```

#### Managing Users
1. Go to **User Management** (admin only)
2. Click **"Add User"** to invite new users
3. Set their role:
   - **Admin**: Full access to everything
   - **Editor**: Can manage assigned zones
   - **Reader**: Read-only access to assigned zones

#### User Permissions
- Assign zones to users in the User Management section
- Users can only see zones they have access to
- Admins see all zones by default

### For Regular Users

#### Managing DNS Zones
1. **Create a Zone**:
   - Go to **Zones** → **"Create Zone"**
   - Enter domain name (e.g., `example.com`)
   - Click **"Create"**

2. **Add DNS Records**:
   - Click on a zone to view records
   - Click **"Add Record"**
   - Choose record type and fill details:
     ```
     A Record:     www.example.com → 192.168.1.100
     CNAME:        blog.example.com → www.example.com
     MX Record:    example.com → mail.example.com (priority: 10)
     TXT Record:   example.com → "v=spf1 include:_spf.google.com ~all"
     ```

3. **Edit/Delete Records**:
   - Click the edit button on any record
   - Make changes and save
   - Use delete button to remove records

#### API Access
1. **Create API Token**:
   - Go to **Token Management**
   - Click **"Generate New Token"**
   - Save the token securely (it won't be shown again)

2. **Use API**:
   ```bash
   # List zones
   curl -H "Authorization: Bearer dnsmate_your_token" \
        http://localhost:8000/api/zones/
   
   # Add A record
   curl -X POST \
        -H "Authorization: Bearer dnsmate_your_token" \
        -H "Content-Type: application/json" \
        -d '{"name":"api.example.com","type":"A","content":"1.2.3.4","ttl":300}' \
        http://localhost:8000/api/records/example.com
   ```

---

## 🔧 Configuration Guide

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | Database connection string | SQLite file | ✅ |
| `SECRET_KEY` | Application secret key | - | ✅ |
| `JWT_SECRET` | JWT token signing key | - | ✅ |
| `POWERDNS_API_URL` | PowerDNS API endpoint | - | Optional* |
| `POWERDNS_API_KEY` | PowerDNS API key | - | Optional* |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `["*"]` | No |

*PowerDNS settings can be configured via the web interface instead of environment variables.

### Docker Compose Services

The application consists of several services:

- **Frontend** (port 3000): React web interface
- **Backend** (port 8000): FastAPI REST API
- **Database** (port 5432): PostgreSQL database
- **PowerDNS** (port 53, 8081): Optional test DNS server

### Development vs Production

**Development** (`docker-compose.dev.yml`):
- Hot reload for code changes
- SQLite database
- Debug logging enabled
- CORS allows all origins

**Production** (`docker-compose.yml`):
- Optimized builds
- PostgreSQL database
- Production logging
- Secure CORS settings

---

## 🛠️ Development

### Local Development Setup

1. **Backend Development**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Copy and configure environment
   cp .env.example .env
   
   # Run development server
   python run.py
   ```

2. **Frontend Development**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Project Structure
```
dnsmate/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/routes/    # API endpoints
│   │   ├── core/          # Auth & config
│   │   ├── models/        # Database models
│   │   ├── schemas/       # API schemas
│   │   └── services/      # Business logic
│   ├── migrations/        # Database migrations
│   └── requirements.txt
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # State management
│   │   └── services/      # API clients
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml     # Production setup
├── docker-compose.dev.yml # Development setup
└── README.md
```

### API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## 🚀 Production Deployment

### Using Docker (Recommended)

1. **Prepare Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production settings
   ```

2. **Deploy**:
   ```bash
   docker-compose up -d
   ```

3. **Create Admin User**:
   ```bash
   docker-compose exec backend python create_admin_user.py
   ```

4. **Configure Reverse Proxy** (nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Production Checklist

- [ ] Use PostgreSQL instead of SQLite
- [ ] Set strong, unique `SECRET_KEY` and `JWT_SECRET`
- [ ] Configure proper CORS origins
- [ ] Use HTTPS in production
- [ ] Set up regular database backups
- [ ] Monitor application logs
- [ ] Configure PowerDNS with secure API key

---

## 🤝 User Roles & Permissions

### 👑 Admin Role
- ✅ **Full System Control**: Manage all DNS zones and records
- ✅ **User Management**: Create, edit, delete users and assign permissions
- ✅ **System Configuration**: PowerDNS servers, auto-versioning settings
- ✅ **Advanced Features**: System monitoring, audit logs, backups
- ✅ **API Access**: Generate and manage API tokens
- ✅ **No Limits**: Unlimited zones, records, and system access

**Perfect for**: System administrators, DNS infrastructure managers

### ✏️ Editor Role  
- ✅ **Zone Management**: Create and manage own DNS zones
- ✅ **Record Operations**: Full CRUD operations on assigned zones
- ✅ **Version Control**: Create versions and rollback changes
- ✅ **API Access**: Generate personal API tokens
- ✅ **Export Features**: Download zone files and backups
- ❌ **No User Management**: Cannot create or modify users
- ❌ **No System Config**: Cannot change system-wide settings
- 📊 **Limits**: 1000 zones, 5000 records per zone

**Perfect for**: DNS engineers, developers, domain managers

### 🏢 Manager Role (Editor with Restrictions)
- ✅ **Assigned Zones**: Manage specific zones assigned by admins
- ✅ **Team Collaboration**: Work within assigned zone boundaries
- ✅ **Record Management**: Full record operations within scope
- ✅ **Limited API Access**: Generate tokens for assigned zones only
- ❌ **No New Zones**: Cannot create zones without admin approval
- ❌ **No System Access**: Limited to assigned resources
- 📊 **Limits**: Based on admin assignments

**Perfect for**: Team leads, department DNS managers, project coordinators

### 👁️ Reader Role
- ✅ **View Access**: Browse assigned DNS zones and records
- ✅ **Export Features**: Download zone files and view history
- ✅ **Version History**: View change logs and version details
- ✅ **Read-Only API**: Generate tokens for data consumption
- ❌ **No Modifications**: Cannot create, edit, or delete anything
- ❌ **No Management**: No access to admin or user features
- 📊 **No Limits**: Unlimited read access to assigned zones

**Perfect for**: Monitoring systems, compliance teams, stakeholders

### 🔐 Permission System
- **Zone-Level Permissions**: Granular access control per DNS zone
- **Inheritance Model**: Admins see all, others see assigned zones only
- **API Token Scope**: Tokens inherit user's permission level
- **Audit Trail**: All permission changes are logged and versioned

---

## 🐛 Troubleshooting & Maintenance

### Common Issues

#### 🔌 Service Connection Issues
```bash
# PowerDNS API Connection
curl http://localhost:8081/api/v1/servers
# If fails: check PowerDNS configuration and restart
docker-compose -f docker-compose.dev.yml restart powerdns

# Backend API Connection  
curl http://localhost:8000/health
# If fails: check backend logs
docker-compose logs backend

# Frontend Loading Issues
curl http://localhost:3000
# If fails: check if frontend built correctly
cd frontend && npm run build
```

#### 🗄️ Database Issues
```bash
# Reset and recreate database
cd backend
rm -f test.db
alembic downgrade base
alembic upgrade head

# PostgreSQL connection issues
docker-compose logs db
# Check DATABASE_URL in .env file
```

#### 🔑 Authentication Problems
```bash
# Create new admin user
docker-compose exec backend python create_admin_user.py

# Reset user password
docker-compose exec backend python -c "
from app.core.database import get_session
from app.models.user import User
# ... reset logic here
"
```

#### 🌐 Network & Port Conflicts
```bash
# Check what's using ports
lsof -i :3000  # Frontend (React)
lsof -i :8000  # Backend (FastAPI)  
lsof -i :5432  # PostgreSQL
lsof -i :8081  # PowerDNS API
lsof -i :53    # DNS (PowerDNS)

# Stop conflicting services
sudo lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
```

#### 🔧 Development Issues
```bash
# Frontend build errors
cd frontend
rm -rf node_modules package-lock.json .next
npm install
npm run build

# Backend dependency issues  
cd backend
pip install --upgrade -r requirements.txt
# Or rebuild Docker images
docker-compose build --no-cache
```

### 📊 System Health Monitoring

#### Automated Health Checks
```bash
# Run comprehensive health check
./health-check.sh

# Quick service verification
make health-check
```

#### Manual Service Checks  
```bash
# Individual service health
curl http://localhost:8000/health      # Backend health
curl http://localhost:3000             # Frontend availability  
curl http://localhost:8081/api/v1/servers  # PowerDNS API

# Database connectivity
docker-compose exec backend python -c "
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print('Database OK' if result.fetchone() else 'Database Failed')
"
```

### 🔍 Log Analysis & Debugging

#### Service Logs
```bash
# Real-time log monitoring
docker-compose logs -f dnsmate-backend
docker-compose logs -f dnsmate-frontend  
docker-compose logs -f powerdns
docker-compose logs -f db

# Combined logs with timestamps
docker-compose logs -f --timestamps

# Filter logs by level
docker-compose logs backend | grep ERROR
docker-compose logs backend | grep INFO
```

#### Application-Specific Debugging
```bash
# Backend debug mode
DNSMATE_LOG_LEVEL=DEBUG docker-compose up backend

# Frontend development with debug
cd frontend
REACT_APP_DEBUG=true npm start

# Database query debugging
DNSMATE_DATABASE_ECHO=true docker-compose up backend
```

### 🧹 Maintenance Tasks

#### Regular Cleanup
```bash
# Clean demo data and reset
make demo-cleanup
make demo-setup

# Docker system cleanup
docker system prune -a
docker volume prune

# Clear application logs
docker-compose down
docker-compose rm -f
docker-compose up -d
```

#### Database Maintenance
```bash
# Create database backup
docker-compose exec db pg_dump -U dnsmate dnsmate > backup.sql

# Optimize database (PostgreSQL)
docker-compose exec db psql -U dnsmate -d dnsmate -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec db psql -U dnsmate -d dnsmate -c "
SELECT pg_size_pretty(pg_database_size('dnsmate')) as database_size;
"
```

#### Performance Optimization
```bash
# Monitor resource usage
docker stats

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/zones

# Frontend bundle analysis
cd frontend
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

### 🚨 Emergency Recovery

#### Complete System Reset
```bash
# Nuclear option: reset everything
docker-compose down -v
docker system prune -a -f
rm -rf backend/test.db
git clean -fdx
make demo-setup
```

#### Service-Specific Recovery
```bash
# Backend only reset
docker-compose stop backend
docker-compose rm -f backend
docker-compose up -d backend

# Frontend only reset  
docker-compose stop frontend
docker-compose rm -f frontend
cd frontend && rm -rf build node_modules
docker-compose up -d frontend

# Database only reset
docker-compose stop db
docker-compose rm -f db
docker volume rm dnsmate_postgres_data
docker-compose up -d db
make migrate
```

### 📈 Performance Monitoring

#### Key Metrics to Watch
- **Response Time**: API endpoints should respond in < 200ms
- **Memory Usage**: Backend should use < 512MB RAM
- **Database Connections**: Monitor for connection leaks
- **Error Rates**: Should be < 1% of total requests

#### Monitoring Commands
```bash
# API response times
curl -w "Total: %{time_total}s\n" http://localhost:8000/api/zones

# Memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Database connections
docker-compose exec db psql -U dnsmate -d dnsmate -c "
SELECT count(*) as active_connections FROM pg_stat_activity;
"
```

---

## ❓ Troubleshooting

### Common Issues

**"Failed to fetch PowerDNS settings"**
- Check that PowerDNS API is enabled and accessible
- Verify API key is correct
- Check network connectivity between DNSMate and PowerDNS

**"Authentication required" errors**
- Make sure you're logged in as an admin user
- Check that JWT tokens haven't expired
- Verify API tokens are correctly formatted (`dnsmate_` prefix)

**Zones not showing up**
- Ensure user has permissions to the zone
- Check that PowerDNS server is configured and connected
- Verify zone exists in PowerDNS backend

**Connection refused to database**
- Make sure PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists and is accessible

### Health Checks
```bash
# Check if all services are running
docker-compose ps

# Check service health
curl http://localhost:8000/api/health

# View service logs
docker-compose logs backend
docker-compose logs frontend
```

### Getting Help
- 📖 Check the [API Documentation](http://localhost:8000/docs)
- 🐛 [Report Issues](https://github.com/fabriziosalmi/dnsmate/issues)
- 💬 [Discussion Forum](https://github.com/fabriziosalmi/dnsmate/discussions)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Made with ❤️ for the DNS community**
