# 🎨 Kubernetes Blueprint Designer

A production-ready, enterprise-grade tool to visualize and manage Kubernetes cluster blueprints. Discover, visualize, and understand your Kubernetes resources in real-time with an interactive graph interface.

![Kubernetes Blueprint Designer](https://img.shields.io/badge/Kubernetes-Blueprint%20Designer-blue?style=for-the-badge&logo=kubernetes)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go)
![React](https://img.shields.io/badge/React-18.2+-61DAFB?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## 🚀 Features

- **🔍 Real-time Discovery**: Automatically discovers all Kubernetes resources in your cluster
- **📊 Interactive Visualization**: Beautiful React Flow-based graph visualization with customizable layouts
- **⚡ WebSocket Updates**: Live updates as resources change in your cluster
- **🎯 Advanced Filtering**: Filter by namespace, resource types, connection types, and search
- **🔗 Resource Relationships**: Automatically maps relationships between Deployments, Services, Pods, Ingress, PVCs, and more
- **🎨 Customizable Layer Ordering**: Reorder resource layers to match your architecture view
- **📥 Export Capabilities**: Export blueprints as JSON for documentation and analysis
- **🏭 Production Ready**: Built with Go backend and React frontend, deployable to Kubernetes
- **🔒 Secure**: No credentials stored, uses your existing kubeconfig

## 📋 Prerequisites

- Go 1.21+
- Node.js 18+
- Kubernetes cluster access (kubeconfig or in-cluster)
- kubectl configured

## 🏃 Quick Start

### Option 1: Development Mode (Recommended for testing)

```bash
# Start both backend and frontend
./start.sh
```

This will:
- Build the backend if needed
- Start backend on port 8080
- Start frontend on port 3000
- Open http://localhost:3000 in your browser

### Option 2: Manual Start

```bash
# Terminal 1: Start backend
cd backend
go run main.go -port=8080 -cors=true

# Terminal 2: Start frontend
cd frontend
npm install
npm start
```

### Option 3: Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🏗️ Production Build

```bash
# Build for production
./build-production.sh

# Run backend
./backend/k8s-discovery-engine -port=8080 -cors=true

# Serve frontend (use nginx or similar)
# Frontend build is in frontend/build/
```

## ☸️ Kubernetes Deployment

Deploy to your Kubernetes cluster:

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Get service URL
kubectl get svc k8s-blueprint-designer

# Access via LoadBalancer IP or port-forward
kubectl port-forward svc/k8s-blueprint-designer 8080:8080 3000:80
```

## 🔧 Configuration

### Backend Flags

- `-port`: Server port (default: 8080)
- `-namespace`: Filter by namespace (default: all)
- `-scan-interval`: Discovery scan interval in seconds (default: 30)
- `-cors`: Enable CORS (default: true)

### Environment Variables

- `KUBECONFIG`: Path to kubeconfig file (default: ~/.kube/config)
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8080)

## 📊 API Endpoints

- `GET /api/v1/graph` - Get resource graph (supports `?namespace=name` query)
- `GET /api/v1/namespaces` - List all namespaces
- `GET /api/v1/health` - Health check
- `WS /ws/graph-updates` - WebSocket for real-time updates

## 🎨 Supported Resources

- Deployments
- StatefulSets
- DaemonSets
- Services
- ConfigMaps
- Secrets
- Ingress
- PersistentVolumeClaims

## 🔒 Security

The application requires read-only access to Kubernetes resources. The RBAC configuration in `k8s/deployment.yaml` provides the necessary permissions.

For production:
- Use proper authentication/authorization
- Enable TLS/HTTPS
- Restrict network access
- Use service accounts with minimal permissions

## 🐛 Troubleshooting

### Backend can't connect to cluster

1. Check kubeconfig: `kubectl config view`
2. Test connection: `kubectl get namespaces`
3. Verify KUBECONFIG env var or ~/.kube/config exists

### Frontend can't connect to backend

1. Check backend is running: `curl http://localhost:8080/api/v1/health`
2. Verify CORS is enabled: `-cors=true`
3. Check API_URL in frontend environment

### WebSocket not connecting

1. Check backend logs for WebSocket errors
2. Verify firewall/proxy allows WebSocket connections
3. Check browser console for connection errors

## 📝 Development

### Backend

```bash
cd backend
go mod tidy
go run main.go
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## 🚢 Deployment Options

1. **Local Development**: Use `./start.sh`
2. **Docker**: Use `docker-compose up`
3. **Kubernetes**: Apply `k8s/deployment.yaml`
4. **Standalone Binary**: Build and run backend, serve frontend with nginx

## 📸 Screenshots

*Coming soon - Add screenshots of the visualization*

## 🛠️ Tech Stack

- **Backend**: Go 1.21+, Kubernetes client-go
- **Frontend**: React 18.2+, React Flow, Tailwind CSS
- **Deployment**: Docker, Kubernetes, Docker Compose

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Kubernetes](https://kubernetes.io/) for the amazing orchestration platform
- [React Flow](https://reactflow.dev/) for the graph visualization library
- [Kubernetes Community Icons](https://github.com/kubernetes/community/tree/master/icons) for resource icons

## 📞 Support

- 🐛 **Bug Reports**: [Open an Issue](https://github.com/YOUR_USERNAME/k8s-blueprint-designer/issues)
- 💡 **Feature Requests**: [Open an Issue](https://github.com/YOUR_USERNAME/k8s-blueprint-designer/issues)
- 📧 **Questions**: [Open a Discussion](https://github.com/YOUR_USERNAME/k8s-blueprint-designer/discussions)

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐
