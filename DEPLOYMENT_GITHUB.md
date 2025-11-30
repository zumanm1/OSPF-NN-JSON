# 🚀 GitHub Deployment Guide

## Quick Deploy from GitHub

This guide shows you how to deploy OSPF Visualizer Pro directly from GitHub with automatic dependency installation.

---

## ⚡ One-Command Deployment

```bash
./deploy-github.sh
```

That's it! The script handles everything automatically.

---

## 📋 What the Script Does

### 1. **Kill Existing Processes** ✅
   - Automatically finds and kills processes on ports 9080 and 9081
   - Ensures clean deployment without port conflicts

### 2. **Check Prerequisites** ✅
   - Verifies Node.js, npm, and Git are installed
   - Shows version information

### 3. **Pull Latest Code** ✅
   - Fetches latest changes from GitHub
   - Stashes local changes if needed
   - Updates to latest commit on current branch

### 4. **Install Dependencies** ✅
   - Runs `npm ci` for clean dependency install
   - Falls back to `npm install` if needed
   - Ensures all packages are up-to-date

### 5. **Verify Environment** ✅
   - Checks for `.env` file
   - Creates from `.env.example` if missing
   - Validates required environment variables
   - Automatically updates ports to 9080/9081

### 6. **Build Application** ✅
   - Runs all 35 unit tests
   - Builds optimized production bundle
   - Fails if tests or build fail

### 7. **Start Services** ✅
   - Starts backend server on port 9081
   - Starts frontend server on port 9080
   - Saves process IDs for management

### 8. **Verify Deployment** ✅
   - Tests backend health endpoint
   - Checks frontend accessibility
   - Reports deployment status

---

## 🎯 Port Configuration

- **Frontend**: Port 9080 (changed from 5173)
- **Backend**: Port 9081 (changed from 3001)

All documentation and scripts have been updated to reflect these ports.

---

## 📦 Before First Deploy

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
```

### 2. Configure Environment

The script will create `.env` from `.env.example` if it doesn't exist. For production, update:

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Update .env file
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "SESSION_SECRET=$SESSION_SECRET" >> .env
```

### 3. Make Script Executable

```bash
chmod +x deploy-github.sh
```

---

## 🚀 Deployment Scenarios

### Scenario 1: Local Development Machine

```bash
# Pull latest and deploy
./deploy-github.sh

# Access at:
# Frontend: http://localhost:9080
# Backend: http://localhost:9081
```

### Scenario 2: Remote Server

```bash
# SSH to server
ssh user@your-server.com

# Clone and deploy
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
./deploy-github.sh

# Access at:
# Frontend: http://your-server.com:9080
# Backend: http://your-server.com:9081
```

### Scenario 3: Update Existing Deployment

```bash
# Just run deploy script - it pulls latest automatically
./deploy-github.sh
```

---

## 🔧 Management Commands

### Check Running Processes

```bash
ps aux | grep -E "node|vite"
```

### View Logs

```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log

# Both
tail -f logs/*.log
```

### Stop Services

```bash
# Stop backend
kill $(cat .backend.pid)

# Stop frontend
kill $(cat .frontend.pid)

# Stop both
kill $(cat .backend.pid) $(cat .frontend.pid)
```

### Restart Services

```bash
# Just run deploy script again
./deploy-github.sh
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use

**Solution**: The script automatically kills processes on ports 9080 and 9081.

If manual intervention is needed:

```bash
# Find and kill process on port 9081 (backend)
lsof -ti:9081 | xargs kill -9

# Find and kill process on port 9080 (frontend)
lsof -ti:9080 | xargs kill -9

# Then redeploy
./deploy-github.sh
```

### Issue: Git Pull Fails

**Error**: `You have unstaged changes`

**Solution**: The script automatically stashes changes, but you can also:

```bash
# Commit your changes
git add .
git commit -m "Local changes"

# Or discard changes
git reset --hard HEAD

# Then redeploy
./deploy-github.sh
```

### Issue: Tests Fail

**Error**: `❌ Tests failed`

**Solution**: Fix the failing tests before deploying:

```bash
# Run tests locally to see failures
npm test

