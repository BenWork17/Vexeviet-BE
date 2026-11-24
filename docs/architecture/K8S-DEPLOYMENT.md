# Kubernetes Deployment Guide

## Prerequisites

### Local Development (kind)

1. **Docker Desktop** - Running
2. **kind** - Kubernetes in Docker
   ```bash
   # macOS
   brew install kind
   
   # Windows
   choco install kind
   ```

3. **kubectl** - Kubernetes CLI
   ```bash
   # macOS
   brew install kubectl
   
   # Windows
   choco install kubernetes-cli
   ```

4. **Helm** (Optional)
   ```bash
   # macOS
   brew install helm
   
   # Windows
   choco install kubernetes-helm
   ```

### Cloud Deployment

Choose your provider:
- **AWS EKS** - Elastic Kubernetes Service
- **Google GKE** - Google Kubernetes Engine
- **Azure AKS** - Azure Kubernetes Service

## Quick Start (Local)

### 1. Create Kubernetes Cluster

```bash
# Linux/macOS
chmod +x scripts/k8s-setup.sh
./scripts/k8s-setup.sh

# Windows
scripts\k8s-setup.bat
```

### 2. Configure Secrets

Update `k8s/secrets-example.yaml` with real values:

```yaml
stringData:
  url: "mysql://user:password@mysql-service:3306/vexeviet"
  # ... other secrets
```

Apply secrets:
```bash
kubectl apply -f k8s/secrets-example.yaml
```

### 3. Build Docker Images

```bash
chmod +x scripts/build-images.sh
./scripts/build-images.sh
```

Or manually:
```bash
docker build -t vexeviet/user-service:latest -f services/user-service/Dockerfile .
```

### 4. Deploy Services

#### Option A: Using kubectl
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### Option B: Using Helm
```bash
cd services/user-service
helm install user-service ./helm \
  --namespace vexeviet \
  --create-namespace \
  --set image.tag=latest
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n vexeviet

# Check services
kubectl get services -n vexeviet

# View logs
kubectl logs -f deployment/user-service -n vexeviet

# Port forward for local testing
kubectl port-forward service/user-service 3001:3001 -n vexeviet
```

## Load kind Images (Local Development)

When building images locally for kind:

```bash
# Build image
docker build -t vexeviet/user-service:latest -f services/user-service/Dockerfile .

# Load into kind cluster
kind load docker-image vexeviet/user-service:latest --name vexeviet

# Deploy
kubectl apply -f services/user-service/k8s/
```

## Production Deployment

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name vexeviet-prod \
  --region ap-southeast-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5

# Configure kubectl
aws eks update-kubeconfig --region ap-southeast-1 --name vexeviet-prod

# Deploy
./scripts/deploy.sh
```

### Google GKE

```bash
# Create GKE cluster
gcloud container clusters create vexeviet-prod \
  --zone asia-southeast1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 5

# Get credentials
gcloud container clusters get-credentials vexeviet-prod --zone asia-southeast1-a

# Deploy
./scripts/deploy.sh
```

## Monitoring & Troubleshooting

### View Logs

```bash
# All pods in namespace
kubectl logs -f -l app=user-service -n vexeviet

# Specific pod
kubectl logs -f <pod-name> -n vexeviet

# Previous crashed container
kubectl logs <pod-name> -n vexeviet --previous
```

### Debug Pod

```bash
# Describe pod
kubectl describe pod <pod-name> -n vexeviet

# Get pod YAML
kubectl get pod <pod-name> -n vexeviet -o yaml

# Execute command in pod
kubectl exec -it <pod-name> -n vexeviet -- /bin/sh
```

### Check Events

```bash
kubectl get events -n vexeviet --sort-by='.lastTimestamp'
```

### Scale Deployment

```bash
# Manual scaling
kubectl scale deployment user-service --replicas=5 -n vexeviet

# Check HPA status
kubectl get hpa -n vexeviet
```

## Helm Commands

### Install

```bash
helm install user-service ./services/user-service/helm \
  --namespace vexeviet \
  --create-namespace \
  --set image.tag=1.0.0 \
  --set replicaCount=3
```

### Upgrade

```bash
helm upgrade user-service ./services/user-service/helm \
  --namespace vexeviet \
  --set image.tag=1.0.1
```

### Rollback

```bash
# List releases
helm list -n vexeviet

# Show history
helm history user-service -n vexeviet

# Rollback to previous version
helm rollback user-service -n vexeviet

# Rollback to specific revision
helm rollback user-service 2 -n vexeviet
```

### Uninstall

```bash
helm uninstall user-service -n vexeviet
```

## Cleanup

### Delete All Resources

```bash
# Delete namespace (removes all resources)
kubectl delete namespace vexeviet
```

### Delete kind Cluster

```bash
kind delete cluster --name vexeviet
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/user-service:${{ github.sha }} \
            -f services/user-service/Dockerfile .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/user-service:${{ github.sha }}
      
      - name: Deploy to k8s
        run: |
          kubectl set image deployment/user-service \
            user-service=${{ secrets.DOCKER_REGISTRY }}/user-service:${{ github.sha }} \
            -n vexeviet
```

## Best Practices

1. **Never commit secrets** - Use external secret management (Vault, AWS Secrets Manager)
2. **Use resource limits** - Prevent resource starvation
3. **Enable autoscaling** - HPA for dynamic scaling
4. **Health checks** - Liveness and readiness probes
5. **Rolling updates** - Zero-downtime deployments
6. **Monitoring** - Prometheus + Grafana
7. **Logging** - Centralized logging (ELK stack)

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kind Documentation](https://kind.sigs.k8s.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
