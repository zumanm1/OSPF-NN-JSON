#!/bin/bash

# ========================================
# OSPF Visualizer Pro - Restart Script
# ========================================
# Restarts the application
# Usage: ./scripts/restart.sh
# ========================================

echo "Restarting OSPF Visualizer Pro..."

# Stop first
./scripts/stop.sh

sleep 2

# Start backend
echo "Starting backend..."
nohup node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid
echo "✅ Backend started (PID: $BACKEND_PID)"

sleep 3

# Start frontend
echo "Starting frontend..."
nohup npx vite preview --host 0.0.0.0 --port 9080 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo "✅ Application restarted successfully"