# Fix the issues, commit, and push
git add .
git commit -m "Fix failing tests"
git push

# Then redeploy
./deploy-github.sh
```

### Issue: Build Fails

**Error**: `❌ Build failed`

**Solution**: Check for TypeScript or build errors:

```bash
# Run build locally to see errors
npm run build

# Fix the issues
# Then commit and push
git add .
git commit -m "Fix build errors"
git push

# Redeploy
./deploy-github.sh
```

### Issue: Backend Won't Start

**Check logs**:

```bash
cat logs/backend.log
```

**Common causes**:
- Missing `.env` file → Script creates it automatically
- Invalid JWT_SECRET → Generate new: `openssl rand -base64 32`
- Database permission issues → Check `./data/` folder permissions

### Issue: Frontend Won't Start

**Check logs**:

```bash
cat logs/frontend.log
```

**Common causes**:
- Build artifacts missing → Script rebuilds automatically
- Port 9080 in use → Script kills existing processes
- Node version incompatible → Requires Node 18+

---

## 📊 Deployment Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Developer pushes code to GitHub                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  2. Run ./deploy-github.sh on target machine        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  3. Script pulls latest code from GitHub            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  4. Script installs dependencies (npm ci)            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  5. Script runs tests and builds application         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  6. Script kills old processes (9080/9081)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  7. Script starts new backend (9081) & frontend (9080)│
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  8. Application is live! 🎉                          │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] ✅ Generate unique JWT_SECRET: `openssl rand -base64 32`
- [ ] ✅ Generate unique SESSION_SECRET: `openssl rand -base64 32`
- [ ] ✅ Update ALLOWED_ORIGINS in `.env` with your domain
- [ ] ✅ Ensure `.env` is NOT committed to Git (check `.gitignore`)
- [ ] ✅ Set up firewall rules for ports 9080 and 9081
- [ ] ✅ Use HTTPS in production (consider reverse proxy)
- [ ] ✅ Regular security updates: `npm audit fix`
- [ ] ✅ Monitor logs for suspicious activity
- [ ] ✅ Set up database backups

---

## 📈 Performance Tips

### 1. Use PM2 for Production

```bash
npm install -g pm2

# Start with PM2
pm2 start server/index.js --name ospf-backend
pm2 start "npx vite preview --host 0.0.0.0 --port 9080" --name ospf-frontend

# Save configuration
pm2 save

# Auto-restart on reboot
pm2 startup
```

### 2. Use Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:9080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:9081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable Compression

Already enabled in Vite build. For nginx:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/OSPF-NN-JSON
            ./deploy-github.sh
```

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Script completes without errors
- ✅ Backend health check passes: `curl http://localhost:9081/api/health`
- ✅ Frontend loads: `curl -I http://localhost:9080`
- ✅ You can access http://localhost:9080 in browser
- ✅ You can register and login
- ✅ Demo mode works
- ✅ Network visualization displays correctly
- ✅ All features functional

---

## 📞 Support

### Quick Commands

```bash
# Deploy/Update
./deploy-github.sh

# Check status
ps aux | grep -E "node|vite"

# View logs
tail -f logs/*.log

# Stop services
kill $(cat .backend.pid) $(cat .frontend.pid)
```

### Documentation

- **Full Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **VM Deployment**: `README_DEPLOYMENT.md`
- **Authentication Setup**: `AUTH_SETUP.md`
- **Quick Start**: `QUICKSTART.md`

---

## ✅ Summary

The GitHub deployment script provides:

✅ **Automatic dependency installation** - No manual `npm install` needed  
✅ **Port conflict resolution** - Automatically kills processes on 9080/9081  
✅ **Latest code deployment** - Pulls from GitHub automatically  
✅ **Quality assurance** - Runs tests and builds before deploying  
✅ **Process management** - Tracks PIDs for easy management  
✅ **Health verification** - Ensures services started successfully  
✅ **Comprehensive logging** - All output saved to log files  

**Deploy in one command**: `./deploy-github.sh` 🚀

---

**Last Updated**: 2024-11-30  
**Ports**: Frontend 9080, Backend 9081  
**Repository**: https://github.com/zumanm1/OSPF-NN-JSON
