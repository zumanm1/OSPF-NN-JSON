#!/bin/bash

# ========================================
# OSPF Visualizer Pro - Status Script
# ========================================
# Shows application status
# Usage: ./scripts/status.sh
# ========================================

echo "========================================="
echo "  OSPF Visualizer Pro - Status"
echo "========================================="
echo ""

# Check backend
if [ -f .backend.pid ]; then
    PID=$(cat .backend.pid)
    if ps -p $PID > /dev/null; then
        echo "✅ Backend: Running (PID: $PID)"
        # Check if responding
        if curl -s http://localhost:9081/api/health | grep -q "ok"; then
            echo "   └─ Health check: ✅ OK"
        else
            echo "   └─ Health check: ❌ FAILED"
        fi
    else
        echo "❌ Backend: Not running (stale PID file)"
    fi
else
    if pgrep -f "node server/index.js" > /dev/null; then
        echo "⚠️  Backend: Running but no PID file"
    else
        echo "❌ Backend: Not running"
    fi
fi

echo ""

# Check frontend
if [ -f .frontend.pid ]; then
    PID=$(cat .frontend.pid)
    if ps -p $PID > /dev/null; then
        echo "✅ Frontend: Running (PID: $PID)"
        # Check if responding
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:9080 | grep -q "200"; then
            echo "   └─ HTTP check: ✅ OK"
        else
            echo "   └─ HTTP check: ❌ FAILED"
        fi
    else
        echo "❌ Frontend: Not running (stale PID file)"
    fi
else
    if pgrep -f "vite preview" > /dev/null; then
        echo "⚠️  Frontend: Running but no PID file"
    else
        echo "❌ Frontend: Not running"
    fi
fi

echo ""
echo "========================================="
echo ""

# Show recent logs
echo "📝 Recent Backend Logs (last 5 lines):"
tail -5 logs/backend.log 2>/dev/null || echo "No backend logs found"

echo ""
echo "📝 Recent Frontend Logs (last 5 lines):"
tail -5 logs/frontend.log 2>/dev/null || echo "No frontend logs found"

echo ""
