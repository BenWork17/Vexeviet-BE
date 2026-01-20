#!/bin/bash

echo "========================================"
echo " VeXeViet Backend - Development Mode"
echo "========================================"
echo ""
echo "Starting Docker services..."
pnpm docker:up
echo ""
echo "Waiting 5 seconds for Docker to initialize..."
sleep 5
echo ""
echo "Starting all microservices..."
echo ""
pnpm dev:services
