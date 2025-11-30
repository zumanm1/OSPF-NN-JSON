#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - Stop Script
# This script stops all running instances of the application
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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

#===============================================================================
# Kill processes by port
#===============================================================================

kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        print_success "Killed process(es) on port $port"
        return 0
    else
        print_info "No process found on port $port"
        return 1
    fi
}

#===============================================================================
# Kill processes by name
#===============================================================================

kill_by_name() {
    local name=$1
    local pids=$(pgrep -f "$name" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        print_success "Killed $name process(es)"
        return 0
    else
        return 1
    fi
}

#===============================================================================
# Main Stop Function
#===============================================================================

stop_all() {
    print_header "Stopping OSPF Visualizer Pro"
    
    local stopped=0
    
    # Kill by ports
    print_info "Checking port $FRONTEND_PORT (Frontend)..."
    kill_port $FRONTEND_PORT && stopped=1
    
    print_info "Checking port $BACKEND_PORT (Backend)..."
    kill_port $BACKEND_PORT && stopped=1
    
    # Kill by process name patterns
    print_info "Checking for Vite processes..."
    kill_by_name "vite" && stopped=1
    
    print_info "Checking for Node server processes..."
    kill_by_name "node server/index.js" && stopped=1
    
    print_info "Checking for concurrently processes..."
    kill_by_name "concurrently" && stopped=1
    
    echo ""
    
    if [ $stopped -eq 1 ]; then
        print_success "All OSPF Visualizer Pro processes stopped"
    else
        print_info "No running processes found"
    fi
}

#===============================================================================
# Force Stop (kill all node processes - use with caution)
#===============================================================================

force_stop() {
    print_header "Force Stopping All Node Processes"
    print_warning "This will kill ALL Node.js processes!"
    
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        killall node 2>/dev/null && print_success "All Node processes killed" || print_info "No Node processes found"
    else
        print_info "Cancelled"
    fi
}

#===============================================================================
# Status Check
#===============================================================================

check_status() {
    print_header "OSPF Visualizer Pro - Status"
    
    echo ""
    echo "Port Status:"
    echo "─────────────────────────────────────"
    
    # Check frontend port
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        local frontend_pid=$(lsof -ti:$FRONTEND_PORT)
        echo -e "  Frontend ($FRONTEND_PORT): ${GREEN}RUNNING${NC} (PID: $frontend_pid)"
    else
        echo -e "  Frontend ($FRONTEND_PORT): ${RED}STOPPED${NC}"
    fi
    
    # Check backend port
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        local backend_pid=$(lsof -ti:$BACKEND_PORT)
        echo -e "  Backend  ($BACKEND_PORT): ${GREEN}RUNNING${NC} (PID: $backend_pid)"
    else
        echo -e "  Backend  ($BACKEND_PORT): ${RED}STOPPED${NC}"
    fi
    
    echo ""
}

#===============================================================================
# Main
#===============================================================================

case "${1:-}" in
    --force|-f)
        force_stop
        ;;
    --status|-s)
        check_status
        ;;
    --help|-h)
        echo "OSPF Visualizer Pro - Stop Script"
        echo ""
        echo "Usage: ./stop.sh [option]"
        echo ""
        echo "Options:"
        echo "  (no option)     Stop all app processes"
        echo "  --force, -f     Force kill all Node processes"
        echo "  --status, -s    Check running status"
        echo "  --help, -h      Show this help message"
        echo ""
        ;;
    *)
        stop_all
        ;;
esac

