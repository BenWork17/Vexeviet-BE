#!/bin/bash

# Build and push Docker images for all services

set -e

REGISTRY=${DOCKER_REGISTRY:-"vexeviet"}
VERSION=${VERSION:-"latest"}

echo "🐳 Building Docker images..."
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo ""

# Build User Service
echo "📦 Building user-service..."
docker build -t ${REGISTRY}/user-service:${VERSION} -f services/user-service/Dockerfile .
echo "✅ user-service built"

# Build Route Service (when ready)
# echo "📦 Building route-service..."
# docker build -t ${REGISTRY}/route-service:${VERSION} -f services/route-service/Dockerfile .
# echo "✅ route-service built"

echo ""
echo "✅ All images built successfully!"
echo ""

# Ask if user wants to push to registry
read -p "Push images to registry? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing images..."
    docker push ${REGISTRY}/user-service:${VERSION}
    # docker push ${REGISTRY}/route-service:${VERSION}
    echo "✅ Images pushed!"
else
    echo "⏭️  Skipping push"
fi

echo ""
echo "📋 Built images:"
docker images | grep ${REGISTRY}
