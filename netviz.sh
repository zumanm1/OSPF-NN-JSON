#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - Master Control Script
# A unified script to manage installation, dependencies, and server operations
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIN_NODE_VERSION=18
MIN_NPM_VERSION=9
FRONTEND_PORT=${NETVIZ_PORT:-9080}
BACKEND_PORT=9081
LOG_DIR="/tmp"
BACKEND_LOG="$LOG_DIR/ospf-backend.log"
FRONTEND_LOG="$LOG_DIR/ospf-frontend.log"

#===============================================================================
# Helper Functions
#===============================================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}OSPF Visualizer Pro${NC} - Network Topology Analyzer              ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│${NC}  $1"
    echo -e "${BLUE}└─────────────────────────────────────────────────────────────────┘${NC}"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

version_ge() {
    # Returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

check_command() {
    command -v "$1" &> /dev/null
}

#===============================================================================
# System Check Functions
#===============================================================================

check_node() {
    if check_command node; then
        NODE_VERSION=$(node -v | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        if [ "$NODE_MAJOR" -ge "$MIN_NODE_VERSION" ]; then
            return 0
        fi
    fi
    return 1
}

check_npm() {
    if check_command npm; then
        NPM_VERSION=$(npm -v)
        NPM_MAJOR=$(echo $NPM_VERSION | cut -d. -f1)
        if [ "$NPM_MAJOR" -ge "$MIN_NPM_VERSION" ]; then
            return 0
        fi
    fi
    return 1
}

check_deps_installed() {
    # Check if node_modules exists and has content
    if [ -d "$SCRIPT_DIR/node_modules" ] && [ "$(ls -A $SCRIPT_DIR/node_modules 2>/dev/null)" ]; then
        # Check if package-lock.json is newer than last install
        if [ -f "$SCRIPT_DIR/node_modules/.package-lock.json" ]; then
            return 0
        fi
    fi
    return 1
}

#===============================================================================
# Command: install - Install Node.js if not present
#===============================================================================

cmd_install() {
    print_header "Checking System Requirements"
    
    # Check Node.js
    if check_node; then
        print_success "Node.js v$(node -v | sed 's/v//') is installed (required: v$MIN_NODE_VERSION+)"
    else
        print_warning "Node.js not found or version too old"
        print_info "Installing Node.js v20 LTS..."
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if ! check_command curl; then
                sudo apt-get update && sudo apt-get install -y curl
            fi
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if check_command brew; then
                brew install node@20
                brew link node@20 --force --overwrite 2>/dev/null || true
            else
                print_error "Homebrew not found. Install from: https://brew.sh"
                exit 1
            fi
        else
            print_error "Unsupported OS: $OSTYPE"
            exit 1
        fi
        
        if check_node; then
            print_success "Node.js $(node -v) installed successfully"
        else
            print_error "Node.js installation failed"
            exit 1
        fi
    fi
    
    # Check npm
    if check_npm; then
        print_success "npm v$(npm -v) is installed (required: v$MIN_NPM_VERSION+)"
    else
        print_warning "npm version too old, upgrading..."
        sudo npm install -g npm@latest
        print_success "npm upgraded to v$(npm -v)"
    fi
    
    echo ""
    print_success "System requirements met!"
}

#===============================================================================
# Command: deps - Install npm dependencies (skip if already installed)
#===============================================================================

cmd_deps() {
    local FORCE=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force|-f) FORCE=true; shift ;;
            *) shift ;;
        esac
    done
    
    print_header "Checking Dependencies"
    
    cd "$SCRIPT_DIR"
    
    # Check if deps already installed
    if [ "$FORCE" = false ] && check_deps_installed; then
        print_success "Dependencies already installed (node_modules exists)"
        print_info "Use './netviz.sh deps --force' to reinstall"
        return 0
    fi
    
    # Check for package.json
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    print_info "Installing npm dependencies..."
    npm install
    
    print_success "Dependencies installed successfully"
    
    # Setup environment if needed
    if [ ! -f ".env" ]; then
        print_info "Creating .env configuration file..."
        setup_env
    fi
    
    # Create data directory
    if [ ! -d "data" ]; then
        mkdir -p data
        print_success "Created data directory"
    fi
}

