# 🚀 OSPF Visualizer Pro - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying OSPF Visualizer Pro to a production server.

**Target Server**: 172.16.39.172  
**Username**: vmuser  
**Deployment Path**: `/home/vmuser/ospf-visualizer-pro`

---

## 📋 Prerequisites

### Local Machine Requirements
- ✅ Node.js (v18+)
- ✅ npm (v9+)
- ✅ SSH access to remote server
- ✅ OpenSSL (for generating secrets)
- ✅ Git

### Remote Server Requirements
- ✅ Node.js (v18+) installed
- ✅ npm installed
- ✅ SSH access enabled
- ✅ Ports 3001 and 5173 available
- ✅ At least 1GB free disk space

---

## 🔧 Step 1: Setup SSH Key (First Time Only)

If you haven't set up SSH key authentication yet:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy your public key to the server
ssh-copy-id vmuser@172.16.39.172

# Test connection
ssh vmuser@172.16.39.172 "echo 'SSH works!'"
```

**Expected Output**: `SSH works!`

---

## 🚀 Step 2: Automated Deployment (Recommended)

We've created a fully automated deployment script that handles everything:

### Quick Deploy

```bash
# From your project directory
./deploy.sh production
```

### What the Script Does Automatically

1. ✅ **Pre-deployment Checks**
   - Verifies SSH connection
   - Checks local dependencies
   - Validates project structure

2. ✅ **Generates Production Secrets**
   - Creates secure JWT_SECRET (32 chars)
   - Creates secure SESSION_SECRET (32 chars)
   - Auto-configures .env for production

3. ✅ **Builds Application**
   - Runs all 35 unit tests
   - Builds optimized frontend bundle
   - Validates build artifacts

4. ✅ **Creates Deployment Package**
   - Packages dist, server, and dependencies
   - Includes production .env
   - Creates timestamped archive

5. ✅ **Deploys to Remote Server**
   - Uploads package via SCP
   - Extracts and installs dependencies
   - Sets up directories and permissions

6. ✅ **Starts Application**
   - Launches backend server (port 9081)
   - Launches frontend server (port 9080)
   - Saves process IDs for management

7. ✅ **Verifies Deployment**
   - Tests backend health endpoint
   - Checks frontend accessibility
   - Reports deployment status

### Expected Output

```
=========================================
  OSPF Visualizer Pro Deployment
  Environment: production
  Target: vmuser@172.16.39.172
=========================================

[1/8] Running pre-deployment checks...
✅ SSH connection successful
✅ All required commands available

[2/8] Generating production secrets...
✅ Secrets generated
  JWT_SECRET: AbCdEfGh12... (32 chars)
  SESSION_SECRET: XyZ123Qw... (32 chars)

[3/8] Building application...
  Running tests...
  ✅ Tests passed (35/35)
  Building frontend...
  ✅ Frontend built successfully

[4/8] Creating production .env file...
✅ Production .env created

[5/8] Preparing deployment package...
✅ Deployment package created

[6/8] Deploying to remote server...
  Uploading ospf-visualizer-production-20241130-143022.tar.gz...
✅ Files deployed to remote server

[7/8] Starting application on remote server...
  Starting backend server...
  Backend PID: 12345
✅ Backend started successfully
  Starting frontend preview server...
  Frontend PID: 12346
✅ Application started successfully

[8/8] Verifying deployment...
  ✅ Backend health check passed
  ✅ Frontend is accessible

=========================================
  ✅ DEPLOYMENT SUCCESSFUL!
=========================================

📊 Deployment Information:
  • Environment: production
  • Backend URL: http://172.16.39.172:9081
  • Frontend URL: http://172.16.39.172:9080
  • Deployed Package: ospf-visualizer-production-20241130-143022.tar.gz

🔐 Security Notes:
  • JWT_SECRET: Generated (32 chars)
  • SESSION_SECRET: Generated (32 chars)
  • Database: ./data/ospf-visualizer-production.db

