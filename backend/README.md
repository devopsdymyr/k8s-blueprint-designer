# Kubernetes Discovery Engine (Backend)

Go-based backend service for auto-discovering Kubernetes resources and generating blueprint graphs.

## Technology Stack

- **Go** with Kubernetes client-go
- WebSocket server for real-time updates
- REST API for graph data

## Features

### Resource Discovery
- ✅ Deployments
- ✅ StatefulSets
- ✅ DaemonSets
- ✅ Pods
- ✅ Services
- ✅ ConfigMaps
- ✅ Secrets
- ✅ PVCs
- ✅ Ingress
- ✅ CRDs
- ✅ Helm Releases
- ✅ Annotations
- ✅ OwnerReferences

### Relationship Mapping
- Pod → ConfigMap mappings
- Pod → Secret mappings
- Pod → Service mappings
- Service → Ingress mappings
- Deployment → Service relationships
- Resource dependencies

## API Endpoints

### Graph Data
```
GET /api/v1/graph
GET /api/v1/graph/namespace/{namespace}
GET /api/v1/graph/resource/{kind}/{name}
```

### WebSocket
```
WS /ws/graph-updates
```

## Graph Output Format

```json
{
  "nodes": [
    {
      "id": "deploy-loki",
      "type": "Deployment",
      "namespace": "monitoring",
      "name": "loki",
      "labels": {},
      "annotations": {}
    },
    {
      "id": "svc-loki",
      "type": "Service",
      "namespace": "monitoring",
      "name": "loki-service"
    },
    {
      "id": "config-loki",
      "type": "ConfigMap",
      "namespace": "monitoring",
      "name": "loki-config"
    }
  ],
  "edges": [
    {
      "from": "deploy-loki",
      "to": "svc-loki",
      "relation": "exposes",
      "type": "service"
    },
    {
      "from": "deploy-loki",
      "to": "config-loki",
      "relation": "mounts",
      "type": "configmap"
    }
  ]
}
```

## Setup

1. **Install dependencies:**
   ```bash
   go mod init k8s-blueprint-designer/backend
   go get k8s.io/client-go@latest
   go get github.com/gorilla/websocket
   ```

2. **Configure K8s access:**
   - Uses default kubeconfig (~/.kube/config)
   - Or set KUBECONFIG environment variable

3. **Run:**
   ```bash
   go run main.go
   ```

## Configuration

Set environment variables:
- `KUBECONFIG` - Path to kubeconfig file
- `PORT` - Server port (default: 8080)
- `NAMESPACE` - Filter by namespace (optional)
- `SCAN_INTERVAL` - Discovery scan interval in seconds (default: 30)

