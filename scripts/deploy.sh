#!/bin/bash

# Deploy all services to Kubernetes

set -e

NAMESPACE="vexeviet"

echo "🚀 Deploying VeXeViet services to Kubernetes"
echo "============================================"
echo ""

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "📁 Creating namespace: $NAMESPACE"
    kubectl apply -f k8s/namespace.yaml
fi

# Apply secrets if not exists
if ! kubectl get secret database-secret -n $NAMESPACE &> /dev/null; then
    echo "⚠️  WARNING: Secrets not found!"
    echo "Please update k8s/secrets-example.yaml and apply it:"
    echo "  kubectl apply -f k8s/secrets-example.yaml"
    exit 1
fi

# Deploy User Service
echo "📦 Deploying user-service..."
kubectl apply -f services/user-service/k8s/

# Wait for deployment
echo "⏳ Waiting for user-service to be ready..."
kubectl rollout status deployment/user-service -n $NAMESPACE --timeout=300s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service status:"
kubectl get pods,services -n $NAMESPACE
echo ""
echo "🔍 Check logs:"
echo "  kubectl logs -f deployment/user-service -n $NAMESPACE"