setup_env() {
    # Get all server IPs
    ALL_IPS=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' || echo "localhost")
    PRIMARY_IP=$(echo "$ALL_IPS" | head -1)
    
    # Build CORS origins list
    CORS_LIST="http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT"
    for ip in $ALL_IPS; do
        CORS_LIST="${CORS_LIST},http://${ip}:$FRONTEND_PORT"
    done
    
    cat > .env << EOF
# ═══════════════════════════════════════════════════════════════════════════════
# OSPF Visualizer Pro - Environment Configuration
# Generated by netviz.sh on $(date)
# ═══════════════════════════════════════════════════════════════════════════════

#-------------------------------------------------------------------------------
# Server Configuration
#-------------------------------------------------------------------------------
PORT=$BACKEND_PORT
NODE_ENV=development

# Server Binding - Controls which interface the server listens on
# Options: 127.0.0.1 (localhost only), 0.0.0.0 (all interfaces), or specific IP
SERVER_HOST=0.0.0.0

#-------------------------------------------------------------------------------
# Admin Credentials - CHANGE IN PRODUCTION!
#-------------------------------------------------------------------------------
APP_ADMIN_USERNAME=netviz_admin
APP_ADMIN_PASSWORD=V3ry\$trongAdm1n!2025
APP_ADMIN_EMAIL=admin@netviz.local

#-------------------------------------------------------------------------------
# JWT Configuration - CHANGE SECRET IN PRODUCTION!
#-------------------------------------------------------------------------------
JWT_SECRET=ospf-visualizer-secret-key-$(openssl rand -hex 16 2>/dev/null || echo "change-me-in-production")
JWT_EXPIRES_IN=7d

#-------------------------------------------------------------------------------
# Database
#-------------------------------------------------------------------------------
DB_PATH=./data/ospf-visualizer.db

#-------------------------------------------------------------------------------
# CORS Configuration
#-------------------------------------------------------------------------------
CORS_ORIGINS=${CORS_LIST}
ALLOWED_ORIGINS=${CORS_LIST}

#-------------------------------------------------------------------------------
# IP Whitelist - Access Control
#-------------------------------------------------------------------------------
# Use 0.0.0.0 to allow all IPs (not recommended for production)
# Examples: 127.0.0.1,192.168.1.0/24,10.0.0.5
ALLOWED_IPS=0.0.0.0

#-------------------------------------------------------------------------------
# Frontend API URL (for remote access)
#-------------------------------------------------------------------------------
VITE_API_URL=http://${PRIMARY_IP}:$BACKEND_PORT/api
EOF

    # Create .env.local for Vite
    echo "VITE_API_URL=http://${PRIMARY_IP}:$BACKEND_PORT/api" > .env.local
    
    print_success ".env files created"
}

#===============================================================================
# Command: start - Start servers
#===============================================================================

cmd_start() {
    local BACKGROUND=false
    local CUSTOM_PORT=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --bg|--background) BACKGROUND=true; shift ;;
            -p|--port) CUSTOM_PORT="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    if [ -n "$CUSTOM_PORT" ]; then
        FRONTEND_PORT=$CUSTOM_PORT
    fi
    
    print_header "Starting OSPF Visualizer Pro"
    
    cd "$SCRIPT_DIR"
    
    # Cleanup ports first
    cleanup_ports
    
    if [ "$BACKGROUND" = true ]; then
        # Background mode
        print_info "Starting backend server on port $BACKEND_PORT..."
        nohup npm run server > "$BACKEND_LOG" 2>&1 &
        BACKEND_PID=$!
        sleep 2
        
        if kill -0 $BACKEND_PID 2>/dev/null; then
            print_success "Backend started (PID: $BACKEND_PID)"
        else
            print_error "Backend failed to start. Check $BACKEND_LOG"
            exit 1
        fi
        
        print_info "Starting frontend server on port $FRONTEND_PORT..."
        nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
        FRONTEND_PID=$!
        sleep 3
        
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_success "Frontend started (PID: $FRONTEND_PID)"
        else
            print_error "Frontend failed to start. Check $FRONTEND_LOG"
            exit 1
        fi
        
        echo ""
        print_success "Application started in background!"
        show_access_urls
        echo ""
        echo -e "${YELLOW}Logs:${NC}"
        echo "  Backend:  $BACKEND_LOG"
        echo "  Frontend: $FRONTEND_LOG"
        echo ""
        echo -e "${YELLOW}To stop:${NC} ./netviz.sh stop"
    else
        # Foreground mode - use concurrently if available
        print_info "Starting servers in foreground mode..."
        echo ""
        show_access_urls
        echo ""
        npm run start:all
    fi
}