📝 Next Steps:
  1. Test the application: http://172.16.39.172:9080
  2. Monitor logs: ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/*.log'
  3. Check processes: ssh vmuser@172.16.39.172 'ps aux | grep -E "node|vite"'
```

---

## 🧪 Step 3: Test the Deployment

Run comprehensive tests to verify everything works:

```bash
./scripts/test-deployment.sh 172.16.39.172
```

### Test Suite Includes

**Infrastructure Tests (4 tests)**
- Backend health endpoint
- Frontend accessibility
- CORS headers
- Rate limiting

**Authentication API Tests (3 tests)**
- Register endpoint
- Login endpoint  
- Protected endpoint security

**Security Tests (3 tests)**
- Helmet security headers
- XSS protection
- Content Security Policy

**Environment Validation Tests (3 tests)**
- User registration
- JWT token validation
- Logout functionality

**Frontend Tests (3 tests)**
- React root element
- JavaScript module loading
- Demo mode feature

**Performance Tests (2 tests)**
- Backend response time (< 2s)
- Frontend response time (< 5s)

**Database Tests (2 tests)**
- Database file creation
- Database write operations

### Expected Test Output

```
=========================================
  OSPF Visualizer Pro - Deployment Tests
  Target: 172.16.39.172
=========================================

[1] Infrastructure Tests

Testing: Backend health endpoint responds
✅ PASS: Backend health endpoint responds

Testing: Frontend returns 200 status
✅ PASS: Frontend returns 200 status

... (18 more tests) ...

=========================================
  TEST SUMMARY
=========================================

Total Tests: 20
Passed: 20
Failed: 0

✅ ALL TESTS PASSED!

🎉 Deployment is working correctly!

Access your application at:
  🌐 Frontend: http://172.16.39.172:9080
  🔧 Backend: http://172.16.39.172:9081
```

---

## 🔧 Step 4: Application Management

### Check Status

```bash
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/status.sh'
```

### Stop Application

```bash
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/stop.sh'
```

### Restart Application

```bash
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'
```

### View Logs

```bash
# Backend logs
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/backend.log'

# Frontend logs
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/frontend.log'

# Both logs
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/*.log'
```

---

## 🌐 Step 5: Access the Application

### Frontend (Main Application)
🌐 **URL**: http://172.16.39.172:9080

**Features**:
- ✅ Login/Register pages
- ✅ Demo mode (explore without sign-up)
- ✅ Full OSPF network visualization
- ✅ Path analysis and topology design
- ✅ All features working

### Backend API
🔧 **URL**: http://172.16.39.172:9081

**Endpoints**:
- `/api/health` - Health check
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get user info (requires token)
- `/api/auth/logout` - Logout (requires token)

---

## 🔐 Security Configuration

### Generated Secrets

The deployment script automatically generates secure secrets:

```bash
# JWT Secret (used for token signing)
JWT_SECRET=<auto-generated-32-char-secret>

# Session Secret (used for session management)
SESSION_SECRET=<auto-generated-32-char-secret>
```

### CORS Configuration

Automatically configured for your server:

```
ALLOWED_ORIGINS=http://172.16.39.172:9080,http://172.16.39.172:3000
```

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Protected**: All `/api/` endpoints

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

---

## 📊 Monitoring & Troubleshooting

### Check if Services are Running

```bash
ssh vmuser@172.16.39.172 'ps aux | grep -E "(node|vite)" | grep -v grep'
```

Expected output:
```
vmuser  12345  ... node server/index.js
vmuser  12346  ... vite preview
```

### Test Backend Health

```bash
curl http://172.16.39.172:9081/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-11-30T14:30:22.123Z"}
```

### Test Frontend

```bash
curl -I http://172.16.39.172:9080
```

Expected response:
```
HTTP/1.1 200 OK
...
```

### Common Issues

#### Issue: "Cannot connect to backend"
**Solution**:
```bash
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'
```

#### Issue: "Port already in use"
**Solution**:
```bash
ssh vmuser@172.16.39.172 'pkill -f "node server"; pkill -f "vite"'
# Then redeploy
./deploy.sh production
```

#### Issue: "Database error"
**Solution**:
```bash
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && rm -rf data && mkdir data'
# Then restart
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'
```

---

## 🔄 Updating the Application

To deploy updates:

```bash
# Pull latest code
git pull

# Redeploy
./deploy.sh production
```

The script will:
1. Stop old processes
2. Deploy new version
3. Start updated application

---

## 📦 Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Build Locally

```bash
npm run build
```

### 2. Generate Secrets

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=${JWT_SECRET}"

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)
echo "SESSION_SECRET=${SESSION_SECRET}"
```

### 3. Create .env

```bash
cat > .env.production << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
SESSION_SECRET=${SESSION_SECRET}
DB_PATH=./data/ospf-visualizer-production.db
ALLOWED_ORIGINS=http://172.16.39.172:9080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
EOF
```

### 4. Package and Upload

```bash
# Create package
tar -czf deploy.tar.gz dist server package.json .env.production

# Upload
scp deploy.tar.gz vmuser@172.16.39.172:~/

# SSH and extract
ssh vmuser@172.16.39.172
mkdir -p ospf-visualizer-pro
cd ospf-visualizer-pro
tar -xzf ~/deploy.tar.gz
mv .env.production .env
```

### 5. Install and Start

```bash
# On remote server
npm ci --production
mkdir -p data logs

# Start backend
nohup node server/index.js > logs/backend.log 2>&1 &

# Start frontend
nohup npx vite preview --host 0.0.0.0 --port 9080 > logs/frontend.log 2>&1 &
```

---

## 🎯 Production Checklist

Before going live, verify:

- [ ] ✅ All tests passing (20/20)
- [ ] ✅ Backend health endpoint works
- [ ] ✅ Frontend loads correctly
- [ ] ✅ Demo mode accessible
- [ ] ✅ User registration works
- [ ] ✅ User login works
- [ ] ✅ JWT authentication working
- [ ] ✅ CORS configured correctly
- [ ] ✅ Rate limiting active
- [ ] ✅ Database persists data
- [ ] ✅ Logs being written
- [ ] ✅ Process management working
- [ ] ✅ Secure secrets generated
- [ ] ✅ No .env files in git

---

## 📱 Post-Deployment

### Share with Users

```
🌐 OSPF Visualizer Pro is now live!

Access the application at:
http://172.16.39.172:9080

Features:
✅ Interactive network topology visualization
✅ Shortest path calculation (Dijkstra)
✅ Network health monitoring
✅ Scenario planning
✅ Impact analysis
✅ Demo mode (no sign-up required)

Getting Started:
1. Click "Try Demo Mode" to explore without registration
2. Or create an account to save your work

Need help? Contact your administrator.
```

### Monitor for First Few Days

```bash
# Check every hour
watch -n 3600 './scripts/test-deployment.sh 172.16.39.172'

# Monitor logs continuously
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/*.log'
```

---

## 🆘 Support

### Quick Commands Reference

```bash
# Deploy
./deploy.sh production

# Test
./scripts/test-deployment.sh 172.16.39.172

# Status
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/status.sh'

# Restart
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'

# Logs
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/*.log'

# Stop
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/stop.sh'
```

### Getting Help

1. Check logs first: `ssh vmuser@172.16.39.172 'tail -100 ospf-visualizer-pro/logs/backend.log'`
2. Run tests: `./scripts/test-deployment.sh 172.16.39.172`
3. Check status: `ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/status.sh'`
4. Try restarting: `ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'`

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ All 20 tests pass
- ✅ Backend returns `{"status":"ok"}` at health endpoint
- ✅ Frontend loads at http://172.16.39.172:9080
- ✅ You can register a new user
- ✅ You can login with that user
- ✅ Demo mode button is visible and works
- ✅ Network visualization loads and works

**Congratulations! Your OSPF Visualizer Pro is now in production! 🎉**

---

**Generated**: 2024-11-30  
**Version**: 1.0.0  
**Target Server**: 172.16.39.172  
**Status**: Ready for Production
