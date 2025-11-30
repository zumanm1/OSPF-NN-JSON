#!/bin/bash

# ========================================
# OSPF Visualizer Pro - Automated Deployment Script
# ========================================
# This script automates the deployment process to a remote server
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production
# ========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
REMOTE_USER="vmuser"
REMOTE_HOST="172.16.39.172"
REMOTE_PORT="22"
REMOTE_PATH="/home/vmuser/ospf-visualizer-pro"
APP_NAME="ospf-visualizer-pro"

echo -e "${BLUE}"
echo "========================================="
echo "  OSPF Visualizer Pro Deployment"
echo "  Environment: $ENVIRONMENT"
echo "  Target: $REMOTE_USER@$REMOTE_HOST"
echo "========================================="
echo -e "${NC}"

# ========================================
# STEP 1: Pre-deployment Checks
# ========================================
echo -e "${YELLOW}[1/8] Running pre-deployment checks...${NC}"

# Check if SSH connection works
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${REMOTE_USER}@${REMOTE_HOST} exit; then
    echo -e "${RED}❌ Cannot connect to ${REMOTE_HOST}. Please check:${NC}"
    echo "  1. SSH key is added: ssh-copy-id ${REMOTE_USER}@${REMOTE_HOST}"
    echo "  2. Server is accessible"
    echo "  3. Username/IP are correct"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection successful${NC}"

# Check if required commands exist locally
for cmd in node npm git; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}❌ Required command not found: $cmd${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required commands available${NC}"

# ========================================
# STEP 2: Generate Production Secrets
# ========================================
echo -e "${YELLOW}[2/8] Generating production secrets...${NC}"

JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}✅ Secrets generated${NC}"
echo "  JWT_SECRET: ${JWT_SECRET:0:10}... (32 chars)"
echo "  SESSION_SECRET: ${SESSION_SECRET:0:10}... (32 chars)"

# ========================================
# STEP 3: Build Application
# ========================================
echo -e "${YELLOW}[3/8] Building application...${NC}"

# Run tests first
echo "  Running tests..."
npm test -- --run || {
    echo -e "${RED}❌ Tests failed! Fix tests before deploying.${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ Tests passed${NC}"

# Build frontend
echo "  Building frontend..."
npm run build || {
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ Frontend built successfully${NC}"

# ========================================
# STEP 4: Create Production .env File
# ========================================
echo -e "${YELLOW}[4/8] Creating production .env file...${NC}"

cat > .env.production.generated << EOF
# Production Environment Variables
# Generated: $(date)
# Environment: ${ENVIRONMENT}

PORT=3001
NODE_ENV=production

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
SESSION_SECRET=${SESSION_SECRET}

DB_PATH=./data/ospf-visualizer-production.db

ALLOWED_ORIGINS=http://${REMOTE_HOST}:9080,http://${REMOTE_HOST}:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

BCRYPT_ROUNDS=12
EOF

echo -e "${GREEN}✅ Production .env created${NC}"

# ========================================
# STEP 5: Prepare Deployment Package
# ========================================
echo -e "${YELLOW}[5/8] Preparing deployment package...${NC}"

# Create deployment directory
rm -rf deploy_package
mkdir -p deploy_package

# Copy necessary files
cp -r dist deploy_package/
cp -r server deploy_package/
cp package.json deploy_package/
cp package-lock.json deploy_package/ 2>/dev/null || echo "  Note: No package-lock.json found"
cp .env.production.generated deploy_package/.env
cp -r data deploy_package/ 2>/dev/null || echo "  Note: No existing data directory"

# Create archive
tar -czf ospf-visualizer-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).tar.gz deploy_package/

echo -e "${GREEN}✅ Deployment package created${NC}"

# ========================================
# STEP 6: Deploy to Remote Server
# ========================================
echo -e "${YELLOW}[6/8] Deploying to remote server...${NC}"

# Create remote directory if it doesn't exist
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_PATH}"

# Upload deployment package
PACKAGE_NAME=$(ls ospf-visualizer-${ENVIRONMENT}-*.tar.gz | tail -1)
echo "  Uploading ${PACKAGE_NAME}..."
scp ${PACKAGE_NAME} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

