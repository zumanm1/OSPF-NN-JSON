#!/bin/bash

# ========================================
# OSPF Visualizer Pro - Stop Script
# ========================================
# Stops all running processes
# Usage: ./scripts/stop.sh
# ========================================

echo "Stopping OSPF Visualizer Pro..."

# Kill backend
if [ -f .backend.pid ]; then
    PID=$(cat .backend.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "✅ Backend stopped (PID: $PID)"
    else
        echo "⚠️  Backend process not running"
    fi
    rm .backend.pid
else
    pkill -f "node server/index.js" && echo "✅ Backend stopped" || echo "⚠️  No backend process found"
fi

# Kill frontend
if [ -f .frontend.pid ]; then
    PID=$(cat .frontend.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "✅ Frontend stopped (PID: $PID)"
    else
        echo "⚠️  Frontend process not running"
    fi
    rm .frontend.pid
else
    pkill -f "vite preview" && echo "✅ Frontend stopped" || echo "⚠️  No frontend process found"
fi

echo "✅ All processes stopped"
