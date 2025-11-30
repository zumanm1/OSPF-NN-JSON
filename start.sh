#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - Start Script
# This script starts both the frontend and backend servers
#===============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports
FRONTEND_PORT=${PORT:-9080}
BACKEND_PORT=${API_PORT:-9081}

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

#===============================================================================
# Port Management Functions
#===============================================================================

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        print_info "Killed process(es) on port $port"
        return 0
    fi
    return 1
}

cleanup_ports() {
    print_info "Cleaning up ports $FRONTEND_PORT and $BACKEND_PORT..."
    
    # Kill any processes on frontend port
    if ! check_port $FRONTEND_PORT; then
        kill_port $FRONTEND_PORT
    fi
    
    # Kill any processes on backend port
    if ! check_port $BACKEND_PORT; then
        kill_port $BACKEND_PORT
    fi
    
    # Also kill any node/vite processes related to this app
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node server/index.js" 2>/dev/null || true
    pkill -f "concurrently" 2>/dev/null || true
    
    # Wait for ports to be released
    sleep 2
    
    print_success "Ports cleaned up"
}

#===============================================================================
# Start Mode Selection
#===============================================================================

show_menu() {
    echo ""
    echo "Select start mode:"
    echo "  1) Development mode (with hot reload)"
    echo "  2) Production mode (from build)"
    echo "  3) Backend only"
    echo "  4) Frontend only (dev)"
    echo ""
    read -p "Enter choice [1-4]: " choice
    echo ""
}

#===============================================================================
# Start Functions
#===============================================================================

start_dev() {
    print_header "Starting Development Mode"
    
    # Clean up ports first
    cleanup_ports
    
    print_info "Starting frontend (Vite) on port $FRONTEND_PORT..."
    print_info "Starting backend (Express) on port $BACKEND_PORT..."
    
    # Start both servers using concurrently
    npm run start:all
}

start_production() {
    print_header "Starting Production Mode"
    
    # Check if build exists
    if [ ! -d "dist" ]; then
        print_info "Build not found. Building application..."
        npm run build
    fi
    
    # Clean up ports first
    cleanup_ports
    
    print_info "Starting backend server on port $BACKEND_PORT..."
    print_info "Serving static files from dist/"
    
    # Start backend (which serves static files in production)
    NODE_ENV=production npm run server
}

start_backend_only() {
    print_header "Starting Backend Only"
    
    # Kill backend port
    if ! check_port $BACKEND_PORT; then
        kill_port $BACKEND_PORT
        sleep 1
    fi
    
    print_info "Starting backend server on port $BACKEND_PORT..."
    npm run server:dev
}

start_frontend_only() {
    print_header "Starting Frontend Only (Dev)"
    
    # Kill frontend port
    if ! check_port $FRONTEND_PORT; then
        kill_port $FRONTEND_PORT
        sleep 1
    fi
    
    print_info "Starting Vite dev server on port $FRONTEND_PORT..."
    npm run dev
}

#===============================================================================
# Quick Start (Default: Development Mode)
#===============================================================================

quick_start() {
    print_header "OSPF Visualizer Pro - Quick Start"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Dependencies not installed. Running npm install..."
        npm install
    fi
    
    # Always clean up ports before starting
    cleanup_ports
    
    print_info "Starting in development mode..."
    print_info "Frontend: http://localhost:$FRONTEND_PORT"
    print_info "Backend:  http://localhost:$BACKEND_PORT"
    echo ""
    
    npm run start:all
}

#===============================================================================
# Main
#===============================================================================

# Check for command line arguments
case "${1:-}" in
    --dev|-d)
        start_dev
        ;;
    --prod|-p)
        start_production
        ;;
    --backend|-b)
        start_backend_only
        ;;
    --frontend|-f)
        start_frontend_only
        ;;
    --menu|-m)
        show_menu
        case $choice in
            1) start_dev ;;
            2) start_production ;;
            3) start_backend_only ;;
            4) start_frontend_only ;;
            *) print_error "Invalid choice"; exit 1 ;;
        esac
        ;;
    --help|-h)
        echo "OSPF Visualizer Pro - Start Script"
        echo ""
        echo "Usage: ./start.sh [option]"
        echo ""
        echo "Options:"
        echo "  --dev, -d       Start in development mode (default)"
        echo "  --prod, -p      Start in production mode"
        echo "  --backend, -b   Start backend only"
        echo "  --frontend, -f  Start frontend only"
        echo "  --menu, -m      Show interactive menu"
        echo "  --help, -h      Show this help message"
        echo ""
        ;;
    *)
        quick_start
        ;;
esac

