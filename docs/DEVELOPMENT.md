# Development Guide

## Project Structure

```
k8s-blueprint-designer/
├── frontend/              # React + React Flow application
│   ├── src/
│   │   ├── App.js        # Main application component
│   │   ├── components/  # React components (to be created)
│   │   ├── hooks/       # Custom React hooks (to be created)
│   │   └── utils/       # Utility functions (to be created)
│   ├── public/
│   └── package.json
├── backend/               # Go discovery engine
│   ├── main.go          # Main entry point
│   └── go.mod           # Go dependencies
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

## Development Workflow

### 1. Backend Development

**Setup:**
```bash
cd backend
go mod tidy
```

**Run:**
```bash
go run main.go
# Or with options:
go run main.go --port 8080 --namespace dev-v5
```

**Test API:**
```bash
curl http://localhost:8080/api/v1/graph
curl http://localhost:8080/api/v1/health
```

### 2. Frontend Development

**Setup:**
```bash
cd frontend
npm install
```

**Run:**
```bash
npm start
# Opens http://localhost:3000
```

**Build:**
```bash
npm run build
```

## Adding New Features

### Add New Resource Type

1. **Backend** (`backend/main.go`):
   - Add discovery logic in `GenerateGraph()`
   - Add node to graph
   - Map relationships

2. **Frontend** (`frontend/src/App.js`):
   - Add icon in `getIcon()` function
   - Add color in `getColor()` function
   - Update `ResourceNode` component if needed

### Add New Relationship Type

1. **Backend**: Add relationship mapping logic
2. **Frontend**: Update edge styling if needed

### Custom Layout Algorithm

Create `frontend/src/utils/layout.js`:
```javascript
export function hierarchicalLayout(nodes, edges) {
  // Implement layout algorithm
  return positionedNodes;
}
```

## Testing

### Backend Testing

```bash
cd backend
go test ./...
```

### Frontend Testing

```bash
cd frontend
npm test
```

## API Development

### Current Endpoints

- `GET /api/v1/graph` - Get full graph
- `GET /api/v1/graph/namespace/{ns}` - Get graph for namespace
- `GET /api/v1/health` - Health check

### Adding New Endpoints

Edit `backend/main.go`:
```go
http.HandleFunc("/api/v1/new-endpoint", func(w http.ResponseWriter, r *http.Request) {
    // Handler logic
})
```

## WebSocket Support (Future)

To add real-time updates:

1. **Backend**: Add WebSocket handler
2. **Frontend**: Add WebSocket client hook
3. **Integration**: Update graph on WebSocket messages

## Performance Optimization

### Backend
- Cache graph data
- Incremental updates
- Parallel resource fetching

### Frontend
- Virtual scrolling for large graphs
- Debounced updates
- Memoized components

## Debugging

### Backend
- Enable verbose logging
- Check kubeconfig access
- Verify RBAC permissions

### Frontend
- React DevTools
- Network tab for API calls
- Console logs