cleanup_ports() {
    print_info "Cleaning up ports $FRONTEND_PORT and $BACKEND_PORT..."
    
    for port in $FRONTEND_PORT $BACKEND_PORT; do
        if check_command lsof; then
            lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
        elif check_command fuser; then
            fuser -k $port/tcp 2>/dev/null || true
        fi
    done
    
    # Kill any existing vite/node processes for this project
    pkill -f "vite.*$SCRIPT_DIR" 2>/dev/null || true
    pkill -f "node.*server.*$SCRIPT_DIR" 2>/dev/null || true
    
    sleep 1
    print_success "Ports cleaned up"
}

show_access_urls() {
    echo -e "${GREEN}Access URLs:${NC}"
    echo "  Local:   http://localhost:$FRONTEND_PORT"
    
    # Show network IPs
    ALL_IPS=$(hostname -I 2>/dev/null || echo "")
    for ip in $ALL_IPS; do
        echo "  Network: http://${ip}:$FRONTEND_PORT"
    done
    
    echo ""
    echo -e "${YELLOW}Default credentials:${NC}"
    echo "  Username: netviz_admin"
    echo "  Password: V3ry\$trongAdm1n!2025"
}

#===============================================================================
# Command: stop - Stop servers
#===============================================================================

cmd_stop() {
    print_header "Stopping OSPF Visualizer Pro"
    
    cd "$SCRIPT_DIR"
    
    # Kill by port
    for port in $FRONTEND_PORT $BACKEND_PORT; do
        print_info "Checking port $port..."
        if check_command lsof; then
            PIDS=$(lsof -ti:$port 2>/dev/null || echo "")
            if [ -n "$PIDS" ]; then
                echo "$PIDS" | xargs kill -9 2>/dev/null && print_success "Killed process(es) on port $port"
            else
                print_info "No process on port $port"
            fi
        elif check_command fuser; then
            fuser -k $port/tcp 2>/dev/null && print_success "Killed process on port $port" || print_info "No process on port $port"
        fi
    done
    
    # Kill related processes
    pkill -f "vite" 2>/dev/null && print_success "Killed Vite processes" || true
    pkill -f "node.*server" 2>/dev/null && print_success "Killed Node server processes" || true
    
    echo ""
    print_success "All servers stopped"
}

#===============================================================================
# Command: restart - Restart servers
#===============================================================================

cmd_restart() {
    cmd_stop
    sleep 2
    cmd_start "$@"
}

#===============================================================================
# Command: status - Show status
#===============================================================================

cmd_status() {
    print_header "System & Server Status"
    
    cd "$SCRIPT_DIR"
    
    echo -e "${CYAN}System:${NC}"
    if check_node; then
        print_success "Node.js: v$(node -v | sed 's/v//')"
    else
        print_error "Node.js: Not installed or version < $MIN_NODE_VERSION"
    fi
    
    if check_npm; then
        print_success "npm: v$(npm -v)"
    else
        print_error "npm: Not installed or version < $MIN_NPM_VERSION"
    fi
    
    if check_deps_installed; then
        print_success "Dependencies: Installed"
    else
        print_warning "Dependencies: Not installed (run './netviz.sh deps')"
    fi
    
    echo ""
    echo -e "${CYAN}Servers:${NC}"
    
    # Check frontend
    if check_command lsof; then
        FRONTEND_PID=$(lsof -ti:$FRONTEND_PORT 2>/dev/null || echo "")
        BACKEND_PID=$(lsof -ti:$BACKEND_PORT 2>/dev/null || echo "")
    else
        FRONTEND_PID=""
        BACKEND_PID=""
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        print_success "Frontend (port $FRONTEND_PORT): Running (PID: $FRONTEND_PID)"
    else
        print_warning "Frontend (port $FRONTEND_PORT): Not running"
    fi
    
    if [ -n "$BACKEND_PID" ]; then
        print_success "Backend (port $BACKEND_PORT): Running (PID: $BACKEND_PID)"
    else
        print_warning "Backend (port $BACKEND_PORT): Not running"
    fi
    
    echo ""
    echo -e "${CYAN}Configuration:${NC}"
    if [ -f ".env" ]; then
        print_success ".env: Exists"
        grep -E "^SERVER_HOST|^ALLOWED_IPS" .env 2>/dev/null | while read line; do
            echo "  $line"
        done
    else
        print_warning ".env: Not found"
    fi
}

