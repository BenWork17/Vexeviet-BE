#!/bin/bash

# Database Migration Script
set -e

echo "🗄️  VeXeViet Database Migration"
echo "=============================="

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start MySQL and Redis if not running
echo "📦 Starting database services..."
docker-compose up -d mysql redis

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
timeout=60
counter=0
until docker-compose exec -T mysql mysqladmin ping -h localhost --silent; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "❌ MySQL failed to start within ${timeout} seconds"
        exit 1
    fi
done

echo "✅ MySQL is ready!"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
cd packages/database
pnpm prisma:generate

# Run migrations
echo "🚀 Running database migrations..."
pnpm prisma migrate dev --name init

echo ""
echo "✅ Database migration complete!"
echo ""
echo "📊 Database Info:"
echo "  Host: localhost:3306"
echo "  Database: vexeviet"
echo "  User: vexeviet_user"
echo ""
echo "🔍 Useful commands:"
echo "  pnpm prisma:studio          # Open Prisma Studio"
echo "  pnpm prisma migrate create  # Create new migration"
echo "  pnpm prisma migrate deploy  # Deploy migrations (production)"
