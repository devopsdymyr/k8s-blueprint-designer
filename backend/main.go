package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// GraphNode represents a Kubernetes resource node
type GraphNode struct {
	ID          string            `json:"id"`
	Type        string            `json:"type"`
	Namespace   string            `json:"namespace"`
	Name        string            `json:"name"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Icon        string            `json:"icon,omitempty"`
	SecretData  map[string]string `json:"secretData,omitempty"` // Decoded secret values
	Image       string            `json:"image,omitempty"`      // Container image for pods/deployments
}

// GraphEdge represents a relationship between resources
type GraphEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
	Type     string `json:"type,omitempty"`
}

// Progress tracks discovery progress
type Progress struct {
	CurrentNamespace   string `json:"currentNamespace"`
	TotalNamespaces    int    `json:"totalNamespaces"`
	CompletedNamespaces int   `json:"completedNamespaces"`
	CurrentResource    string `json:"currentResource"`
	NodesFound         int    `json:"nodesFound"`
	EdgesFound         int    `json:"edgesFound"`
}

// Graph represents the complete resource graph
type Graph struct {
	Nodes       []GraphNode `json:"nodes"`
	Edges       []GraphEdge `json:"edges"`
	GeneratedAt time.Time   `json:"generatedAt"`
	Progress    *Progress   `json:"progress,omitempty"` // Progress tracking
}

var (
	port         = flag.String("port", "8080", "Server port")
	namespace    = flag.String("namespace", "", "Filter by namespace (empty for all)")
	scanInterval = flag.Int("scan-interval", 30, "Discovery scan interval in seconds")
	allowCORS    = flag.Bool("cors", true, "Enable CORS")
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

var (
	currentGraph *Graph
	graphMutex   sync.RWMutex
	wsClients    = make(map[*websocket.Conn]bool)
	wsMutex      sync.Mutex
)

func main() {
	flag.Parse()

	// Initialize Kubernetes client
	clientset, err := getKubernetesClient()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	log.Println("✓ Successfully connected to Kubernetes cluster")

	// Create graph generator
	generator := NewGraphGenerator(clientset)

	// Initialize with empty graph so API is immediately available
	updateGraph(&Graph{Nodes: []GraphNode{}, Edges: []GraphEdge{}})

	// Don't generate initial graph - wait for user to select namespace
	// This prevents loading all namespaces on startup
	log.Println("Ready. Waiting for namespace selection...")

	// CORS middleware
	corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if *allowCORS {
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				if r.Method == "OPTIONS" {
					w.WriteHeader(http.StatusOK)
					return
				}
			}
			next(w, r)
		}
	}

	// HTTP handlers
	http.HandleFunc("/api/v1/graph", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		nsFilter := r.URL.Query().Get("namespace")
		if nsFilter != "" {
			graph, err := generator.GenerateGraph(nsFilter)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(graph)
			return
		}

		graphMutex.RLock()
		defer graphMutex.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(currentGraph)
	}))

	http.HandleFunc("/api/v1/namespaces", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		nsList, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		namespaces := make([]string, 0, len(nsList.Items))
		for _, ns := range nsList.Items {
			namespaces = append(namespaces, ns.Name)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"namespaces": namespaces})
	}))

	http.HandleFunc("/api/v1/health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy", "cluster": "connected"})
	}))

	// WebSocket handler
	http.HandleFunc("/ws/graph-updates", handleWebSocket)

	// Start periodic scanning
	go func() {
		ticker := time.NewTicker(time.Duration(*scanInterval) * time.Second)
		for range ticker.C {
			log.Println("Running periodic discovery scan...")
			graph, err := generator.GenerateGraph(*namespace)
			if err != nil {
				log.Printf("Discovery scan error: %v", err)
				continue
			}
			updateGraph(graph)
			broadcastGraphUpdate(graph)
			log.Printf("✓ Updated graph: %d nodes, %d edges", len(graph.Nodes), len(graph.Edges))
		}
	}()

	log.Printf("🚀 Starting Kubernetes Discovery Engine on port %s", *port)
	log.Printf("📊 API: http://localhost:%s/api/v1/graph", *port)
	log.Printf("🔌 WebSocket: ws://localhost:%s/ws/graph-updates", *port)
	log.Fatal(http.ListenAndServe(":"+*port, nil))
}

func updateGraph(graph *Graph) {
	graphMutex.Lock()
	defer graphMutex.Unlock()
	graph.GeneratedAt = time.Now()
	currentGraph = graph
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	wsMutex.Lock()
	wsClients[conn] = true
	wsMutex.Unlock()

	// Send initial graph
	graphMutex.RLock()
	if currentGraph != nil {
		conn.WriteJSON(currentGraph)
	}
	graphMutex.RUnlock()

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}

	wsMutex.Lock()
	delete(wsClients, conn)
	wsMutex.Unlock()
}

func broadcastGraphUpdate(graph *Graph) {
	wsMutex.Lock()
	defer wsMutex.Unlock()

	for conn := range wsClients {
		if err := conn.WriteJSON(graph); err != nil {
			log.Printf("WebSocket write error: %v", err)
			conn.Close()
			delete(wsClients, conn)
		}
	}
}

func getKubernetesClient() (*kubernetes.Clientset, error) {
	var config *rest.Config
	var err error

	// Try in-cluster config first
	config, err = rest.InClusterConfig()
	if err == nil {
		log.Println("Using in-cluster Kubernetes config")
	} else {
		// Fall back to kubeconfig
		var kubeconfig string
		if kubeconfigEnv := os.Getenv("KUBECONFIG"); kubeconfigEnv != "" {
			kubeconfig = kubeconfigEnv
			log.Printf("Using KUBECONFIG from environment: %s", kubeconfig)
		} else if home := homedir.HomeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
			log.Printf("Using default kubeconfig: %s", kubeconfig)
		}

		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, fmt.Errorf("failed to build kubeconfig: %v", err)
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %v", err)
	}

	// Test connection
	_, err = clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{Limit: 1})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to cluster: %v", err)
	}

	return clientset, nil
}

// GraphGenerator handles graph generation
type GraphGenerator struct {
	clientset *kubernetes.Clientset
}

func NewGraphGenerator(clientset *kubernetes.Clientset) *GraphGenerator {
	return &GraphGenerator{clientset: clientset}
}

func (g *GraphGenerator) GenerateGraph(namespaceFilter string) (*Graph, error) {
	// Increase timeout for large clusters
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	graph := &Graph{
		Nodes: []GraphNode{},
		Edges: []GraphEdge{},
	}

	// Get namespaces - require namespace filter to prevent loading all
	namespaces := []string{}
	if namespaceFilter != "" {
		namespaces = []string{namespaceFilter}
		log.Printf("Generating graph for namespace: %s", namespaceFilter)
	} else {
		// If no namespace specified, return empty graph with message
		log.Println("No namespace specified - returning empty graph")
		progress := &Progress{
			TotalNamespaces: 0,
			CompletedNamespaces: 0,
			CurrentResource: "Please select a namespace",
		}
		graph.Progress = progress
		return graph, nil
	}

	log.Printf("Discovering resources in %d namespace(s)...", len(namespaces))
	
	// Initialize progress tracking
	progress := &Progress{
		TotalNamespaces: len(namespaces),
		CompletedNamespaces: 0,
	}
	graph.Progress = progress

	// Track all nodes by ID to avoid duplicates
	nodeMap := make(map[string]GraphNode)
	edgeMap := make(map[string]GraphEdge)
	
	// Limits to prevent performance issues (can be increased if needed)
	const maxNodes = 10000
	const maxEdges = 20000

	// Discover resources
	for idx, ns := range namespaces {
		progress.CurrentNamespace = ns
		progress.CompletedNamespaces = idx
		progress.CurrentResource = "Starting discovery..."
		progress.NodesFound = len(nodeMap)
		progress.EdgesFound = len(edgeMap)
		
		// Update graph with progress (for WebSocket clients)
		graph.Progress = progress
		updateGraph(graph)

		// Deployments
		progress.CurrentResource = fmt.Sprintf("Discovering Deployments in %s...", ns)
		deployments, err := g.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, deploy := range deployments.Items {
				nodeID := fmt.Sprintf("deploy-%s-%s", ns, deploy.Name)
				
				// Extract container image
				image := ""
				if len(deploy.Spec.Template.Spec.Containers) > 0 {
					image = deploy.Spec.Template.Spec.Containers[0].Image
				}
				
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "Deployment",
					Namespace: ns,
					Name:      deploy.Name,
					Labels:    deploy.Labels,
					Icon:      "deployment",
					Image:     image,
				}
				
				// Link to secrets via envFrom and env
				for _, container := range deploy.Spec.Template.Spec.Containers {
					// Check envFrom for secretRef
					for _, envFrom := range container.EnvFrom {
						if envFrom.SecretRef != nil {
							secretID := fmt.Sprintf("secret-%s-%s", ns, envFrom.SecretRef.Name)
							edgeKey := fmt.Sprintf("%s-%s", nodeID, secretID)
							edgeMap[edgeKey] = GraphEdge{
								From:     nodeID,
								To:       secretID,
								Relation: "uses-secret",
								Type:     "secret",
							}
						}
					}
					// Check env for secretKeyRef
					for _, env := range container.Env {
						if env.ValueFrom != nil && env.ValueFrom.SecretKeyRef != nil {
							secretID := fmt.Sprintf("secret-%s-%s", ns, env.ValueFrom.SecretKeyRef.Name)
							edgeKey := fmt.Sprintf("%s-%s", nodeID, secretID)
							edgeMap[edgeKey] = GraphEdge{
								From:     nodeID,
								To:       secretID,
								Relation: "uses-secret",
								Type:     "secret",
							}
						}
					}
				}
				
				// Store PVC references for later linking (after PVCs are discovered)
				// We'll link them in a final pass
			}
		}

		// StatefulSets
		progress.CurrentResource = fmt.Sprintf("Discovering StatefulSets in %s...", ns)
		statefulsets, err := g.clientset.AppsV1().StatefulSets(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, sts := range statefulsets.Items {
				nodeID := fmt.Sprintf("sts-%s-%s", ns, sts.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "StatefulSet",
					Namespace: ns,
					Name:      sts.Name,
					Labels:    sts.Labels,
					Icon:      "statefulset",
				}

				// PVC links will be created in final pass after all PVCs are discovered
			}
		}

		// DaemonSets
		progress.CurrentResource = fmt.Sprintf("Discovering DaemonSets in %s...", ns)
		daemonsets, err := g.clientset.AppsV1().DaemonSets(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, ds := range daemonsets.Items {
				nodeID := fmt.Sprintf("ds-%s-%s", ns, ds.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "DaemonSet",
					Namespace: ns,
					Name:      ds.Name,
					Labels:    ds.Labels,
					Icon:      "daemonset",
				}
			}
		}

		// Services
		progress.CurrentResource = fmt.Sprintf("Discovering Services in %s...", ns)
		services, err := g.clientset.CoreV1().Services(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, svc := range services.Items {
				nodeID := fmt.Sprintf("svc-%s-%s", ns, svc.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "Service",
					Namespace: ns,
					Name:      svc.Name,
					Labels:    svc.Labels,
					Icon:      "service",
				}

				// Link deployments/statefulsets to services
				if len(svc.Spec.Selector) > 0 {
					// Check deployments
					deployments, _ := g.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{})
					for _, deploy := range deployments.Items {
						if matchesSelector(deploy.Spec.Selector.MatchLabels, svc.Spec.Selector) {
							deployID := fmt.Sprintf("deploy-%s-%s", ns, deploy.Name)
							edgeKey := fmt.Sprintf("%s-%s", deployID, nodeID)
							edgeMap[edgeKey] = GraphEdge{
								From:     deployID,
								To:       nodeID,
								Relation: "exposes",
								Type:     "service",
							}
						}
					}
					// Check statefulsets
					statefulsets, _ := g.clientset.AppsV1().StatefulSets(ns).List(ctx, metav1.ListOptions{})
					for _, sts := range statefulsets.Items {
						if matchesSelector(sts.Spec.Selector.MatchLabels, svc.Spec.Selector) {
							stsID := fmt.Sprintf("sts-%s-%s", ns, sts.Name)
							edgeKey := fmt.Sprintf("%s-%s", stsID, nodeID)
							edgeMap[edgeKey] = GraphEdge{
								From:     stsID,
								To:       nodeID,
								Relation: "exposes",
								Type:     "service",
							}
						}
					}
				}
			}
		}

		// ConfigMaps
		progress.CurrentResource = fmt.Sprintf("Discovering ConfigMaps in %s...", ns)
		configmaps, err := g.clientset.CoreV1().ConfigMaps(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, cm := range configmaps.Items {
				nodeID := fmt.Sprintf("cm-%s-%s", ns, cm.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "ConfigMap",
					Namespace: ns,
					Name:      cm.Name,
					Labels:    cm.Labels,
					Icon:      "configmap",
				}
			}
		}

		// Secrets - read and decode values
		progress.CurrentResource = fmt.Sprintf("Discovering Secrets in %s...", ns)
		secrets, err := g.clientset.CoreV1().Secrets(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, secret := range secrets.Items {
				// Skip default service account tokens
				if strings.HasPrefix(secret.Name, "default-token-") {
					continue
				}
				nodeID := fmt.Sprintf("secret-%s-%s", ns, secret.Name)
				
				// Decode secret data (Kubernetes secrets are already byte arrays)
				secretData := make(map[string]string)
				for key, value := range secret.Data {
					// Secret.Data is already []byte, just convert to string
					// For display, show first 100 chars or full value if short
					decodedValue := string(value)
					if len(decodedValue) > 100 {
						secretData[key] = decodedValue[:100] + "..."
					} else {
						secretData[key] = decodedValue
					}
				}
				
				nodeMap[nodeID] = GraphNode{
					ID:         nodeID,
					Type:       "Secret",
					Namespace:  ns,
					Name:       secret.Name,
					Labels:     secret.Labels,
					Icon:       "secret",
					SecretData: secretData,
				}
			}
		}

		// Ingress
		progress.CurrentResource = fmt.Sprintf("Discovering Ingress in %s...", ns)
		ingresses, err := g.clientset.NetworkingV1().Ingresses(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, ing := range ingresses.Items {
				nodeID := fmt.Sprintf("ing-%s-%s", ns, ing.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "Ingress",
					Namespace: ns,
					Name:      ing.Name,
					Labels:    ing.Labels,
					Icon:      "ingress",
				}

				// Link to services
				for _, rule := range ing.Spec.Rules {
					if rule.HTTP != nil {
						for _, path := range rule.HTTP.Paths {
							if path.Backend.Service != nil {
								svcID := fmt.Sprintf("svc-%s-%s", ns, path.Backend.Service.Name)
								edgeKey := fmt.Sprintf("%s-%s", svcID, nodeID)
								edgeMap[edgeKey] = GraphEdge{
									From:     svcID,
									To:       nodeID,
									Relation: "exposed-by",
									Type:     "ingress",
								}
							}
						}
					}
				}
			}
		}

		// PVCs
		progress.CurrentResource = fmt.Sprintf("Discovering PVCs in %s...", ns)
		pvcs, err := g.clientset.CoreV1().PersistentVolumeClaims(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			for _, pvc := range pvcs.Items {
				nodeID := fmt.Sprintf("pvc-%s-%s", ns, pvc.Name)
				nodeMap[nodeID] = GraphNode{
					ID:        nodeID,
					Type:      "PVC",
					Namespace: ns,
					Name:      pvc.Name,
					Labels:    pvc.Labels,
					Icon:      "pvc",
				}
			}
		}

		// Pods - link to deployments and services
		progress.CurrentResource = fmt.Sprintf("Discovering Pods in %s...", ns)
		pods, err := g.clientset.CoreV1().Pods(ns).List(ctx, metav1.ListOptions{})
		if err == nil {
			// First pass: collect all pods and their owner info
			podOwnerMap := make(map[string]string) // podID -> ownerID
			
			for _, pod := range pods.Items {
				podID := fmt.Sprintf("pod-%s-%s", ns, pod.Name)
				
				// Extract container image
				image := ""
				if len(pod.Spec.Containers) > 0 {
					image = pod.Spec.Containers[0].Image
				}
				
				// Link pods to their owner (Deployment/StatefulSet/DaemonSet)
				if pod.OwnerReferences != nil && len(pod.OwnerReferences) > 0 {
					for _, owner := range pod.OwnerReferences {
						var ownerID string
						switch owner.Kind {
						case "ReplicaSet":
							// Find the Deployment that owns this ReplicaSet
							replicasets, _ := g.clientset.AppsV1().ReplicaSets(ns).List(ctx, metav1.ListOptions{})
							for _, rs := range replicasets.Items {
								if rs.Name == owner.Name {
									if rs.OwnerReferences != nil && len(rs.OwnerReferences) > 0 {
										for _, rsOwner := range rs.OwnerReferences {
											if rsOwner.Kind == "Deployment" {
												ownerID = fmt.Sprintf("deploy-%s-%s", ns, rsOwner.Name)
												podOwnerMap[podID] = ownerID
												break
											}
										}
									}
									break
								}
							}
						case "StatefulSet":
							ownerID = fmt.Sprintf("sts-%s-%s", ns, owner.Name)
							podOwnerMap[podID] = ownerID
						case "DaemonSet":
							ownerID = fmt.Sprintf("ds-%s-%s", ns, owner.Name)
							podOwnerMap[podID] = ownerID
						}
					}
				}
				
				// Add pod node
				nodeMap[podID] = GraphNode{
					ID:        podID,
					Type:      "Pod",
					Namespace: ns,
					Name:      pod.Name,
					Labels:    pod.Labels,
					Icon:      "pod",
					Image:     image,
				}
			}
			
			// Second pass: create edges from owners to pods
			for podID, ownerID := range podOwnerMap {
				if _, exists := nodeMap[ownerID]; exists {
					edgeKey := fmt.Sprintf("%s-%s", ownerID, podID)
					edgeMap[edgeKey] = GraphEdge{
						From:     ownerID,
						To:       podID,
						Relation: "manages",
						Type:     "pod",
					}
				}
			}
		}
	}
	
	// Final pass: Link services to pods and deployments to PVCs (after all resources are in nodeMap)
	// This ensures all connections are created correctly
	for _, ns := range namespaces {
		// Link services to pods
		services, _ := g.clientset.CoreV1().Services(ns).List(ctx, metav1.ListOptions{})
		pods, _ := g.clientset.CoreV1().Pods(ns).List(ctx, metav1.ListOptions{})
		
		for _, svc := range services.Items {
			if len(svc.Spec.Selector) > 0 {
				svcID := fmt.Sprintf("svc-%s-%s", ns, svc.Name)
				if _, svcExists := nodeMap[svcID]; svcExists {
					for _, pod := range pods.Items {
						// Use proper service selector matching
						if matchesServiceSelector(pod.Labels, svc.Spec.Selector) {
							podID := fmt.Sprintf("pod-%s-%s", ns, pod.Name)
							if _, podExists := nodeMap[podID]; podExists {
								edgeKey := fmt.Sprintf("%s-%s", svcID, podID)
								edgeMap[edgeKey] = GraphEdge{
									From:     svcID,
									To:       podID,
									Relation: "routes-to",
									Type:     "pod",
								}
							}
						}
					}
				}
			}
		}
		
		// Link deployments to PVCs (after PVCs are discovered)
		deployments, _ := g.clientset.AppsV1().Deployments(ns).List(ctx, metav1.ListOptions{})
		for _, deploy := range deployments.Items {
			deployID := fmt.Sprintf("deploy-%s-%s", ns, deploy.Name)
			if _, deployExists := nodeMap[deployID]; deployExists {
				// Link to PVCs via volume mounts
				for _, volume := range deploy.Spec.Template.Spec.Volumes {
					if volume.PersistentVolumeClaim != nil {
						pvcID := fmt.Sprintf("pvc-%s-%s", ns, volume.PersistentVolumeClaim.ClaimName)
						// Only create edge if PVC exists in nodeMap
						if _, pvcExists := nodeMap[pvcID]; pvcExists {
							edgeKey := fmt.Sprintf("%s-%s", deployID, pvcID)
							edgeMap[edgeKey] = GraphEdge{
								From:     deployID,
								To:       pvcID,
								Relation: "uses",
								Type:     "pvc",
							}
						}
					}
				}
			}
		}
		
		// Link statefulsets to PVCs (after PVCs are discovered)
		statefulsets, _ := g.clientset.AppsV1().StatefulSets(ns).List(ctx, metav1.ListOptions{})
		for _, sts := range statefulsets.Items {
			stsID := fmt.Sprintf("sts-%s-%s", ns, sts.Name)
			if _, stsExists := nodeMap[stsID]; stsExists {
				// Link to PVCs via volume claim templates
				for _, claim := range sts.Spec.VolumeClaimTemplates {
					// StatefulSet PVCs have format: <claim-name>-<pod-name>
					// We need to check for actual PVCs that match this pattern
					pvcs, _ := g.clientset.CoreV1().PersistentVolumeClaims(ns).List(ctx, metav1.ListOptions{})
					for _, pvc := range pvcs.Items {
						// Check if PVC name starts with the claim template name
						if strings.HasPrefix(pvc.Name, claim.Name+"-") {
							pvcID := fmt.Sprintf("pvc-%s-%s", ns, pvc.Name)
							if _, pvcExists := nodeMap[pvcID]; pvcExists {
								edgeKey := fmt.Sprintf("%s-%s", stsID, pvcID)
								edgeMap[edgeKey] = GraphEdge{
									From:     stsID,
									To:       pvcID,
									Relation: "uses",
									Type:     "pvc",
								}
							}
						}
					}
				}
			}
		}
	}

	// Convert maps to slices with limits
	nodeCount := len(nodeMap)
	edgeCount := len(edgeMap)
	
	graph.Nodes = make([]GraphNode, 0, len(nodeMap))
	count := 0
	for _, node := range nodeMap {
		if count >= maxNodes {
			log.Printf("⚠️  Node limit reached (%d), truncating results", maxNodes)
			break
		}
		graph.Nodes = append(graph.Nodes, node)
		count++
	}

	graph.Edges = make([]GraphEdge, 0, len(edgeMap))
	count = 0
	for _, edge := range edgeMap {
		if count >= maxEdges {
			log.Printf("⚠️  Edge limit reached (%d), truncating results", maxEdges)
			break
		}
		graph.Edges = append(graph.Edges, edge)
		count++
	}
	
	if nodeCount > maxNodes || edgeCount > maxEdges {
		log.Printf("⚠️  Graph truncated: %d nodes (limit: %d), %d edges (limit: %d)", 
			nodeCount, maxNodes, edgeCount, maxEdges)
	}

	// Update final progress
	progress.CompletedNamespaces = len(namespaces)
	progress.NodesFound = len(graph.Nodes)
	progress.EdgesFound = len(graph.Edges)
	progress.CurrentResource = "Complete"
	graph.Progress = progress

	return graph, nil
}

func matchesSelector(selector1, selector2 map[string]string) bool {
	if len(selector1) == 0 || len(selector2) == 0 {
		return false
	}
	// Check if all keys in selector1 exist in selector2 with matching values
	for k, v := range selector1 {
		if selector2[k] != v {
			return false
		}
	}
	return true
}

// matchesServiceSelector checks if pod labels match service selector
func matchesServiceSelector(podLabels, serviceSelector map[string]string) bool {
	if len(serviceSelector) == 0 {
		return false
	}
	// Service selector must match ALL key-value pairs in pod labels
	for k, v := range serviceSelector {
		if podLabels[k] != v {
			return false
		}
	}
	return true
}
