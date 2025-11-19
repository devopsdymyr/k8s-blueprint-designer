#!/bin/bash

# Production startup script for K8s Blueprint Designer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting K8s Blueprint Designer..."
echo ""

# Check if backend binary exists, if not build it
if [ ! -f "backend/k8s-discovery-engine" ]; then
    echo "📦 Building backend..."
    cd backend
    go build -o k8s-discovery-engine .
    cd ..
fi

# Start backend in background
echo "🔧 Starting backend server on port 8080..."
cd backend
./k8s-discovery-engine -port=8080 -cors=true &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start frontend
echo "🎨 Starting frontend development server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ K8s Blueprint Designer is running!"
echo ""
echo "📊 Backend API: http://localhost:8080"
echo "🎨 Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait

