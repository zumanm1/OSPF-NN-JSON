#!/bin/bash
#===============================================================================
# OSPF Visualizer Pro - NVM Setup Script
# This script sets up an isolated Node.js environment using nvm
# Run this once on a new machine to get the correct Node.js version
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
REQUIRED_NODE_VERSION="20"
NVM_VERSION="0.40.1"

#===============================================================================
# Helper Functions
#===============================================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}OSPF Visualizer Pro${NC} - Node.js Environment Setup            ${CYAN}║${NC}"
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

#===============================================================================
# NVM Detection and Installation
#===============================================================================

detect_shell() {
    if [ -n "$ZSH_VERSION" ]; then
        echo "zsh"
    elif [ -n "$BASH_VERSION" ]; then
        echo "bash"
    else
        basename "$SHELL"
    fi
}

get_shell_rc() {
    local shell_type=$(detect_shell)
    case "$shell_type" in
        zsh)  echo "$HOME/.zshrc" ;;
        bash)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS uses .bash_profile
                if [ -f "$HOME/.bash_profile" ]; then
                    echo "$HOME/.bash_profile"
                else
                    echo "$HOME/.bashrc"
                fi
            else
                echo "$HOME/.bashrc"
            fi
            ;;
        *)    echo "$HOME/.profile" ;;
    esac
}

check_nvm_installed() {
    # Check if nvm command exists
    if command -v nvm &> /dev/null; then
        return 0
    fi
    
    # Check if NVM_DIR exists
    if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
        return 0
    fi
    
    return 1
}

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
        return 0
    fi
    return 1
}

install_nvm() {
    print_header "Installing NVM (Node Version Manager)"
    
    print_info "Downloading nvm v$NVM_VERSION..."
    
    # Download and run nvm installer
    if command -v curl &> /dev/null; then
        curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh" | bash
    elif command -v wget &> /dev/null; then
        wget -qO- "https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh" | bash
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    # Load nvm immediately
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Verify installation
    if command -v nvm &> /dev/null; then
        print_success "nvm v$(nvm --version) installed successfully"
    else
        print_error "nvm installation failed"
        exit 1
    fi
}

install_node() {
    print_header "Installing Node.js v$REQUIRED_NODE_VERSION"
    
    # Ensure nvm is loaded
    if ! command -v nvm &> /dev/null; then
        load_nvm || {
            print_error "nvm not loaded. Please restart your terminal and run this script again."
            exit 1
        }
    fi
    
    # Check if required version is already installed
    if nvm ls "$REQUIRED_NODE_VERSION" &> /dev/null; then
        print_success "Node.js v$REQUIRED_NODE_VERSION is already installed"
    else
        print_info "Installing Node.js v$REQUIRED_NODE_VERSION LTS..."
        nvm install "$REQUIRED_NODE_VERSION"
        print_success "Node.js v$REQUIRED_NODE_VERSION installed"
    fi
    
    # Set as default for this project
    nvm use "$REQUIRED_NODE_VERSION"
    nvm alias default "$REQUIRED_NODE_VERSION"
    
    print_success "Node.js $(node -v) is now active"
    print_success "npm $(npm -v) is now active"
}

add_auto_switch() {
    print_header "Configuring Auto-Switch (Optional)"
    
    local shell_rc=$(get_shell_rc)
    local shell_type=$(detect_shell)
    
    print_info "Detected shell: $shell_type"
    print_info "Shell config: $shell_rc"
    
    # Check if auto-switch is already configured
    if grep -q "load-nvmrc\|cdnvm\|nvm use" "$shell_rc" 2>/dev/null; then
        print_info "Auto-switch already configured in $shell_rc"
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}Would you like to enable automatic Node.js version switching?${NC}"
    echo "This will automatically use the correct Node.js version when you enter"
    echo "a directory with a .nvmrc file."
    echo ""
    read -p "Enable auto-switch? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "" >> "$shell_rc"
        echo "# Auto-switch Node.js version when entering directory with .nvmrc" >> "$shell_rc"
        
        if [ "$shell_type" = "zsh" ]; then
            cat >> "$shell_rc" << 'EOF'
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
EOF
        else
            cat >> "$shell_rc" << 'EOF'
cdnvm() {
    command cd "$@" || return $?
    nvm_path=$(nvm_find_nvmrc)
    if [ -n "$nvm_path" ]; then
        local nvm_version=$(cat "$nvm_path")
        if [ "$(nvm version)" != "$(nvm version "$nvm_version")" ]; then
            nvm use
        fi
    fi
}
alias cd='cdnvm'
EOF
        fi
        
        print_success "Auto-switch configured in $shell_rc"
    else
        print_info "Auto-switch skipped. You can manually run 'nvm use' in the project directory."
    fi
}

#===============================================================================
# Main
#===============================================================================

main() {
    print_banner
    
    echo ""
    echo "This script will set up an isolated Node.js environment for OSPF Visualizer Pro."
    echo "It uses nvm (Node Version Manager) to manage Node.js versions independently"
    echo "from your system's global Node.js installation."
    echo ""
    
    # Step 1: Check/Install nvm
    if check_nvm_installed; then
        print_success "nvm is already installed"
        load_nvm
        print_info "nvm version: $(nvm --version)"
    else
        install_nvm
    fi
    
    # Step 2: Install Node.js
    install_node
    
    # Step 3: Configure auto-switch (optional)
    add_auto_switch
    
    # Final output
    print_header "Setup Complete!"
    echo ""
    echo -e "${GREEN}Node.js environment is ready!${NC}"
    echo ""
    echo -e "${CYAN}Current versions:${NC}"
    echo "  Node.js: $(node -v)"
    echo "  npm:     $(npm -v)"
    echo "  nvm:     $(nvm --version)"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Restart your terminal (or run: source $(get_shell_rc))"
    echo "  2. Run: ./netviz.sh deps    # Install project dependencies"
    echo "  3. Run: ./netviz.sh start   # Start the application"
    echo ""
    echo -e "${CYAN}Tip:${NC} The project uses .nvmrc to specify Node.js v$REQUIRED_NODE_VERSION."
    echo "     Run 'nvm use' in the project directory to switch to the correct version."
    echo ""
}

main "$@"

