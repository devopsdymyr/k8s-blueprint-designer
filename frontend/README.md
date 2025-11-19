# Blueprint Designer Frontend

React + React Flow based visual blueprint designer for Kubernetes resources.

## Technology Stack

- **React** 18+
- **React Flow** - Node-based graph editor
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **WebSocket** - Real-time updates

## Features

- 🎨 Visual node-based blueprint editor
- 🔄 Real-time resource updates
- 🔍 Resource search and filtering
- 📦 Namespace grouping
- 🔗 Dependency visualization
- 🎯 Custom icons for K8s resources
- 📱 Responsive design

## Resource Icons

Custom icons for:
- Deployments
- StatefulSets
- DaemonSets
- Services
- ConfigMaps
- Secrets
- Ingress
- PVCs
- Pods
- Helm Charts

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Configuration

Update `src/config.js`:
- `API_URL` - Backend API endpoint (default: http://localhost:8080)
- `WS_URL` - WebSocket endpoint (default: ws://localhost:8080/ws)

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── BlueprintCanvas/    # Main React Flow canvas
│   │   ├── ResourceNode/       # Custom node components
│   │   ├── ResourceIcons/     # K8s resource icons
│   │   └── Sidebar/            # Resource search sidebar
│   ├── hooks/
│   │   ├── useGraphData.js    # Graph data fetching
│   │   └── useWebSocket.js    # WebSocket connection
│   ├── utils/
│   │   ├── graphTransform.js  # K8s data → React Flow format
│   │   └── layout.js          # Auto-layout algorithms
│   ├── App.js
│   └── index.js
├── public/
└── package.json
```

