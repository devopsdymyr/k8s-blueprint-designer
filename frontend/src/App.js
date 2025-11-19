import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import ResourceNode from './ResourceNode';
import FilterPanel from './FilterPanel';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// ResourceNode is now imported from separate file

const nodeTypes = {
  resource: ResourceNode,
};

// Simple force-directed layout
function calculateLayout(nodes, edges) {
  const positions = {};
  const nodeMap = {};
  
  // Validate and filter nodes
  const validNodes = (nodes || []).filter(node => node && node.id);
  validNodes.forEach(node => {
    nodeMap[node.id] = node;
  });

  // Group nodes by type (handle both graph format from API and React Flow format)
  const typeGroups = {};
  validNodes.forEach(node => {
    // Handle both formats: node.type (from API) or node.data.type (from React Flow)
    const type = node.type || (node.data && node.data.type) || 'Unknown';
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push(node.id);
  });

  // Position nodes in layers by type
  let x = 0;
  const typeOrder = ['Namespace', 'Ingress', 'Service', 'Deployment', 'StatefulSet', 'DaemonSet', 'ConfigMap', 'Secret', 'PVC'];
  const ySpacing = 150;
  const xSpacing = 250;

  typeOrder.forEach(type => {
    if (typeGroups[type]) {
      let y = 0;
      typeGroups[type].forEach(nodeId => {
        positions[nodeId] = { x, y };
        y += ySpacing;
      });
      x += xSpacing;
    }
  });

  // Handle remaining types
  Object.keys(typeGroups).forEach(type => {
    if (!typeOrder.includes(type)) {
      let y = 0;
      typeGroups[type].forEach(nodeId => {
        if (!positions[nodeId]) {
          positions[nodeId] = { x, y };
          y += ySpacing;
        }
      });
      x += xSpacing;
    }
  });

  return positions;
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [namespaces, setNamespaces] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [progress, setProgress] = useState(null);
  
  // Advanced filtering state
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([
    'Deployment', 'StatefulSet', 'Service', 'Pod', 'Ingress', 'ConfigMap', 'Secret', 'PVC', 'DaemonSet'
  ]);
  const [selectedConnectionTypes, setSelectedConnectionTypes] = useState([
    'exposes', 'manages', 'routes-to', 'exposed-by', 'uses-secret', 'uses'
  ]);
  const [showPodToPod, setShowPodToPod] = useState(false);
  const [showPVC, setShowPVC] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [layerOrder, setLayerOrder] = useState([
    'Ingress',
    'Service',
    'Deployment',
    'StatefulSet',
    'DaemonSet',
    'Pod',
    'ConfigMap',
    'Secret',
    'PVC'
  ]);

  // Fetch namespaces
  const fetchNamespaces = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/namespaces`);
      setNamespaces(response.data.namespaces || []);
    } catch (err) {
      console.error('Error fetching namespaces:', err);
    }
  }, []);

  // Fetch graph data from backend
  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedNamespace
        ? `${API_URL}/api/v1/graph?namespace=${selectedNamespace}`
        : `${API_URL}/api/v1/graph`;
      
      const response = await axios.get(url, { 
        timeout: 120000 // 2 minutes for large clusters
      });
      const graph = response.data;
      
      // Update progress if available
      if (graph.progress) {
        setProgress(graph.progress);
      }

      // Handle empty or null graph
      if (!graph) {
        setNodes([]);
        setEdges([]);
        setError('Invalid response from backend. Please try again.');
        setLoading(false);
        return;
      }

      // Check if backend is asking to select namespace
      if (graph.progress && graph.progress.currentResource === "Please select a namespace") {
        setNodes([]);
        setEdges([]);
        setError(null); // Clear error - this is expected
        setLoading(false);
        return;
      }

      // Ensure nodes and edges are arrays
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      const edges = Array.isArray(graph.edges) ? graph.edges : [];

      if (nodes.length === 0 && !selectedNamespace) {
        // No namespace selected - this is expected, not an error
        setNodes([]);
        setEdges([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (nodes.length === 0 && selectedNamespace) {
        setNodes([]);
        setEdges([]);
        setError('No resources found in this namespace. Try selecting a different namespace.');
        setLoading(false);
        return;
      }

      // Calculate layout
      const positions = calculateLayout(nodes, edges);

      // Transform K8s graph to React Flow format with validation
      const flowNodes = nodes
        .filter(node => node && node.id && node.type && node.name) // Filter out invalid nodes
        .map((node) => ({
          id: node.id,
          type: 'resource',
          data: {
            name: node.name || 'Unknown',
            type: node.type || 'Unknown',
            namespace: node.namespace || '',
            image: node.image || '',
            secretData: node.secretData || {},
          },
          position: positions[node.id] || { x: 0, y: 0 },
        }));

      // Color code edges by relationship type
      const getEdgeColor = (relation) => {
        const colors = {
          'exposes': '#10b981',      // green for service exposure
          'exposed-by': '#3b82f6',   // blue for ingress
          'uses-secret': '#ef4444',  // red for secrets
          'uses': '#8b5cf6',         // purple for PVCs
          'manages': '#f59e0b',      // orange for pod management
          'routes-to': '#06b6d4',    // cyan for service to pod routing
        };
        return colors[relation] || '#6366f1';
      };

      // Create a set of valid node IDs for edge validation
      const validNodeIds = new Set(flowNodes.map(n => n.id));
      
      const flowEdges = edges
        .filter(edge => {
          // Filter out invalid edges and edges where source or target nodes don't exist
          if (!edge || !edge.from || !edge.to) return false;
          if (!validNodeIds.has(edge.from) || !validNodeIds.has(edge.to)) {
            console.warn(`Edge skipped - missing node: ${edge.from} -> ${edge.to}`);
            return false;
          }
          return true;
        })
        .map((edge, index) => {
          const edgeColor = getEdgeColor(edge.relation);
          return {
            id: `edge-${index}-${edge.from}-${edge.to}`,
            source: edge.from,
            target: edge.to,
            sourceHandle: 'source',
            targetHandle: 'target',
            label: edge.relation || 'related',
            animated: true,
            style: { 
              stroke: edgeColor,
              strokeWidth: 3,
            },
            labelStyle: {
              fill: edgeColor,
              fontWeight: 600,
              fontSize: 10,
            },
            labelBgStyle: {
              fill: '#ffffff',
              fillOpacity: 0.7,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
          };
        });

      console.log(`✅ Graph loaded: ${flowNodes.length} nodes, ${flowEdges.length} edges`);
      console.log('Sample edges:', flowEdges.slice(0, 5));
      
      setNodes(flowNodes);
      setEdges(flowEdges);
      setError(null);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      
      // Don't show error if it's just a timeout during generation
      // The progress polling will continue
      if (err.code === 'ECONNREFUSED') {
        setError(`Cannot connect to backend at ${API_URL}. Make sure backend is running.`);
        setLoading(false);
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        // Timeout during initial request - keep loading and let progress polling handle it
        console.log('Initial request timed out, continuing with progress polling...');
        // Don't set loading to false - let progress polling continue
        // Don't set error - progress polling will show updates
      } else {
        setError(`Failed to fetch graph data: ${err.message}`);
        setLoading(false);
      }
    }
  }, [selectedNamespace, setNodes, setEdges]);

  // WebSocket connection for real-time updates (optional, don't block on failure)
  useEffect(() => {
    // Only connect WebSocket after initial load is complete
    if (loading) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_URL || API_URL.replace('http://', '').replace('https://', '');
    let ws;
    let reconnectTimeout;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/graph-updates`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const graph = JSON.parse(event.data);
            if (!graph) return;

            const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
            const edges = Array.isArray(graph.edges) ? graph.edges : [];

            if (nodes.length > 0) {
              const positions = calculateLayout(nodes, edges);

              const flowNodes = nodes
                .filter(node => node && node.id && node.type && node.name)
                .map((node) => ({
                  id: node.id,
                  type: 'resource',
                  data: {
                    name: node.name || 'Unknown',
                    type: node.type || 'Unknown',
                    namespace: node.namespace || '',
                    image: node.image || '',
                    secretData: node.secretData || {},
                  },
                  position: positions[node.id] || { x: 0, y: 0 },
                }));

              // Color code edges by relationship type
              const getEdgeColor = (relation) => {
                const colors = {
                  'exposes': '#10b981',      // green for service exposure
                  'exposed-by': '#3b82f6',   // blue for ingress
                  'uses-secret': '#ef4444',  // red for secrets
                  'uses': '#8b5cf6',         // purple for PVCs
                  'manages': '#f59e0b',      // orange for pod management
                  'routes-to': '#06b6d4',    // cyan for service to pod routing
                };
                return colors[relation] || '#6366f1';
              };

                      // Create a set of valid node IDs for edge validation
                      const validNodeIds = new Set(flowNodes.map(n => n.id));
                      
                      const flowEdges = edges
                        .filter(edge => {
                          // Filter out invalid edges and edges where source or target nodes don't exist
                          if (!edge || !edge.from || !edge.to) return false;
                          if (!validNodeIds.has(edge.from) || !validNodeIds.has(edge.to)) {
                            return false; // Silently skip in WebSocket updates
                          }
                          return true;
                        })
                        .map((edge, index) => {
                          const edgeColor = getEdgeColor(edge.relation);
                          return {
                            id: `edge-${index}-${edge.from}-${edge.to}`,
                            source: edge.from,
                            target: edge.to,
                            sourceHandle: 'source',
                            targetHandle: 'target',
                            label: edge.relation || 'related',
                            animated: true,
                            style: { 
                              stroke: edgeColor,
                              strokeWidth: 3,
                            },
                            labelStyle: {
                              fill: edgeColor,
                              fontWeight: 600,
                              fontSize: 10,
                            },
                            labelBgStyle: {
                              fill: '#ffffff',
                              fillOpacity: 0.7,
                            },
                            markerEnd: {
                              type: MarkerType.ArrowClosed,
                              color: edgeColor,
                            },
                          };
                        });

              setNodes(flowNodes);
              setEdges(flowEdges);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (err) => {
          // Silently handle errors, don't spam console
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          // Reconnect after 5 seconds if component is still mounted
          reconnectTimeout = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              connectWebSocket();
            }
          }, 5000);
        };
      } catch (err) {
        // WebSocket not supported or failed to create
        setWsConnected(false);
      }
    };

    // Connect after a short delay to ensure backend is ready
    const connectDelay = setTimeout(connectWebSocket, 2000);

    return () => {
      clearTimeout(connectDelay);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [loading, setNodes, setEdges]);

  // Poll for progress updates while loading
  useEffect(() => {
    if (!loading || !selectedNamespace) return; // Only poll when loading and namespace is selected
    
    const progressInterval = setInterval(() => {
      // Fetch current graph to get progress updates
      const url = `${API_URL}/api/v1/graph?namespace=${selectedNamespace}`;
      
      axios.get(url, { timeout: 30000 }) // 30 seconds timeout for progress polling
        .then(response => {
          if (response.data && response.data.progress) {
            setProgress(response.data.progress);
            // If graph is complete, stop polling
            if (response.data.progress.currentResource === "Complete" && 
                response.data.nodes && response.data.nodes.length > 0) {
              clearInterval(progressInterval);
              fetchGraphData(); // Final fetch to update UI
            }
          } else if (response.data && response.data.nodes && response.data.nodes.length > 0) {
            // Graph is ready even without progress
            clearInterval(progressInterval);
            fetchGraphData(); // Final fetch to update UI
          }
        })
        .catch((err) => {
          // Only log if it's not a timeout (timeouts are expected during generation)
          if (err.code !== 'ECONNABORTED' && !err.message.includes('timeout')) {
            console.log('Progress polling error:', err.message);
          }
          // Don't stop polling on errors - graph might still be generating
        });
    }, 2000); // Poll every 2 seconds (less frequent to reduce load)
    
    return () => clearInterval(progressInterval);
  }, [loading, selectedNamespace, fetchGraphData]);

  useEffect(() => {
    fetchNamespaces();
    // Don't auto-load graph - wait for namespace selection or explicit refresh
    // This prevents loading all namespaces on initial page load
  }, [fetchNamespaces]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNamespaceChange = (e) => {
    const newNamespace = e.target.value;
    setSelectedNamespace(newNamespace);
    // Automatically load graph when namespace is selected
    if (newNamespace) {
      setLoading(true);
      fetchGraphData();
    } else {
      // Clear graph when "All Namespaces" is selected
      setNodes([]);
      setEdges([]);
      setLoading(false);
      setProgress(null);
    }
  };

  // Filter nodes and edges based on selected filters
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Resource type filter
      const nodeType = node.data?.type || node.type;
      if (!selectedResourceTypes.includes(nodeType)) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const nodeName = node.data?.name || node.name || '';
        if (!nodeName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
  }, [nodes, selectedResourceTypes, searchTerm]);

  const filteredEdges = useMemo(() => {
    return edges.filter(edge => {
      // Connection type filter
      const relation = edge.label || edge.relation;
      if (!selectedConnectionTypes.includes(relation)) {
        return false;
      }
      
      // Pod-to-pod filter
      if (!showPodToPod && relation === 'pod-to-pod') {
        return false;
      }
      
      // Ensure both source and target nodes are in filtered nodes
      const sourceExists = filteredNodes.some(n => n.id === edge.source);
      const targetExists = filteredNodes.some(n => n.id === edge.target);
      
      return sourceExists && targetExists;
    });
  }, [edges, selectedConnectionTypes, showPodToPod, filteredNodes]);

  // Enhanced hierarchical layout with customizable layer ordering
  const calculateHierarchicalLayout = useCallback((nodes, edges) => {
    const positions = {};
    const nodeMap = {};
    const validNodes = nodes.filter(node => node && node.id);
    
    validNodes.forEach(node => {
      nodeMap[node.id] = node;
    });

    // Build adjacency map for better positioning
    const incomingEdges = {};
    const outgoingEdges = {};
    edges.forEach(edge => {
      if (!incomingEdges[edge.target]) incomingEdges[edge.target] = [];
      if (!outgoingEdges[edge.source]) outgoingEdges[edge.source] = [];
      incomingEdges[edge.target].push(edge);
      outgoingEdges[edge.source].push(edge);
    });

    // Group nodes by type using custom layer order
    const layers = {};
    layerOrder.forEach(layerType => {
      layers[layerType] = [];
    });
    layers['Other'] = []; // For types not in layerOrder

    validNodes.forEach(node => {
      const type = node.data?.type || node.type || 'Unknown';
      if (layers[type]) {
        layers[type].push(node.id);
      } else {
        layers['Other'].push(node.id);
      }
    });

    // Position nodes in layers according to custom order
    let x = 0;
    const xSpacing = 350; // Increased spacing for better visibility
    const ySpacing = 130; // Increased vertical spacing

    // Process layers in custom order
    layerOrder.forEach(layerType => {
      const nodeIds = layers[layerType] || [];
      if (nodeIds.length === 0) return;
      
      // Sort nodes within layer by their connections (more connected nodes first)
      nodeIds.sort((a, b) => {
        const aConnections = (outgoingEdges[a]?.length || 0) + (incomingEdges[a]?.length || 0);
        const bConnections = (outgoingEdges[b]?.length || 0) + (incomingEdges[b]?.length || 0);
        return bConnections - aConnections;
      });
      
      let y = 0;
      nodeIds.forEach(nodeId => {
        positions[nodeId] = { x, y };
        y += ySpacing;
      });
      x += xSpacing;
    });

    // Handle 'Other' types
    if (layers['Other'] && layers['Other'].length > 0) {
      let y = 0;
      layers['Other'].forEach(nodeId => {
        positions[nodeId] = { x, y };
        y += ySpacing;
      });
    }

    return positions;
  }, [layerOrder]);

  // Apply layout to filtered nodes
  const layoutPositions = useMemo(() => {
    return calculateHierarchicalLayout(filteredNodes, filteredEdges);
  }, [filteredNodes, filteredEdges, calculateHierarchicalLayout]);

  // Update node positions
  const positionedNodes = useMemo(() => {
    return filteredNodes.map(node => ({
      ...node,
      position: layoutPositions[node.id] || node.position || { x: 0, y: 0 },
    }));
  }, [filteredNodes, layoutPositions]);

  // Highlight PVC connections
  const highlightedEdges = useMemo(() => {
    return filteredEdges.map(edge => {
      const isPVC = edge.label === 'uses' && edge.target?.includes('pvc-');
      return {
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: showPVC && isPVC ? 4 : edge.style?.strokeWidth || 3,
          strokeDasharray: showPVC && isPVC ? '5,5' : undefined,
        },
      };
    });
  }, [filteredEdges, showPVC]);

  // Export functions
  const handleExport = useCallback(() => {
    const data = {
      nodes: positionedNodes,
      edges: highlightedEdges,
      metadata: {
        namespace: selectedNamespace,
        timestamp: new Date().toISOString(),
        nodeCount: positionedNodes.length,
        edgeCount: highlightedEdges.length,
      },
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `k8s-blueprint-${selectedNamespace || 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [positionedNodes, highlightedEdges, selectedNamespace]);

  const handleReset = useCallback(() => {
    setSelectedResourceTypes(['Deployment', 'StatefulSet', 'Service', 'Pod', 'Ingress', 'ConfigMap', 'Secret', 'PVC', 'DaemonSet']);
    setSelectedConnectionTypes(['exposes', 'manages', 'routes-to', 'exposed-by', 'uses-secret', 'uses']);
    setShowPodToPod(false);
    setShowPVC(true);
    setSearchTerm('');
    setLayerOrder(['Ingress', 'Service', 'Deployment', 'StatefulSet', 'DaemonSet', 'Pod', 'ConfigMap', 'Secret', 'PVC']);
  }, []);

  // Show loading screen only when actually loading
  if (loading && nodes.length === 0 && selectedNamespace) {
    const progressPercent = progress && progress.totalNamespaces > 0
      ? Math.round((progress.completedNamespaces / progress.totalNamespaces) * 100)
      : 0;
    
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading Kubernetes resources...</p>
          
          {progress && progress.totalNamespaces > 0 && (
            <div className="mt-6 space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500">
                <div>Namespace: {progress.currentNamespace || 'Starting...'}</div>
                <div>Progress: {progress.completedNamespaces} / {progress.totalNamespaces} namespaces</div>
                {progress.currentResource && (
                  <div className="text-xs text-gray-400 mt-1">{progress.currentResource}</div>
                )}
                {progress.nodesFound > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    Found: {progress.nodesFound} nodes, {progress.edgesFound} edges
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(!progress || progress.totalNamespaces === 0) && (
            <p className="mt-2 text-sm text-gray-400">Connecting to cluster...</p>
          )}
        </div>
      </div>
    );
  }

  // Show empty state when no namespace selected
  if (!loading && nodes.length === 0 && !selectedNamespace) {
    return (
      <div className="h-screen w-screen bg-gray-50">
        <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">K8s Blueprint Designer</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">{wsConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">Namespace:</label>
            <select
              value={selectedNamespace}
              onChange={handleNamespaceChange}
              className="border rounded px-3 py-2 w-full text-sm"
            >
              <option value="">Select Namespace...</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select a namespace to load resources
            </p>
          </div>

          <button
            onClick={fetchGraphData}
            disabled={!selectedNamespace}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            🔄 Load All Namespaces
          </button>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            <div>Nodes: 0</div>
            <div>Edges: 0</div>
          </div>
        </div>

        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Select a Namespace</h2>
            <p className="text-gray-500">Choose a namespace from the dropdown to view its resources</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-50">
          <div className="absolute top-4 left-4 z-10 max-w-md max-h-[90vh] overflow-y-auto">
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-800">K8s Blueprint Designer</h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">{wsConnected ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              
              <button
                onClick={fetchGraphData}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm font-medium mb-3"
              >
                🔄 {selectedNamespace ? 'Refresh Graph' : 'Load All Namespaces'}
              </button>

              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  {error}
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1">
                <div>Total Nodes: {nodes.length}</div>
                <div>Total Edges: {edges.length}</div>
                <div className="pt-2 border-t">
                  <div>Filtered Nodes: {positionedNodes.length}</div>
                  <div>Filtered Edges: {highlightedEdges.length}</div>
                </div>
              </div>
            </div>

            <FilterPanel
              selectedNamespace={selectedNamespace}
              namespaces={namespaces}
              onNamespaceChange={handleNamespaceChange}
              resourceTypes={[]}
              selectedResourceTypes={selectedResourceTypes}
              onResourceTypesChange={setSelectedResourceTypes}
              connectionTypes={[]}
              selectedConnectionTypes={selectedConnectionTypes}
              onConnectionTypesChange={setSelectedConnectionTypes}
              showPodToPod={showPodToPod}
              onShowPodToPodChange={setShowPodToPod}
              showPVC={showPVC}
              onShowPVCChange={setShowPVC}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onExport={handleExport}
              onReset={handleReset}
              layerOrder={layerOrder}
              onLayerOrderChange={setLayerOrder}
            />
          </div>

          <ReactFlow
            nodes={positionedNodes}
            edges={highlightedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 3 },
            }}
            connectionLineStyle={{ strokeWidth: 3 }}
          >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const colors = {
              Deployment: '#3b82f6',
              StatefulSet: '#a855f7',
              Service: '#10b981',
              ConfigMap: '#eab308',
              Secret: '#ef4444',
              Ingress: '#6366f1',
              PVC: '#6b7280',
            };
            return colors[node.data.type] || '#6b7280';
          }}
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default App;