#===============================================================================
# Command: logs - View server logs
#===============================================================================

cmd_logs() {
    print_header "Server Logs"
    
    if [ -f "$BACKEND_LOG" ] || [ -f "$FRONTEND_LOG" ]; then
        echo -e "${YELLOW}Tailing logs (Ctrl+C to exit)...${NC}"
        echo ""
        tail -f "$BACKEND_LOG" "$FRONTEND_LOG" 2>/dev/null || {
            [ -f "$BACKEND_LOG" ] && tail -f "$BACKEND_LOG"
            [ -f "$FRONTEND_LOG" ] && tail -f "$FRONTEND_LOG"
        }
    else
        print_warning "No log files found. Start servers with './netviz.sh start --bg' first."
    fi
}

#===============================================================================
# Command: clean - Clean build artifacts
#===============================================================================

cmd_clean() {
    print_header "Cleaning Build Artifacts"
    
    cd "$SCRIPT_DIR"
    
    if [ -d "node_modules" ]; then
        print_info "Removing node_modules..."
        rm -rf node_modules
        print_success "Removed node_modules"
    fi
    
    if [ -d "dist" ]; then
        print_info "Removing dist..."
        rm -rf dist
        print_success "Removed dist"
    fi
    
    if [ -f "package-lock.json" ]; then
        print_info "Removing package-lock.json..."
        rm -f package-lock.json
        print_success "Removed package-lock.json"
    fi
    
    print_success "Clean complete"
}

#===============================================================================
# Command: build - Build for production
#===============================================================================

cmd_build() {
    print_header "Building for Production"
    
    cd "$SCRIPT_DIR"
    
    if ! check_deps_installed; then
        print_warning "Dependencies not installed. Installing first..."
        cmd_deps
    fi
    
    print_info "Running production build..."
    npm run build
    
    if [ -d "dist" ]; then
        print_success "Build complete! Output in ./dist/"
        echo ""
        echo -e "${YELLOW}To preview:${NC} npm run preview"
        echo -e "${YELLOW}To serve:${NC} npx serve dist"
    else
        print_error "Build failed - dist directory not created"
        exit 1
    fi
}

#===============================================================================
# Command: help - Show usage
#===============================================================================

cmd_help() {
    print_banner
    echo ""
    echo -e "${YELLOW}Usage:${NC} ./netviz.sh <command> [options]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo "  install     Install system requirements (Node.js, npm)"
    echo "  deps        Install project dependencies (skips if already installed)"
    echo "  start       Start frontend and backend servers"
    echo "  stop        Stop all running servers"
    echo "  restart     Restart all servers"
    echo "  status      Show system and server status"
    echo "  logs        View server logs (tail -f)"
    echo "  clean       Clean build artifacts and node_modules"
    echo "  build       Build for production"
    echo "  help        Show this help message"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  deps --force        Force reinstall dependencies"
    echo "  start --bg          Start servers in background"
    echo "  start -p PORT       Start on custom port"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  ./netviz.sh install && ./netviz.sh deps && ./netviz.sh start"
    echo "  ./netviz.sh start --bg"
    echo "  ./netviz.sh deps --force"
    echo "  NETVIZ_PORT=8080 ./netviz.sh start"
    echo ""
    echo -e "${CYAN}Environment Variables:${NC}"
    echo "  NETVIZ_PORT         Custom frontend port (default: 9080)"
    echo ""
}

#===============================================================================
# Main Entry Point
#===============================================================================

main() {
    cd "$SCRIPT_DIR"
    
    case "${1:-help}" in
        install)    shift; cmd_install "$@" ;;
        deps)       shift; cmd_deps "$@" ;;
        start)      shift; cmd_start "$@" ;;
        stop)       shift; cmd_stop "$@" ;;
        restart)    shift; cmd_restart "$@" ;;
        status)     shift; cmd_status "$@" ;;
        logs)       shift; cmd_logs "$@" ;;
        clean)      shift; cmd_clean "$@" ;;
        build)      shift; cmd_build "$@" ;;
        help|--help|-h) cmd_help ;;
        *)
            print_error "Unknown command: $1"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"

