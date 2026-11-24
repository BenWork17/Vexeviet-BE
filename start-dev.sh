#!/usr/bin/env bash
set -euo pipefail

echo "[VeXeViet BE] Starting local infrastructure (MySQL + Redis)..."
pnpm docker:up

echo "[VeXeViet BE] Building shared workspace packages..."
pnpm dev:packages

echo "[VeXeViet BE] Starting API Gateway (:3000) and Microservices (:3001..3004)..."
pnpm dev:services
