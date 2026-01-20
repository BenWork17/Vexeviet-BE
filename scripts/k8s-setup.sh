#!/bin/bash

# VeXeViet Kubernetes Setup Script
# Creates a local Kubernetes cluster using kind (Kubernetes in Docker)

set -e

echo "🚀 VeXeViet Kubernetes Setup"
echo "============================"

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo "❌ kind is not installed. Please install it first:"
    echo "   brew install kind (macOS)"
    echo "   https://kind.sigs.k8s.io/docs/user/quick-start/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first:"
    echo "   brew install kubectl (macOS)"
    echo "   https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Delete existing cluster if it exists
if kind get clusters | grep -q "vexeviet"; then
    echo "🗑️  Deleting existing cluster..."
    kind delete cluster --name vexeviet
fi

# Create new cluster
echo "📦 Creating Kubernetes cluster..."
kind create cluster --name vexeviet --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF

# Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Create namespace
echo "📁 Creating namespace..."
kubectl apply -f ./k8s/namespace.yaml

# Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
echo "⏳ Waiting for ingress controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo ""
echo "✅ Kubernetes cluster is ready!"
echo ""
echo "📊 Cluster Info:"
kubectl cluster-info
echo ""
echo "📝 Next steps:"
echo "1. Update secrets in k8s/secrets-example.yaml"
echo "2. Apply secrets: kubectl apply -f k8s/secrets-example.yaml"
echo "3. Deploy services: cd services/user-service && kubectl apply -f k8s/"
echo ""
echo "🔍 Useful commands:"
echo "  kubectl get pods -n vexeviet          # Check pods"
echo "  kubectl logs -f <pod-name> -n vexeviet  # View logs"
echo "  kubectl get services -n vexeviet      # Check services"
echo "  kind delete cluster --name vexeviet   # Delete cluster"
