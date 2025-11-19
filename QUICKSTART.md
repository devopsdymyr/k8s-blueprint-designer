# 🚀 Quick Start Guide

## Start the Application (1 minute)

```bash
# Option 1: Use the startup script (recommended)
./start.sh

# Option 2: Manual start
# Terminal 1:
cd backend && ./k8s-discovery-engine -port=8080 -cors=true

# Terminal 2:
cd frontend && npm install && npm start
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/api/v1/health

## Verify It's Working

1. Open http://localhost:3000 in your browser
2. You should see the Kubernetes resource graph
3. Select a namespace from the dropdown
4. Watch real-time updates via WebSocket

## Troubleshooting

### Backend won't start
- Check kubectl: `kubectl get namespaces`
- Verify kubeconfig: `ls ~/.kube/config`

### Frontend can't connect
- Check backend is running: `curl http://localhost:8080/api/v1/health`
- Check browser console for errors

### No resources showing
- Try selecting a specific namespace
- Check backend logs for errors
- Verify cluster access: `kubectl get pods -A`

## Production Deployment

```bash
# Build for production
./build-production.sh

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
```

