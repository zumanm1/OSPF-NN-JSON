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
# Kill processes by port (works on both macOS and Linux)
#===============================================================================

kill_port() {
    local port=$1
    local pids=""
    
    # Try lsof first (macOS and some Linux)
    if command -v lsof &> /dev/null; then
        pids=$(lsof -ti:$port 2>/dev/null)
    fi
    
    # If lsof didn't work, try fuser (Linux)
    if [ -z "$pids" ] && command -v fuser &> /dev/null; then
        pids=$(fuser $port/tcp 2>/dev/null | tr -s ' ')
    fi
    
    # If still no pids, try ss + awk (Linux)
    if [ -z "$pids" ]; then
        pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | sort -u)
    fi
    
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
    
    # Function to check if port is in use (works on both macOS and Linux)
    check_port_status() {
        local port=$1
        local name=$2
        local pid=""
        
        # Try lsof first
        if command -v lsof &> /dev/null; then
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                pid=$(lsof -ti:$port 2>/dev/null | head -1)
            fi
        fi
        
        # Try ss if lsof didn't work
        if [ -z "$pid" ]; then
            pid=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
        fi
        
        if [ -n "$pid" ]; then
            echo -e "  $name ($port): ${GREEN}RUNNING${NC} (PID: $pid)"
        else
            echo -e "  $name ($port): ${RED}STOPPED${NC}"
        fi
    }
    
    check_port_status $FRONTEND_PORT "Frontend"
    check_port_status $BACKEND_PORT "Backend "
    
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

