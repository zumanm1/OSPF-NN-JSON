#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - Remote Deployment Script
# Deploys the application to a remote server
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default remote server configuration
REMOTE_HOST="${REMOTE_HOST:-172.16.39.172}"
REMOTE_USER="${REMOTE_USER:-cisco}"
REMOTE_PASS="${REMOTE_PASS:-cisco}"
REMOTE_DIR="${REMOTE_DIR:-/home/cisco/OSPF-NN-JSON}"
REPO_URL="https://github.com/zumanm1/OSPF-NN-JSON.git"

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

#===============================================================================
# Check if sshpass is installed
#===============================================================================

check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        print_warning "sshpass not found. Installing..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y sshpass
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install hudochenkov/sshpass/sshpass
        fi
    fi
}

#===============================================================================
# Remote command execution
#===============================================================================

remote_exec() {
    local cmd="$1"
    sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "$cmd"
}

#===============================================================================
# Deploy to Remote Server
#===============================================================================

deploy() {
    print_header "Deploying to Remote Server"
    echo ""
    echo "Target: $REMOTE_USER@$REMOTE_HOST"
    echo "Directory: $REMOTE_DIR"
    echo ""
    
    # Check sshpass
    check_sshpass
    
    # Test SSH connection
    print_info "Testing SSH connection..."
    if ! sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$REMOTE_USER@$REMOTE_HOST" "echo 'Connected'" &>/dev/null; then
        print_error "Failed to connect to $REMOTE_HOST"
        exit 1
    fi
    print_success "SSH connection successful"
    
    # Check and install Node.js on remote
    print_info "Checking Node.js on remote server..."
    remote_exec "
        if command -v node &> /dev/null; then
            NODE_VERSION=\$(node -v)
            echo \"Node.js \$NODE_VERSION is installed\"
        else
            echo 'Node.js not found. Installing...'
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            echo \"Node.js \$(node -v) installed\"
        fi
    "
    print_success "Node.js check complete"
    
    # Clone or update repository
    print_info "Setting up repository..."
    remote_exec "
        if [ -d '$REMOTE_DIR' ]; then
            echo 'Repository exists. Pulling latest changes...'
            cd $REMOTE_DIR
            git pull origin main
        else
            echo 'Cloning repository...'
            git clone $REPO_URL $REMOTE_DIR
            cd $REMOTE_DIR
        fi
    "
    print_success "Repository setup complete"
    
    # Install dependencies
    print_info "Installing npm dependencies..."
    remote_exec "
        cd $REMOTE_DIR
        npm install
    "
    print_success "Dependencies installed"
    
    # Setup environment
    print_info "Setting up environment..."
    remote_exec "
        cd $REMOTE_DIR
        if [ ! -f '.env' ]; then
            cat > .env << 'ENVEOF'
PORT=9080
API_PORT=9081
NODE_ENV=production
JWT_SECRET=remote-server-jwt-secret-change-this-in-production-32chars
APP_ADMIN_USERNAME=netviz_admin
APP_ADMIN_PASSWORD=V3ry\$trongAdm1n!2025
DB_PATH=./data/ospf-visualizer.db
CORS_ORIGINS=http://$REMOTE_HOST:9080,http://localhost:9080
ENVEOF
            echo '.env file created'
        fi
        mkdir -p data
        chmod +x install.sh start.sh stop.sh 2>/dev/null || true
    "
    print_success "Environment configured"
    
    # Start the application
    print_info "Starting the application..."
    remote_exec "
        cd $REMOTE_DIR
        # Stop any existing processes
        pkill -f 'node server/index.js' 2>/dev/null || true
        pkill -f 'vite' 2>/dev/null || true
        sleep 2
        
        # Start in background
        nohup npm run start:all > /tmp/ospf-visualizer.log 2>&1 &
        sleep 5
        
        # Check if running
        if lsof -i:9080 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo 'Application started successfully'
        else
            echo 'Warning: Application may not have started correctly'
            cat /tmp/ospf-visualizer.log
        fi
    "
    
    print_header "Deployment Complete!"
    echo ""
    echo -e "${GREEN}Application URL:${NC} http://$REMOTE_HOST:9080"
    echo ""
    echo -e "${YELLOW}Default Credentials:${NC}"
    echo "  Username: netviz_admin"
    echo "  Password: V3ry\$trongAdm1n!2025"
    echo ""
}

#===============================================================================
# Stop Remote Application
#===============================================================================

stop_remote() {
    print_header "Stopping Remote Application"
    
    check_sshpass
    
    print_info "Stopping processes on $REMOTE_HOST..."
    remote_exec "
        pkill -f 'node server/index.js' 2>/dev/null && echo 'Backend stopped' || echo 'Backend not running'
        pkill -f 'vite' 2>/dev/null && echo 'Frontend stopped' || echo 'Frontend not running'
        pkill -f 'concurrently' 2>/dev/null || true
    "
    
    print_success "Remote application stopped"
}

#===============================================================================
# Check Remote Status
#===============================================================================

status_remote() {
    print_header "Remote Application Status"
    
    check_sshpass
    
    remote_exec "
        echo ''
        echo 'Port Status:'
        echo '─────────────────────────────────────'
        if lsof -i:9080 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo '  Frontend (9080): RUNNING'
        else
            echo '  Frontend (9080): STOPPED'
        fi
        if lsof -i:9081 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo '  Backend  (9081): RUNNING'
        else
            echo '  Backend  (9081): STOPPED'
        fi
        echo ''
    "
}

#===============================================================================
# Main
#===============================================================================

case "${1:-}" in
    --deploy|-d)
        deploy
        ;;
    --stop|-s)
        stop_remote
        ;;
    --status|-t)
        status_remote
        ;;
    --help|-h)
        echo "OSPF Visualizer Pro - Remote Deployment Script"
        echo ""
        echo "Usage: ./deploy-remote.sh [option]"
        echo ""
        echo "Options:"
        echo "  --deploy, -d    Deploy to remote server (default)"
        echo "  --stop, -s      Stop remote application"
        echo "  --status, -t    Check remote status"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  REMOTE_HOST     Remote server IP (default: 172.16.39.172)"
        echo "  REMOTE_USER     SSH username (default: cisco)"
        echo "  REMOTE_PASS     SSH password (default: cisco)"
        echo "  REMOTE_DIR      Installation directory (default: /home/cisco/OSPF-NN-JSON)"
        echo ""
        echo "Example:"
        echo "  REMOTE_HOST=192.168.1.100 ./deploy-remote.sh --deploy"
        echo ""
        ;;
    *)
        deploy
        ;;
esac


