# OSPF Visualizer Pro - Quick Start Guide

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Installation (4 Commands)](#quick-installation-4-commands)
3. [Detailed Installation](#detailed-installation)
4. [Starting the Application](#starting-the-application)
5. [Stopping the Application](#stopping-the-application)
6. [Remote Server Deployment](#remote-server-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Default Credentials](#default-credentials)

---

## 🖥️ System Requirements

| Component | Minimum Version | Recommended |
|-----------|----------------|-------------|
| Node.js   | v18.0.0        | v20.x LTS   |
| npm       | v9.0.0         | v10.x       |
| OS        | Linux/macOS    | Ubuntu 22.04+ |

---

## ⚡ Quick Installation (4 Commands)

```bash
# 1. Clone the repository
git clone https://github.com/zumanm1/OSPF-NN-JSON.git

# 2. Navigate to the project directory
cd OSPF-NN-JSON

# 3. Install dependencies (checks/installs Node.js, npm, and packages)
chmod +x install.sh && ./install.sh

# 4. Start the application
./start.sh
```

**Access the application:** http://localhost:9080

---

## 📦 Detailed Installation

### Option 1: Automated Installation (Recommended)

The `install.sh` script automatically:
- ✅ Checks if Node.js is installed (installs if missing)
- ✅ Checks if npm is installed (upgrades if outdated)
- ✅ Installs all npm dependencies
- ✅ Creates `.env` configuration file
- ✅ Sets up the data directory

```bash
./install.sh
```

### Option 2: Manual Installation

#### Step 1: Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS (with Homebrew):**
```bash
brew install node@20
```

**Verify installation:**
```bash
node --version  # Should be v18+ 
npm --version   # Should be v9+
```

#### Step 2: Clone and Install

```bash
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
npm install
```

#### Step 3: Configure Environment

Create a `.env` file:
```bash
cat > .env << 'EOF'
# Server ports
PORT=9081
API_PORT=9081
NODE_ENV=development

# JWT Configuration (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Admin Credentials (CHANGE IN PRODUCTION!)
APP_ADMIN_USERNAME=netviz_admin
APP_ADMIN_PASSWORD=V3ry$trongAdm1n!2025

# Database
DB_PATH=./data/ospf-visualizer.db

# CORS Configuration (add your server IP)
CORS_ORIGINS=http://localhost:9080,http://127.0.0.1:9080
ALLOWED_ORIGINS=http://localhost:9080,http://127.0.0.1:9080

# IP Access Control (0.0.0.0 allows all IPs)
ALLOWED_IPS=0.0.0.0
EOF
```

---

## 🚀 Starting the Application

### Quick Start (Development Mode)
```bash
./start.sh
```

### Start Options

| Command | Description |
|---------|-------------|
| `./start.sh` | Quick start in development mode |
| `./start.sh --dev` | Development mode with hot reload |
| `./start.sh --prod` | Production mode (from build) |
| `./start.sh --backend` | Backend server only |
| `./start.sh --frontend` | Frontend dev server only |
| `./start.sh --background` | Background mode (for remote servers) |
| `./start.sh --menu` | Interactive menu |

### Using npm directly
```bash
# Development mode (both frontend and backend)
npm run start:all

# Frontend only
npm run dev

# Backend only
npm run server

# Build for production
npm run build
```

---

## 🛑 Stopping the Application

### Quick Stop
```bash
./stop.sh
```

### Stop Options

| Command | Description |
|---------|-------------|
| `./stop.sh` | Stop all app processes |
| `./stop.sh --status` | Check running status |
| `./stop.sh --force` | Force kill all Node processes |

### Manual Stop
```bash
# Kill by port
kill $(lsof -ti:9080)  # Frontend
kill $(lsof -ti:9081)  # Backend

# Or kill all node processes (use with caution)
killall node
```

---

## 🌐 Remote Server Deployment

### Deploy to Remote Server

```bash
# SSH into the server
ssh user@your-server-ip

# Clone and install
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
chmod +x install.sh start.sh stop.sh
./install.sh

# Start in background mode (recommended for remote servers)
./start.sh --background
```

### Remote Server Requirements
- SSH access enabled
- sudo privileges for installing Node.js
- Ports 9080 and 9081 open in firewall

### Important Configuration for Remote Access

The `install.sh` script **automatically detects all network interfaces** and configures CORS for all of them. However, if you need to access from a specific IP that wasn't detected, edit the `.env` file:

```bash
# CORS origins - add any additional IPs needed
CORS_ORIGINS=http://localhost:9080,http://YOUR_SERVER_IP:9080
ALLOWED_ORIGINS=http://localhost:9080,http://YOUR_SERVER_IP:9080

# Allow all IPs to access the API (default)
ALLOWED_IPS=0.0.0.0
```

If accessing from a different network interface than the primary one, update `.env.local`:
```bash
echo "VITE_API_URL=http://YOUR_SPECIFIC_IP:9081/api" > .env.local
```

Then restart the application:
```bash
./stop.sh
./start.sh --background
```

**Note:** The `start.sh --background` command will display all available network URLs after starting.

### Accessing Remote Server

Open in browser: `http://YOUR_SERVER_IP:9080`

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :9080
lsof -i :9081

# Kill the process
./stop.sh

# Or force kill
./stop.sh --force
```

### Node.js Version Too Old
```bash
# Check current version
node --version

# Upgrade Node.js (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Upgrade Node.js (macOS)
brew upgrade node
```

### npm Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Database Issues
```bash
# Reset database
rm -rf data/ospf-visualizer.db
./start.sh  # Will recreate database
```

### Permission Denied
```bash
# Make scripts executable
chmod +x install.sh start.sh stop.sh deploy-remote.sh
```

---

## 🔐 Default Credentials

| Type | Value |
|------|-------|
| **Username** | `netviz_admin` |
| **Password** | `V3ry$trongAdm1n!2025` |

⚠️ **Important:** Change these credentials in production by editing the `.env` file.

---

## 📁 Project Structure

```
OSPF-NN-JSON/
├── install.sh          # Installation script
├── start.sh            # Start script
├── stop.sh             # Stop script
├── deploy-remote.sh    # Remote deployment script
├── package.json        # npm dependencies
├── .env                # Environment configuration
├── App.tsx             # Main React component
├── server/             # Backend Express server
│   └── index.js        # Server entry point
├── components/         # React components
├── services/           # Business logic
├── data/               # SQLite database
└── dist/               # Production build
```

---

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in the terminal
3. Open an issue on GitHub

---

**Last Updated:** December 1, 2025

