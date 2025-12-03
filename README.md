# OSPF Visualizer Pro

A powerful network topology visualization and analysis platform for OSPF networks.

![OSPF Visualizer Pro](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone https://github.com/zumanm1/OSPF-NN-JSON.git && cd OSPF-NN-JSON

# 2. Install dependencies (auto-installs Node.js if missing)
./install.sh

# 3. Start the application
./start.sh
```

**Access:** http://localhost:9080

**Login:** `netviz_admin` / `V3ry$trongAdm1n!2025`

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `./install.sh` | Install Node.js, npm, and all dependencies |
| `./start.sh` | Start the application (interactive mode) |
| `./start.sh --background` | Start in background (for servers) |
| `./stop.sh` | Stop all running processes |
| `./stop.sh --status` | Check if app is running |

---

## 🖥️ System Requirements

- **Node.js:** v18+ (auto-installed by `install.sh`)
- **npm:** v9+ (auto-installed by `install.sh`)
- **OS:** Linux (Ubuntu 20.04+) or macOS
- **Ports:** 9080 (frontend), 9081 (backend)

---

## 📦 Installation Details

### What `install.sh` Does:

1. ✅ Checks if Node.js v18+ is installed
2. ✅ Installs Node.js if missing (via NodeSource on Linux, Homebrew on macOS)
3. ✅ Checks if npm v9+ is installed
4. ✅ Upgrades npm if outdated
5. ✅ Runs `npm install` to install all dependencies
6. ✅ Creates `.env` configuration file with all detected network IPs
7. ✅ Creates `.env.local` for frontend API configuration
8. ✅ Creates `data/` directory for the database

---

## 🚀 Starting the Application

### Interactive Mode (Local Development)
```bash
./start.sh
```
This starts both frontend and backend with live output in the terminal.

### Background Mode (Remote Servers)
```bash
./start.sh --background
```
This starts the app in the background and shows all available URLs.

### Other Start Options
```bash
./start.sh --dev        # Development mode with hot reload
./start.sh --prod       # Production mode (requires build)
./start.sh --backend    # Backend only
./start.sh --frontend   # Frontend only
./start.sh --menu       # Interactive menu
./start.sh --help       # Show all options
```

---

## 🛑 Stopping the Application

```bash
./stop.sh              # Stop all app processes
./stop.sh --status     # Check running status
./stop.sh --force      # Force kill all Node processes
```

---

## 🌐 Remote Server Deployment

### Step-by-Step:

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone the repository
git clone https://github.com/zumanm1/OSPF-NN-JSON.git
cd OSPF-NN-JSON

# 3. Make scripts executable (if needed)
chmod +x install.sh start.sh stop.sh

# 4. Install dependencies
./install.sh

# 5. Start in background mode
./start.sh --background
```

### Access from Browser:
```
http://your-server-ip:9080
```

### Notes:
- The `install.sh` script automatically detects ALL network interfaces
- CORS is configured for all detected IPs
- Use `./stop.sh --status` to verify the app is running

---

## 🔒 IP Access Control (Whitelist)

Control which IPs can access the backend API via the `ALLOWED_IPS` setting in `.env` (ROOT directory, NOT `server/.env`):

```bash
# Correct file location:
nano .env              # ✅ Root directory
# NOT: nano server/.env  # ❌ Wrong
```

| Setting | Description |
|---------|-------------|
| `ALLOWED_IPS=0.0.0.0` | Allow ALL IPs (default) |
| `ALLOWED_IPS=127.0.0.1` | Localhost only |
| `ALLOWED_IPS=127.0.0.1,192.168.1.100` | Localhost + specific IP |
| `ALLOWED_IPS=127.0.0.1,192.168.1.0/24` | Localhost + subnet (CIDR) |

**After editing `.env`, restart the app:**
```bash
./stop.sh && ./start.sh
```

See [z-document-start.md](z-document-start.md#-ip-access-control-whitelist) for detailed examples.

---

## 🔐 Default Credentials

| Field | Value |
|-------|-------|
| **Username** | `netviz_admin` |
| **Password** | `V3ry$trongAdm1n!2025` |

⚠️ **Change these in production** by editing the `.env` file.

---

## 📁 Project Structure

```
OSPF-NN-JSON/
├── install.sh          # Installation script
├── start.sh            # Start script
├── stop.sh             # Stop script
├── package.json        # npm dependencies
├── .env                # Environment config (generated)
├── .env.local          # Frontend config (generated)
├── App.tsx             # Main React component
├── server/             # Backend Express server
│   └── index.js        # Server entry point
├── components/         # React components
├── services/           # Business logic (Dijkstra, etc.)
├── contexts/           # React contexts (Auth)
├── data/               # SQLite database
└── dist/               # Production build
```

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
./stop.sh              # Stop the app
./stop.sh --force      # Or force kill
```

### Permission Denied
```bash
chmod +x install.sh start.sh stop.sh
```

### Node.js Not Found After Install
```bash
# Reload shell
source ~/.bashrc
# Or restart terminal
```

### Database Issues
```bash
rm -rf data/ospf-visualizer.db
./start.sh  # Recreates database
```

### CORS Issues on Remote Server
Edit `.env` and add your IP:
```bash
CORS_ORIGINS=http://localhost:9080,http://YOUR_IP:9080
ALLOWED_ORIGINS=http://localhost:9080,http://YOUR_IP:9080
```

---

## 📖 Full Documentation

See [z-document-start.md](z-document-start.md) for detailed documentation.

---

## 📞 Support

1. Check the [Troubleshooting](#troubleshooting) section
2. Review terminal logs
3. Open an issue on GitHub

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Last Updated:** December 1, 2025
