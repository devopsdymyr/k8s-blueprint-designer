#!/bin/bash

# Production build script for K8s Blueprint Designer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🏗️  Building K8s Blueprint Designer for production..."
echo ""

# Build backend
echo "📦 Building backend..."
cd backend
go build -ldflags="-s -w" -o k8s-discovery-engine .
echo "✅ Backend built successfully"
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
npm run build
echo "✅ Frontend built successfully"
cd ..

echo ""
echo "✅ Production build complete!"
echo ""
echo "📁 Backend binary: backend/k8s-discovery-engine"
echo "📁 Frontend build: frontend/build/"
echo ""
echo "To run in production:"
echo "  ./backend/k8s-discovery-engine -port=8080 -cors=true"
echo "  (Serve frontend/build/ with a web server like nginx)"

