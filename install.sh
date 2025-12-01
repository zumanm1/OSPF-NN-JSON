#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - Installation Script
# This script installs all required dependencies for the OSPF Visualizer Pro app
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Minimum versions required
MIN_NODE_VERSION=18
MIN_NPM_VERSION=9
#===============================================================================
# Helper Functions
#===============================================================================

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

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

version_compare() {
    # Returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

#===============================================================================
# Check and Install Node.js
#===============================================================================

check_nodejs() {
    print_header "Checking Node.js Installation"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        
        if [ "$NODE_MAJOR" -ge "$MIN_NODE_VERSION" ]; then
            print_success "Node.js v$NODE_VERSION is installed (required: v$MIN_NODE_VERSION+)"
            return 0
        else
            print_warning "Node.js v$NODE_VERSION is too old (required: v$MIN_NODE_VERSION+)"
            return 1
        fi
    else
        print_warning "Node.js is not installed"
        return 1
    fi
}

install_nodejs() {
    print_header "Installing Node.js"
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_info "Detected Linux system"
        
        # Check if we have curl
        if ! command -v curl &> /dev/null; then
            print_info "Installing curl..."
            sudo apt-get update && sudo apt-get install -y curl
        fi
        
        # Install Node.js using NodeSource
        print_info "Installing Node.js v20 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Detected macOS system"
        
        if command -v brew &> /dev/null; then
            print_info "Installing Node.js via Homebrew..."
            brew install node@20
            brew link node@20 --force --overwrite
        else
            print_error "Homebrew not found. Please install Homebrew first:"
            echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null; then
        print_success "Node.js $(node -v) installed successfully"
    else
        print_error "Node.js installation failed"
        exit 1
    fi
}

#===============================================================================
# Check and Install npm
#===============================================================================

check_npm() {
    print_header "Checking npm Installation"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        NPM_MAJOR=$(echo $NPM_VERSION | cut -d. -f1)
        
        if [ "$NPM_MAJOR" -ge "$MIN_NPM_VERSION" ]; then
            print_success "npm v$NPM_VERSION is installed (required: v$MIN_NPM_VERSION+)"
            return 0
        else
            print_warning "npm v$NPM_VERSION is too old (required: v$MIN_NPM_VERSION+)"
            return 1
        fi
    else
        print_warning "npm is not installed"
        return 1
    fi
}

upgrade_npm() {
    print_header "Upgrading npm"
    print_info "Upgrading npm to latest version..."
    sudo npm install -g npm@latest
    print_success "npm upgraded to $(npm -v)"
}

#===============================================================================
# Install npm Dependencies
#===============================================================================

install_dependencies() {
    print_header "Installing npm Dependencies"
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    print_info "Running npm install..."
    npm install
    
    print_success "All npm dependencies installed successfully"
}

#===============================================================================
# Setup Environment
#===============================================================================

setup_environment() {
    print_header "Setting Up Environment"
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        
        # Get the server IP for CORS configuration
        SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
        
        cat > .env << EOF
# OSPF Visualizer Pro Environment Configuration
# Generated by install.sh on $(date)

# Server Configuration
PORT=9081
API_PORT=9081
NODE_ENV=development

# JWT Configuration (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Admin Credentials (CHANGE THESE IN PRODUCTION!)
APP_ADMIN_USERNAME=netviz_admin
APP_ADMIN_PASSWORD=V3ry\$trongAdm1n!2025

# Database
DB_PATH=./data/ospf-visualizer.db

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:9080,http://127.0.0.1:9080,http://${SERVER_IP}:9080
ALLOWED_ORIGINS=http://localhost:9080,http://127.0.0.1:9080,http://${SERVER_IP}:9080

# IP Access Control (0.0.0.0 allows all IPs, or specify comma-separated IPs/CIDRs)
ALLOWED_IPS=0.0.0.0

# Frontend API URL (for remote access)
VITE_API_URL=http://${SERVER_IP}:9081/api
EOF
        print_success ".env file created"
    else
        print_info ".env file already exists"
    fi
    
    # Create data directory
    if [ ! -d "data" ]; then
        mkdir -p data
        print_success "Created data directory"
    fi
    
    # Create .env.local for Vite (frontend) with correct API URL
    if [ ! -f ".env.local" ]; then
        print_info "Creating .env.local for frontend..."
        echo "VITE_API_URL=http://${SERVER_IP}:9081/api" > .env.local
        print_success ".env.local created"
    else
        print_info ".env.local already exists"
    fi
}

#===============================================================================
# Build Application
#===============================================================================

build_app() {
    print_header "Building Application"
    
    print_info "Running npm run build..."
    npm run build
    
    if [ -d "dist" ]; then
        print_success "Application built successfully"
    else
        print_error "Build failed - dist directory not created"
        exit 1
    fi
}

#===============================================================================
# Main Installation Flow
#===============================================================================

main() {
    print_header "OSPF Visualizer Pro - Installation"
    echo ""
    echo "This script will install all required dependencies for OSPF Visualizer Pro"
    echo ""
    
    # Step 1: Check/Install Node.js
    if ! check_nodejs; then
        install_nodejs
    fi
    
    # Step 2: Check/Upgrade npm
    if ! check_npm; then
        upgrade_npm
    fi
    
    # Step 3: Install npm dependencies
    install_dependencies
    
    # Step 4: Setup environment
    setup_environment
    
    # Step 5: Build application (optional - uncomment if needed)
    # build_app
    
    print_header "Installation Complete!"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Start the application:  ./start.sh"
    echo "  2. Open in browser:        http://localhost:9080"
    echo "  3. Stop the application:   ./stop.sh"
    echo ""
    echo -e "${YELLOW}Default login credentials:${NC}"
    echo "  Username: netviz_admin"
    echo "  Password: V3ry\$trongAdm1n!2025"
    echo ""
}

# Run main function
main "$@"

