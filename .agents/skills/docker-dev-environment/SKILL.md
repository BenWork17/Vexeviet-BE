---
name: docker-dev-environment
description: Manages Docker containers for development environment including MySQL, Redis, and other services. Use when setting up local development, managing database containers, or configuring docker-compose.
---

# Docker Development Environment

Manages Docker containers for local development with MySQL, Redis, and other services.

## Capabilities

- Create docker-compose.yml configurations
- Manage MySQL and Redis containers
- Set up development databases
- Configure container networking
- Manage environment variables

## Workflow

1. Create `docker-compose.yml` configuration
2. Start services: `docker-compose up -d`
3. Check status: `docker-compose ps`
4. Stop services: `docker-compose down`

## Common Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Execute command in container
docker-compose exec [service-name] [command]

# Remove volumes (careful!)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

## Example docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: vexeviet-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - vexeviet-network

  redis:
    image: redis:7-alpine
    container_name: vexeviet-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - vexeviet-network

volumes:
  mysql_data:
  redis_data:

networks:
  vexeviet-network:
    driver: bridge
```

## Environment Variables (.env)

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=vexeviet
MYSQL_USER=vexeviet_user
MYSQL_PASSWORD=securepassword
```

## MySQL Container Commands

```bash
# Access MySQL shell
docker-compose exec mysql mysql -u root -p

# Create database backup
docker-compose exec mysql mysqldump -u root -p dbname > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p dbname < backup.sql
```

## Redis Container Commands

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis
docker-compose exec redis redis-cli MONITOR

# Get Redis info
docker-compose exec redis redis-cli INFO
```

## Best Practices

- Use named volumes for data persistence
- Set restart policies for production-like behavior
- Use environment variables for sensitive data
- Create separate networks for service isolation
- Add healthchecks for critical services
- Document port mappings
