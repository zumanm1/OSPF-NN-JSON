# OSPF Visualizer Pro

A comprehensive OSPF (Open Shortest Path First) network topology visualizer and analyzer with enterprise-grade authentication and multi-modal analysis.

![OSPF Visualizer Pro](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-18--24-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
```

### 2. First-Time Setup (Recommended)

```bash
# Option A: Full isolated setup with nvm (recommended)
./netviz.sh setup     # Installs nvm + Node.js v20 (one-time)
./netviz.sh deps      # Install npm dependencies
./netviz.sh start     # Start servers

# Option B: Quick start (if Node.js already installed)
./netviz.sh install && ./netviz.sh deps && ./netviz.sh start
```

### 3. Returning Users

```bash
# Just start - auto-switches to correct Node version if nvm installed
./netviz.sh start
```

### Important: Environment Setup

Before starting, ensure the `.env` file exists:

```bash
# Copy the example environment file (first time only)
cp .env.example .env
```

The `.env` file contains required settings like `JWT_SECRET`, `DB_PATH`, etc.

### 4. Manual Installation

```bash
# Install frontend dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your secure credentials

# Start development server
npm run dev           # Vite only (port 9080)
# OR for full stack with auth:
npm run start:all     # All servers
```

**Access the app:** http://localhost:9080

**Default credentials:** `netviz_admin` / `V3ry$trongAdm1n!2025`

---

## 🔐 Standalone Setup with App0 (Auth-Vault)

If you want to run **only App3 (NN-JSON)** with centralized authentication from App0, follow these steps:

### Prerequisites

- Ubuntu 20.04+ or compatible Linux
- Node.js v24.x, npm 11.x
- Java 17+ (for Keycloak)

### Step 1: Clone App0 (Auth-Vault)

```bash
cd ~
mkdir -p the-6-apps && cd the-6-apps

# Clone App0 (Auth-Vault)
git clone https://github.com/zumanm1/auth-vault.git app0-auth-vault
```

### Step 2: Start App0 Services (Keycloak + Vault)

```bash
cd ~/the-6-apps/app0-auth-vault
./auth-vault.sh install   # First time only
./auth-vault.sh start
```

**Verify App0 is running:**
```bash
curl http://localhost:9120/health/ready  # Keycloak
curl http://localhost:9121/v1/sys/health # Vault
```

### Step 3: Clone and Start App3 (NN-JSON)

```bash
cd ~/the-6-apps

# Clone App3
git clone https://github.com/zumanm1/ospf-nn-json.git app3-nn-json
cd app3-nn-json

# Install and start
./netviz.sh install
./netviz.sh deps
./netviz.sh start
```

### Step 4: Verify Both Apps Running

| Service | Port | URL | Health Check |
|---------|------|-----|--------------|
| Keycloak (App0) | 9120 | http://localhost:9120/admin | `curl localhost:9120/health/ready` |
| Vault (App0) | 9121 | http://localhost:9121/ui | `curl localhost:9121/v1/sys/health` |
| Frontend (App3) | 9080 | http://localhost:9080 | Browser |
| Backend (App3) | 9081 | http://localhost:9081/api/health | `curl localhost:9081/api/health` |

### Quick Start (Copy-Paste)

```bash
# Full standalone setup for App0 + App3
cd ~ && mkdir -p the-6-apps && cd the-6-apps
git clone https://github.com/zumanm1/auth-vault.git app0-auth-vault
git clone https://github.com/zumanm1/ospf-nn-json.git app3-nn-json

# Start App0
cd app0-auth-vault && ./auth-vault.sh install && ./auth-vault.sh start
cd ..

# Start App3
cd app3-nn-json
./netviz.sh install && ./netviz.sh deps && ./netviz.sh start
```

---

## 📜 Available Scripts

### Setup Commands

| Script | Description |
|--------|-------------|
| `./netviz.sh setup` | **First-time setup**: Install nvm + Node.js v20 (isolated environment) |
| `./netviz.sh install` | Check/install system requirements (Node.js, npm) |
| `./netviz.sh deps` | Check/install project dependencies (skips if already installed) |
| `./setup-nvm.sh` | Standalone nvm + Node.js environment setup script |

### Server Commands

| Script | Description |
|--------|-------------|
| `./netviz.sh start` | Start Frontend (9080) and Backend (9081) servers |
| `./netviz.sh stop` | Stop all running servers |
| `./netviz.sh restart` | Restart all servers |
| `./netviz.sh status` | Show system and server status |
| `./netviz.sh logs` | View server logs (tail -f) |

### Build Commands

| Script | Description |
|--------|-------------|
| `./netviz.sh clean` | Clean build artifacts and node_modules |
| `./netviz.sh build` | Build for production |

### Individual Scripts

```bash
./setup-nvm.sh        # Setup nvm + Node.js (interactive)
./install.sh          # Install dependencies only
./start.sh            # Start all servers (with menu)
./stop.sh             # Stop all servers
```

### Script Options

```bash
# Start on a custom port
./netviz.sh start -p 3000

# Start in background mode
./netviz.sh start --bg

# Force reinstall dependencies
./netviz.sh deps --force

# Using environment variable
NETVIZ_PORT=8080 ./netviz.sh start
```

---

## 🔒 Isolated Node.js Environment

This project uses **isolated Node.js/npm versions** to avoid conflicts with other projects on your machine.

### Quick Setup (Recommended)

```bash
# One command to install nvm + Node.js v20
./netviz.sh setup

# Or use the standalone script
./setup-nvm.sh
```

This will:
1. Install nvm (Node Version Manager) if not present
2. Install Node.js v20 LTS
3. Configure your shell for auto-switching
4. Display next steps

### Version Pinning Files

| File | Purpose | Tool Support |
|------|---------|--------------|
| `.nvmrc` | Pins Node v20 | nvm, fnm |
| `.node-version` | Pins Node v20 | fnm, volta, nodenv |
| `package.json` engines | Enforces Node 18-24, npm 9+ | npm |
| `package.json` packageManager | Pins npm@10.8.2 | corepack |

### Using nvm (Recommended)

```bash
# Option 1: Use our setup script (easiest)
./netviz.sh setup

# Option 2: Manual nvm installation
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Restart terminal, then:
cd OSPF-NN-JSON
nvm use          # Automatically uses Node v20 from .nvmrc

# Or manually:
nvm install 20
nvm use 20
```

### Using Volta (Alternative)

```bash
# Install Volta
curl https://get.volta.sh | bash

# Pin versions for this project
cd OSPF-NN-JSON
volta pin node@20
volta pin npm@10
```

### Using fnm (Fast Alternative)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Use project version
cd OSPF-NN-JSON
fnm use          # Reads .node-version
```

### Automatic Version Switching

All `./netviz.sh` commands automatically:
1. Detect if nvm is installed
2. Switch to the project's required Node version (v20)
3. Warn if using an incompatible version

```bash
./netviz.sh setup     # Install nvm + Node.js (first-time)
./netviz.sh install   # Shows isolation status and switches Node version
./netviz.sh start     # Auto-loads correct Node version before starting
./netviz.sh deps      # Auto-loads correct Node version before installing
```

### Shell Auto-Switching (Optional)

Add this to your `~/.zshrc` or `~/.bashrc` for automatic version switching when entering the project directory:

```bash
# Auto-switch Node version when entering directory with .nvmrc
autoload -U add-zsh-hook 2>/dev/null
load-nvmrc() {
  if [ -f .nvmrc ]; then
    nvm use 2>/dev/null
  fi
}
add-zsh-hook chpwd load-nvmrc 2>/dev/null
```

---

## 🛠️ System Requirements

- **Node.js** v18.0.0 - v24.x (v20 LTS recommended)
- **npm** v9.0.0+ (comes with Node.js)
- **OS:** Linux (Ubuntu 20.04+) or macOS
- **Ports:** 9080 (frontend), 9081 (backend)

### Install Node.js (Manual)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

---

## 📊 Features

### 4 Main Views (Tabs)
| View | Description |
|------|-------------|
| **Visualizer** | Interactive network graph with path simulation |
| **Designer** | Topology design and modification |
| **Planner** | Scenario planning and what-if analysis |
| **Analysis** | Capacity and utilization analytics |

### Network Visualization
- **Interactive vis.js graph** with zoom/pan
- **OSPF Cost Labels** on network links
- **Asymmetric cost display** (forward↔reverse format)
- **Color-coded links** (blue=normal, amber=asymmetric, red=down)
- **Path highlighting** with animated visualization
- **Country-based filtering** and grouping

### Analysis Modals
| Modal | Description |
|-------|-------------|
| **Path Simulation** | Dijkstra shortest path calculation |
| **Network Health** | Health score and bottleneck detection |
| **Ripple Effect** | Chain reaction analysis |
| **Impact Analysis** | Link change impact simulation |
| **Path Comparison** | Compare multiple paths |
| **Traffic Engineering** | Traffic flow optimization |
| **Blast Radius** | Failure impact analysis |
| **Link Inspector** | Detailed link information |

### Import/Export
- **Import JSON topology** files
- **Export topology** in multiple formats
- **Download templates** for easy setup

---

## 🔐 Authentication System

OSPF Visualizer Pro includes enterprise-grade authentication:

- **JWT-based sessions** with secure tokens
- **Rate limiting** on auth endpoints
- **Helmet security headers** (CSP, HSTS, X-Frame-Options)
- **Password change** functionality
- **Session management**

---

## 🌐 Running on Remote Server

```bash
# Start servers (binds to 0.0.0.0)
./netviz.sh start --bg

# Access from any machine on the network:
# http://<server-ip>:9080
```

---

## 🔒 Network & IP Configuration

Configure in `.env` (ROOT directory, NOT server/.env):

```bash
# Server Binding - Controls which interface the server listens on
# Options: 127.0.0.1 (localhost only), 0.0.0.0 (all interfaces), or specific IP
SERVER_HOST=0.0.0.0

# IP Whitelist - Comma-separated list of allowed client IPs
# Use 0.0.0.0 to allow all IPs (not recommended for production)
# Examples: 127.0.0.1,192.168.1.0/24,10.0.0.5
ALLOWED_IPS=0.0.0.0
```

| Setting | Description |
|---------|-------------|
| `SERVER_HOST=0.0.0.0` | Listen on all network interfaces |
| `SERVER_HOST=127.0.0.1` | Listen only on localhost |
| `ALLOWED_IPS=0.0.0.0` | Allow connections from any IP |
| `ALLOWED_IPS=192.168.1.0/24` | Allow only local subnet |
| `ALLOWED_IPS=127.0.0.1,10.0.0.5` | Allow localhost + specific IP |

---

## 🚀 Running in Production

```bash
# Build for production
./netviz.sh build

# Or manually:
npm run build

# Preview production build
npm run preview

# Serve with any static server
npx serve dist
```

---

## 📁 Project Structure

```
OSPF-NN-JSON/
├── netviz.sh               # Master control script
├── setup-nvm.sh            # NVM + Node.js setup script
├── install.sh              # Installation script
├── start.sh                # Start script
├── stop.sh                 # Stop script
├── .nvmrc                  # Node version pin (v20)
├── .node-version           # Node version pin (v20)
├── package.json            # npm dependencies (engines: Node 18-24)
├── .env                    # Environment config (generated)
├── .env.example            # Environment template
├── App.tsx                 # Main React component
├── main.tsx                # Application entry point
├── index.html              # HTML template with favicon
├── public/
│   └── favicon.svg         # OSPF network topology icon
├── components/             # React components (12 total)
│   ├── LoginPage.tsx       # Authentication UI
│   ├── RegisterPage.tsx    # User registration
│   ├── ChangePasswordModal.tsx
│   ├── NetworkHealthModal.tsx
│   ├── RippleEffectModal.tsx
│   ├── PathComparisonModal.tsx
│   ├── TopologyDesigner.tsx
│   ├── ScenarioPlanner.tsx
│   ├── CapacityAnalysis.tsx
│   ├── BlastRadiusAnalyzer.tsx
│   ├── LinkInspector.tsx
│   └── TrafficEngineeringModal.tsx
├── contexts/
│   └── AuthContext.tsx     # Authentication state
├── services/
│   ├── dijkstra.ts         # Pathfinding algorithm
│   ├── dijkstraEnhanced.ts # Advanced pathfinding
│   ├── pathMetrics.ts      # Path analysis
│   └── geometry.ts         # Layout calculations
├── server/                 # Backend
│   ├── index.js            # Express server (port 9081)
│   ├── database/           # SQLite operations
│   ├── routes/             # API routes
│   └── middleware/         # Auth & error handling
├── data/                   # SQLite database
└── dist/                   # Production build
```

---

## 📋 Input File Format

Minimum required JSON structure:

```json
{
  "data": {
    "nodes": [
      {
        "id": "R1",
        "name": "Router-1",
        "country": "USA",
        "loopback_ip": "10.0.0.1"
      }
    ],
    "links": [
      {
        "source": "R1",
        "target": "R2",
        "forward_cost": 10,
        "reverse_cost": 10,
        "status": "up"
      }
    ]
  }
}
```

---

## 🔧 Troubleshooting

### Port already in use
```bash
./netviz.sh stop
# Or manually:
lsof -ti:9080 | xargs kill -9
lsof -ti:9081 | xargs kill -9
```

### npm install fails
```bash
./netviz.sh clean
./netviz.sh deps --force
```

### Check server status
```bash
./netviz.sh status
```

### View logs
```bash
./netviz.sh logs
```

### App shows blank screen
- Check browser console for errors
- Ensure you've uploaded a valid JSON topology file
- Verify `.env` exists and is configured

### Permission denied on scripts
```bash
chmod +x netviz.sh setup-nvm.sh install.sh start.sh stop.sh
```

### Node version mismatch
```bash
# Use nvm to switch to correct version
./netviz.sh setup
# Or manually:
nvm use
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Visualization | vis.js Network |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend | Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| Security | Helmet + Rate Limiting |

---

## 📖 Full Documentation

See [z-document-start.md](z-document-start.md) for detailed documentation.

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Last Updated:** December 6, 2025
