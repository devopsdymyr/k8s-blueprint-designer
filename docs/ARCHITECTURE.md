# Architecture Overview

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React Flow    │◄────────│  WebSocket/HTTP  │◄────────│  K8s Cluster │
│   Frontend      │         │   Backend (Go)   │         │              │
└─────────────────┘         └──────────────────┘         └──────────────┘
      │                              │
      │                              │
      └────────── Graph JSON ────────┘
```

## Component Details

### Frontend (React + React Flow)

**Responsibilities:**
- Visual rendering of resource graph
- User interactions (drag, zoom, pan)
- Resource filtering and search
- Real-time updates via WebSocket
- Custom node rendering with icons

**Key Libraries:**
- `reactflow` - Graph visualization
- `axios` - HTTP client
- `tailwindcss` - Styling

### Backend (Go)

**Responsibilities:**
- Kubernetes resource discovery
- Graph generation
- Relationship mapping
- REST API for graph data
- WebSocket for real-time updates
- Periodic scanning

**Key Libraries:**
- `k8s.io/client-go` - Kubernetes client
- `gorilla/websocket` - WebSocket support

## Data Flow

1. **Discovery Phase:**
   - Backend scans Kubernetes cluster
   - Collects all resources (Deployments, Services, etc.)
   - Maps relationships (Pod → Service, Service → Ingress)

2. **Graph Generation:**
   - Converts K8s resources to graph nodes
   - Creates edges based on relationships
   - Adds metadata (labels, annotations)

3. **Frontend Rendering:**
   - Receives graph JSON
   - Transforms to React Flow format
   - Renders nodes with custom components
   - Applies auto-layout

4. **Real-time Updates:**
   - Backend periodically rescans cluster
   - Sends updates via WebSocket
   - Frontend updates graph in real-time

## Resource Relationships

### Discovered Relationships

- **Deployment → Service**: Deployment exposes pods that match service selector
- **Service → Ingress**: Ingress routes traffic to service
- **Pod → ConfigMap**: Pod mounts ConfigMap as volume or env
- **Pod → Secret**: Pod mounts Secret as volume or env
- **StatefulSet → PVC**: StatefulSet uses PersistentVolumeClaim
- **Deployment → ConfigMap**: Deployment references ConfigMap
- **Deployment → Secret**: Deployment references Secret

### Relationship Types

- `exposes` - Deployment/StatefulSet exposes Service
- `exposed-by` - Service exposed by Ingress
- `mounts` - Pod mounts ConfigMap/Secret
- `uses` - Resource uses another resource
- `depends-on` - Resource depends on another

## Extension Points

### Adding New Resource Types

1. **Backend**: Add discovery logic in `main.go`
2. **Frontend**: Add icon and styling in `ResourceNode` component
3. **Graph**: Add relationship mapping logic

### Custom Layouts

Implement layout algorithms in `frontend/src/utils/layout.js`:
- Hierarchical (by namespace)
- Force-directed
- Grid-based
- Custom positioning

