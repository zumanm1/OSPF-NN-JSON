#!/bin/bash

# ========================================
# OSPF Visualizer Pro - GitHub Deployment Script
# ========================================
# This script deploys the application directly from GitHub
# Usage: ./deploy-github.sh
# ========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=9081
FRONTEND_PORT=9080
APP_DIR=$(pwd)

echo -e "${BLUE}"
echo "========================================="
echo "  OSPF Visualizer Pro - GitHub Deploy"
echo "  Backend Port: $BACKEND_PORT"
echo "  Frontend Port: $FRONTEND_PORT"
echo "========================================="
echo -e "${NC}"

# ========================================
# STEP 1: Kill Existing Processes on Ports
# ========================================
echo -e "${YELLOW}[1/8] Checking for existing processes on ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"

# Function to kill process on a port
kill_port() {
    local port=$1
    local port_name=$2
    
    # Find process using the port
    PID=$(lsof -t -i:$port 2>/dev/null || true)
    
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}  Found process on port $port (PID: $PID) - Killing...${NC}"
        kill -9 $PID 2>/dev/null || true
        sleep 1
        
        # Verify it's killed
        if lsof -t -i:$port > /dev/null 2>&1; then
            echo -e "${RED}  ❌ Failed to kill process on port $port${NC}"
            exit 1
        else
            echo -e "${GREEN}  ✅ $port_name port ($port) freed${NC}"
        fi
    else
        echo -e "${GREEN}  ✅ Port $port is available${NC}"
    fi
}

kill_port $BACKEND_PORT "Backend"
kill_port $FRONTEND_PORT "Frontend"

# ========================================
# STEP 2: Check Prerequisites
# ========================================
echo -e "${YELLOW}[2/8] Checking prerequisites...${NC}"

# Check if required commands exist
for cmd in node npm git; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}❌ Required command not found: $cmd${NC}"
        echo "Please install $cmd and try again"
        exit 1
    fi
done

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Git: $(git --version)"

# ========================================
# STEP 3: Pull Latest from GitHub
# ========================================
echo -e "${YELLOW}[3/8] Pulling latest code from GitHub...${NC}"

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Current branch: $CURRENT_BRANCH"

# Stash any local changes
if ! git diff-index --quiet HEAD --; then
    echo "  Stashing local changes..."
    git stash
fi

# Pull latest
echo "  Pulling from origin/$CURRENT_BRANCH..."
git pull origin $CURRENT_BRANCH || {
    echo -e "${RED}❌ Failed to pull from GitHub${NC}"
    exit 1
}

echo -e "${GREEN}✅ Code updated from GitHub${NC}"

# ========================================
# STEP 4: Install Dependencies
# ========================================
echo -e "${YELLOW}[4/8] Installing dependencies...${NC}"

# Clean install for production
echo "  Running npm ci (clean install)..."
npm ci || {
    echo -e "${YELLOW}  npm ci failed, trying npm install...${NC}"
    npm install || {
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    }
}

echo -e "${GREEN}✅ Dependencies installed${NC}"

# ========================================
# STEP 5: Verify Environment Configuration
# ========================================
echo -e "${YELLOW}[5/8] Verifying environment configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "  Creating .env from .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}  ⚠️  WARNING: Using default .env values${NC}"
        echo -e "${YELLOW}  Please update .env with production secrets${NC}"
        echo ""
        echo "  Generate secrets with:"
        echo "  openssl rand -base64 32"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Verify .env has required variables
if ! grep -q "JWT_SECRET" .env; then
    echo -e "${RED}❌ .env missing JWT_SECRET${NC}"
    exit 1
fi

if ! grep -q "PORT=9081" .env; then
    echo -e "${YELLOW}⚠️  .env PORT not set to 9081, updating...${NC}"
    sed -i '' 's/^PORT=.*/PORT=9081/' .env || sed -i 's/^PORT=.*/PORT=9081/' .env