# Extract and setup on remote server
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
set -e
cd /home/vmuser/ospf-visualizer-pro

echo "  Extracting package..."
tar -xzf ospf-visualizer-*.tar.gz
cd deploy_package

echo "  Installing dependencies..."
npm ci --production --ignore-scripts

echo "  Setting up directories..."
mkdir -p data logs

echo "  Setting permissions..."
chmod 755 server/index.js

echo "  Moving files to parent directory..."
cd ..
rm -rf dist server package.json .env 2>/dev/null || true
mv deploy_package/* .
rm -rf deploy_package

echo "✅ Deployment extracted and configured"
ENDSSH

echo -e "${GREEN}✅ Files deployed to remote server${NC}"

# ========================================
# STEP 7: Start Application on Remote Server
# ========================================
echo -e "${YELLOW}[7/8] Starting application on remote server...${NC}"

ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /home/vmuser/ospf-visualizer-pro

# Kill existing processes
pkill -f "node server/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend server
echo "  Starting backend server..."
nohup node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:9081/api/health > /dev/null; then
    echo "❌ Backend failed to start. Check logs:"
    tail -20 logs/backend.log
    exit 1
fi

echo "✅ Backend started successfully"

# Start frontend (production preview)
echo "  Starting frontend preview server..."
nohup npx vite preview --host 0.0.0.0 --port 9080 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

# Save PIDs
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✅ Application started successfully"
ENDSSH

echo -e "${GREEN}✅ Application is running${NC}"

# ========================================
# STEP 8: Verify Deployment
# ========================================
echo -e "${YELLOW}[8/8] Verifying deployment...${NC}"

sleep 5

# Check backend health
if curl -s http://${REMOTE_HOST}:9081/api/health | grep -q "ok"; then
    echo -e "${GREEN}  ✅ Backend health check passed${NC}"
else
    echo -e "${RED}  ❌ Backend health check failed${NC}"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://${REMOTE_HOST}:9080 | grep -q "200"; then
    echo -e "${GREEN}  ✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}  ⚠️  Frontend check inconclusive (may still be starting)${NC}"
fi

# ========================================
# Deployment Complete
# ========================================
echo -e "${GREEN}"
echo "========================================="
echo "  ✅ DEPLOYMENT SUCCESSFUL!"
echo "========================================="
echo -e "${NC}"
echo ""
echo "📊 Deployment Information:"
echo "  • Environment: ${ENVIRONMENT}"
echo "  • Backend URL: http://${REMOTE_HOST}:9081"
echo "  • Frontend URL: http://${REMOTE_HOST}:9080"
echo "  • Deployed Package: ${PACKAGE_NAME}"
echo ""
echo "🔐 Security Notes:"
echo "  • JWT_SECRET: Generated (32 chars)"
echo "  • SESSION_SECRET: Generated (32 chars)"
echo "  • Database: ./data/ospf-visualizer-production.db"
echo ""
echo "📝 Next Steps:"
echo "  1. Test the application: http://${REMOTE_HOST}:9080"
echo "  2. Monitor logs: ssh ${REMOTE_USER}@${REMOTE_HOST} 'tail -f ospf-visualizer-pro/logs/*.log'"
echo "  3. Check processes: ssh ${REMOTE_USER}@${REMOTE_HOST} 'ps aux | grep -E \"node|vite\"'"
echo ""
echo "🔧 Management Commands:"
echo "  • Stop: ssh ${REMOTE_USER}@${REMOTE_HOST} './ospf-visualizer-pro/scripts/stop.sh'"
echo "  • Restart: ssh ${REMOTE_USER}@${REMOTE_HOST} './ospf-visualizer-pro/scripts/restart.sh'"
echo "  • Status: ssh ${REMOTE_USER}@${REMOTE_HOST} './ospf-visualizer-pro/scripts/status.sh'"
echo ""

# Clean up local files
rm -rf deploy_package
echo "🧹 Cleaned up local deployment files"

echo -e "${BLUE}Deployment complete! 🚀${NC}"
