# Setup Guide

## Prerequisites

- **Kubernetes cluster** access (kubeconfig configured)
- **Node.js** 18+ (for frontend)
- **Go** 1.21+ (for backend)
- **npm** or **yarn**

## Quick Start

### 1. Backend Setup

```bash
cd backend
go mod init k8s-blueprint-designer/backend
go mod tidy
go run main.go
```

Backend will start on `http://localhost:8080`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend will start on `http://localhost:3000`

### 3. Access

Open browser to `http://localhost:3000`

## Configuration

### Backend Environment Variables

```bash
export KUBECONFIG=/path/to/kubeconfig
export PORT=8080
export NAMESPACE=dev-v5  # Optional: filter by namespace
export SCAN_INTERVAL=30  # Seconds between scans
```

### Frontend Environment Variables

Create `.env` file in `frontend/`:
```
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080/ws
```

## Development

### Backend Development

```bash
cd backend
go run main.go --port 8080 --namespace dev-v5
```

### Frontend Development

```bash
cd frontend
npm start
```

Hot reload is enabled by default.

## Testing

### Test Backend API

```bash
curl http://localhost:8080/api/v1/graph
curl http://localhost:8080/api/v1/graph/namespace/dev-v5
```

### Test Frontend

```bash
cd frontend
npm test
```

## Production Build

### Frontend

```bash
cd frontend
npm run build
```

Output in `frontend/build/`

### Backend

```bash
cd backend
go build -o bin/discovery-engine main.go
./bin/discovery-engine
```

## Troubleshooting

### Backend can't connect to cluster

- Check `kubectl` works: `kubectl get nodes`
- Verify kubeconfig: `echo $KUBECONFIG`
- Check RBAC permissions

### Frontend can't connect to backend

- Verify backend is running: `curl http://localhost:8080/api/v1/health`
- Check CORS settings
- Verify API_URL in frontend config

### No resources showing

- Check namespace filter
- Verify cluster has resources
- Check backend logs for errors

