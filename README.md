# OSPF Visualizer Pro

A comprehensive OSPF (Open Shortest Path First) network topology visualizer and analyzer with enterprise-grade authentication and multi-modal analysis.

![OSPF Visualizer Pro](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON
```

### 2. Using Master Script (Recommended)

```bash
# One-liner to install and start
./netviz.sh install && ./netviz.sh deps && ./netviz.sh start

# Or step by step:
./netviz.sh install   # Install Node.js if not present
./netviz.sh deps      # Install npm dependencies (skips if already installed)
./netviz.sh start     # Start servers (Frontend: 9080, Backend: 9081)
```

### 3. Manual Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your secure credentials

# Start development servers
npm run start:all     # Both frontend and backend
# OR separately:
npm run dev           # Frontend only (port 9080)
npm run server        # Backend only (port 9081)
```

**Access the app:** http://localhost:9080

**Default credentials:** `netviz_admin` / `V3ry$trongAdm1n!2025`

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `./netviz.sh install` | Install system requirements (Node.js, npm) |
| `./netviz.sh deps` | Install project dependencies (skips if already installed) |
| `./netviz.sh start` | Start Frontend (9080) and Backend (9081) servers |
| `./netviz.sh stop` | Stop all running servers |
| `./netviz.sh restart` | Restart all servers |
| `./netviz.sh status` | Show system and server status |
| `./netviz.sh logs` | View server logs (tail -f) |
| `./netviz.sh clean` | Clean build artifacts and node_modules |
| `./netviz.sh build` | Build for production |

### Individual Scripts

```bash
./install.sh          # Install dependencies only
./start.sh            # Start all servers (with menu)
./stop.sh             # Stop all servers
```

### Script Options

```bash
# Start in background mode (for remote servers)
./netviz.sh start --bg

# Start on a custom port
./netviz.sh start -p 3000

# Force reinstall dependencies
./netviz.sh deps --force

# Using environment variable
NETVIZ_PORT=8080 ./netviz.sh start
```

---

## 🛠️ System Requirements

- **Node.js** v18.0.0+ (required)
- **npm** v9.0.0+ (comes with Node.js)
- **OS:** Linux (Ubuntu 20.04+) or macOS
- **Ports:** 9080 (frontend), 9081 (backend)

### Install Node.js

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
├── install.sh              # Installation script
├── start.sh                # Start script
├── stop.sh                 # Stop script
├── package.json            # npm dependencies
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
chmod +x netviz.sh install.sh start.sh stop.sh
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

**Last Updated:** December 4, 2025
