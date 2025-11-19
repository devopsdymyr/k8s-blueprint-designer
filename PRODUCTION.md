# 🚀 Production Deployment Guide

## Prerequisites

- Kubernetes cluster access
- kubectl configured
- Docker (for container builds)
- Go 1.21+ (for local builds)
- Node.js 18+ (for frontend builds)

## Quick Deploy to Kubernetes

```bash
# 1. Build the Docker image
docker build -t k8s-blueprint-designer:latest .

# 2. Tag and push to your registry (optional)
docker tag k8s-blueprint-designer:latest your-registry/k8s-blueprint-designer:latest
docker push your-registry/k8s-blueprint-designer:latest

# 3. Update k8s/deployment.yaml with your image if needed

# 4. Deploy to cluster
kubectl apply -f k8s/deployment.yaml

# 5. Get service URL
kubectl get svc k8s-blueprint-designer

# 6. Access via LoadBalancer or port-forward
kubectl port-forward svc/k8s-blueprint-designer 8080:8080 3000:80
```

## Configuration

### Environment Variables

- `KUBECONFIG`: Path to kubeconfig (for out-of-cluster)
- `PORT`: Backend port (default: 8080)
- `REACT_APP_API_URL`: Frontend API URL

### Backend Flags

```bash
./k8s-discovery-engine \
  -port=8080 \
  -namespace="" \
  -scan-interval=30 \
  -cors=true
```

## Security Considerations

1. **RBAC**: The deployment includes minimal read-only permissions
2. **Network**: Use NetworkPolicies to restrict access
3. **TLS**: Add Ingress with TLS termination
4. **Authentication**: Add authentication layer (OAuth, OIDC, etc.)
5. **Resource Limits**: Adjust in deployment.yaml based on cluster size

## Scaling

For large clusters:

1. Increase scan interval: `-scan-interval=60`
2. Use namespace filtering: `-namespace=production`
3. Increase resource limits in deployment.yaml
4. Consider horizontal scaling (multiple instances with different namespaces)

## Monitoring

Add monitoring:

```yaml
# Add to deployment.yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 8080
readinessProbe:
  httpGet:
    path: /api/v1/health
    port: 8080
```

## Troubleshooting

### Pod not starting
- Check logs: `kubectl logs -f deployment/k8s-blueprint-designer`
- Verify RBAC: `kubectl auth can-i get pods --as=system:serviceaccount:default:k8s-discovery-engine`

### Can't connect to cluster
- Verify service account exists
- Check ClusterRoleBinding
- Test with: `kubectl get namespaces`

### High memory usage
- Reduce scan interval
- Filter by namespace
- Increase memory limits

## Performance Tuning

For clusters with 1000+ resources:

1. **Increase timeout**: Modify context timeout in `main.go`
2. **Batch requests**: Process namespaces in batches
3. **Cache results**: Implement caching layer
4. **Filter resources**: Skip system namespaces

## Backup and Recovery

The application is stateless. For recovery:

1. Redeploy using `kubectl apply -f k8s/deployment.yaml`
2. Graph regenerates automatically on startup
3. No persistent data to backup