fi

if ! grep -q "ALLOWED_ORIGINS.*9080" .env; then
    echo -e "${YELLOW}⚠️  .env ALLOWED_ORIGINS not set correctly, updating...${NC}"
    sed -i '' 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:9080,http://127.0.0.1:9080|' .env || \
    sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:9080,http://127.0.0.1:9080|' .env
fi

echo -e "${GREEN}✅ Environment configured${NC}"

# ========================================
# STEP 6: Build Application
# ========================================
echo -e "${YELLOW}[6/8] Building application...${NC}"

# Run tests
echo "  Running tests..."
npm test -- --run --reporter=dot || {
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
}
echo -e "${GREEN}  ✅ Tests passed${NC}"

# Build frontend
echo "  Building optimized frontend..."
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Application built successfully${NC}"

# ========================================
# STEP 7: Start Services
# ========================================
echo -e "${YELLOW}[7/8] Starting services...${NC}"

# Create logs directory
mkdir -p logs

# Start backend server
echo "  Starting backend server on port $BACKEND_PORT..."
nohup node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid

sleep 2

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "  Check logs/backend.log for details"
    cat logs/backend.log
    exit 1
fi

echo -e "${GREEN}  ✅ Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend server
echo "  Starting frontend server on port $FRONTEND_PORT..."
nohup npx vite preview --host 0.0.0.0 --port $FRONTEND_PORT > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid

sleep 2

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo "  Check logs/frontend.log for details"
    cat logs/frontend.log
    exit 1
fi

echo -e "${GREEN}  ✅ Frontend started (PID: $FRONTEND_PID)${NC}"

# ========================================
# STEP 8: Verify Deployment
# ========================================
echo -e "${YELLOW}[8/8] Verifying deployment...${NC}"

sleep 3

# Check backend health
echo "  Testing backend health..."
if curl -f -s http://localhost:$BACKEND_PORT/api/health > /dev/null; then
    echo -e "${GREEN}  ✅ Backend health check passed${NC}"
else
    echo -e "${RED}  ❌ Backend health check failed${NC}"
    echo "  Backend may still be starting. Check: http://localhost:$BACKEND_PORT/api/health"
fi

# Check frontend
echo "  Testing frontend..."
if curl -f -s -I http://localhost:$FRONTEND_PORT > /dev/null; then
    echo -e "${GREEN}  ✅ Frontend is accessible${NC}"
else
    echo -e "${RED}  ❌ Frontend check failed${NC}"
    echo "  Frontend may still be starting. Check: http://localhost:$FRONTEND_PORT"
fi

# ========================================
# SUCCESS!
# ========================================
echo ""
echo -e "${GREEN}"
echo "========================================="
echo "  ✅ DEPLOYMENT SUCCESSFUL!"
echo "========================================="
echo -e "${NC}"

echo -e "${BLUE}📊 Deployment Information:${NC}"
echo "  • Backend URL: http://localhost:$BACKEND_PORT"
echo "  • Frontend URL: http://localhost:$FRONTEND_PORT"
echo "  • Backend PID: $BACKEND_PID"
echo "  • Frontend PID: $FRONTEND_PID"
echo "  • Logs: ./logs/"
echo ""

echo -e "${PURPLE}🔧 Management Commands:${NC}"
echo "  • View backend logs: tail -f logs/backend.log"
echo "  • View frontend logs: tail -f logs/frontend.log"
echo "  • Stop backend: kill $BACKEND_PID"
echo "  • Stop frontend: kill $FRONTEND_PID"
echo "  • Check status: ps aux | grep -E \"node|vite\""
echo ""

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Open http://localhost:$FRONTEND_PORT in your browser"
echo "  2. Verify all features are working"
echo "  3. Monitor logs for any errors"
echo ""

echo -e "${GREEN}🎉 Your OSPF Visualizer Pro is now running!${NC}"
