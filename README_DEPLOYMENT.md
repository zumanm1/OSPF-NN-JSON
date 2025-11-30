# 🚀 Quick Start: Deploy to Production Server

## One-Command Deployment

Deploy your OSPF Visualizer Pro to **172.16.39.172** in one command:

```bash
./deploy.sh production
```

That's it! The script handles everything automatically.

---

## What Gets Deployed

✅ **Backend Server** (Port 3001)
- Express API with JWT authentication
- SQLite database
- Health monitoring
- Rate limiting & security headers

✅ **Frontend App** (Port 5173)
- React application with Vite
- OSPF network visualizer
- Demo mode enabled
- All features working

✅ **Security**
- Auto-generated JWT secrets (32 chars)
- Environment validation
- CORS protection
- Password encryption

---

## Quick Test

After deployment, test everything:

```bash
./scripts/test-deployment.sh 172.16.39.172
```

**Expected**: 20/20 tests pass ✅

---

## Access Your App

🌐 **Frontend**: http://172.16.39.172:9080  
🔧 **Backend**: http://172.16.39.172:9081/api/health

---

## Management Commands

```bash
# Check status
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/status.sh'

# View logs
ssh vmuser@172.16.39.172 'tail -f ospf-visualizer-pro/logs/*.log'

# Restart
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'

# Stop
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/stop.sh'
```

---

## First Time Setup

If you haven't connected to the server before:

```bash
# Setup SSH key
ssh-copy-id vmuser@172.16.39.172

# Test connection
ssh vmuser@172.16.39.172 "echo 'Connected!'"
```

---

## Files Created

- `deploy.sh` - Main deployment script
- `scripts/test-deployment.sh` - 20 automated tests
- `scripts/status.sh` - Check app status
- `scripts/restart.sh` - Restart services
- `scripts/stop.sh` - Stop services
- `.env.production` - Production environment template
- `DEPLOYMENT_GUIDE.md` - Full documentation

---

## What Happens During Deployment

1. **Pre-flight Checks** - Verifies SSH, dependencies
2. **Generate Secrets** - Creates secure JWT/session keys
3. **Build App** - Runs tests (35), builds frontend
4. **Package** - Creates deployment archive
5. **Upload** - Sends to server via SCP
6. **Install** - Installs dependencies on server
7. **Start** - Launches backend & frontend
8. **Verify** - Tests health endpoints

**Time**: ~5-10 minutes

---

## Troubleshooting

### Can't connect to server?
```bash
ssh-copy-id vmuser@172.16.39.172
```

### Tests failing?
```bash
# Check logs
ssh vmuser@172.16.39.172 'tail -50 ospf-visualizer-pro/logs/backend.log'

# Restart
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/restart.sh'
```

### Port already in use?
```bash
ssh vmuser@172.16.39.172 'pkill -f node; pkill -f vite'
./deploy.sh production
```

---

## Full Documentation

See **`DEPLOYMENT_GUIDE.md`** for complete details including:
- Manual deployment steps
- Security configuration
- Monitoring & alerts
- Production checklist
- Common issues & solutions

---

## Success Criteria

Your deployment is working when:

- ✅ `curl http://172.16.39.172:9081/api/health` returns `{"status":"ok"}`
- ✅ Browser loads http://172.16.39.172:9080
- ✅ You can register a user
- ✅ Demo mode works
- ✅ All 20 tests pass

---

## Support

**Quick Commands**:
```bash
./deploy.sh production                                    # Deploy
./scripts/test-deployment.sh 172.16.39.172              # Test
ssh vmuser@172.16.39.172 'cd ospf-visualizer-pro && ./scripts/status.sh'  # Status
```

**Documentation**:
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `FIXES_SUMMARY.md` - All bugs fixed
- `BUGS_FOUND.md` - Bug analysis report

---

**Ready to deploy? Run**: `./deploy.sh production` 🚀
