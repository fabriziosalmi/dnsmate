# DNSMate

A modern, full-featured DNS management interface for PowerDNS with user authentication, role-based access control, and a beautiful web interface.

![DNSMate Dashboard](https://via.placeholder.com/800x400/1e3a8a/ffffff?text=DNSMate+Dashboard)

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker and Docker Compose installed
- A PowerDNS instance (or use our test setup)

### Step 1: Clone and Setup
```bash
git clone https://github.com/fabriziosalmi/dnsmate.git
cd dnsmate
```

### Step 2: Start DNSMate
```bash
# Option 1: For testing with a built-in PowerDNS instance (RECOMMENDED)
docker compose --profile with-powerdns up -d

# Option 2: For development with hot reload
./start-dev.sh

# Option 3: Production mode (requires external PowerDNS)
docker compose up -d

# Wait for services to start (about 30-60 seconds)
```

### Step 3: Create Your Admin User
```bash
# Create the first admin user
./create-admin.sh
# Follow the prompts to set email and password
```

### Step 4: Access DNSMate
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

### Step 5: Configure PowerDNS Server
1. Login to DNSMate with your admin credentials
2. Go to **Settings** > **PowerDNS** tab
3. **Option A - Quick Test Setup (Recommended):**
   - Click **"Use Test Server"** in the green card
   - This uses the built-in PowerDNS instance
   - Perfect for testing and learning DNSMate
4. **Option B - Custom Server:**
   - Click **"Add PowerDNS Server"**
   - Fill in your PowerDNS server details
5. Click **"Test Connection"** to verify
6. Click **"Create"** to save

**🎉 You're ready to go!** Start creating DNS zones and records.

### Step 6: Start Managing DNS!
1. Go to **Zones** to create your first DNS zone
2. Add records to your zone
3. Invite other users if needed

---

## 🌟 Features

### Core Features
- **🌐 Web Interface**: Beautiful, responsive DNS management interface
- **🔐 User Management**: Role-based access control (Admin, Editor, Reader)
- **🎯 Zone Management**: Create, edit, and delete DNS zones
- **📝 Record Management**: Full CRUD operations for all DNS record types
- **🔑 API Access**: RESTful API with token authentication

### Advanced Features
- **🔄 Version Control**: Track and rollback DNS changes
- **📦 Backup & Export**: BIND-compatible zone file backups
- **🚀 Multi-Server**: Support for multiple PowerDNS instances
- **⚡ Real-time Validation**: Instant feedback on DNS record validity
- **📊 Connection Testing**: Test PowerDNS connectivity before saving

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

### Admin Role
- ✅ Manage all DNS zones and records
- ✅ User management (create, edit, delete users)
- ✅ PowerDNS server configuration
- ✅ System settings and configuration
- ✅ View all logs and system status
- ✅ No usage limits

### Editor Role
- ✅ Create and manage own DNS zones
- ✅ Manage records in assigned zones
- ✅ Create zone backups and versions
- ✅ Generate API tokens
- ❌ User management
- ❌ System configuration
- 📊 Limited to 1000 zones, 5000 records per zone

### Reader Role
- ✅ View assigned DNS zones and records
- ✅ Download zone backups
- ✅ View zone history
- ❌ Create or modify zones/records
- ❌ User management
- ❌ System configuration
- 📊 No modification limits (read-only)

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
