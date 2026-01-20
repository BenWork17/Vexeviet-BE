# Database Setup & Migration Guide

## Quick Start

### 1. Start Database Services

```bash
pnpm docker:up
```

This starts MySQL and Redis containers.

### 2. Run Migrations

```bash
# Linux/macOS
chmod +x scripts/migrate.sh
./scripts/migrate.sh

# Windows
scripts\migrate.bat
```

## Manual Setup

### 1. Start Docker Containers

```bash
docker-compose up -d
```

### 2. Verify MySQL is Running

```bash
docker-compose exec mysql mysql -u root -p
# Password: rootpassword
```

### 3. Generate Prisma Client

```bash
cd packages/database
pnpm prisma:generate
```

### 4. Create Initial Migration

```bash
cd packages/database
pnpm prisma migrate dev --name init
```

## Database Schema

### User Table

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  role ENUM('ADMIN', 'OPERATOR', 'CUSTOMER') DEFAULT 'CUSTOMER',
  isEmailVerified BOOLEAN DEFAULT FALSE,
  isPhoneVerified BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP
);
```

### RefreshToken Table

```sql
CREATE TABLE refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(500) UNIQUE NOT NULL,
  userId VARCHAR(36) NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
);
```

## Prisma Commands

### Development

```bash
# Generate Prisma Client
pnpm prisma:generate

# Create migration
cd packages/database
pnpm prisma migrate dev --name <migration_name>

# Reset database (WARNING: deletes all data!)
pnpm prisma migrate reset

# Open Prisma Studio (GUI)
pnpm prisma:studio
```

### Production

```bash
# Deploy migrations
pnpm prisma migrate deploy

# Validate schema
pnpm prisma validate

# Format schema
pnpm prisma format
```

## Connection String Format

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Example:
```env
DATABASE_URL="mysql://vexeviet_user:securepassword@localhost:3306/vexeviet"
```

## Troubleshooting

### MySQL Connection Issues

```bash
# Check if MySQL is running
docker-compose ps

# View MySQL logs
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql
```

### Migration Errors

```bash
# Check migration status
cd packages/database
pnpm prisma migrate status

# Force reset (WARNING: deletes all data!)
pnpm prisma migrate reset --force

# Resolve migration conflicts
pnpm prisma migrate resolve --applied <migration_name>
```

### Prisma Client Errors

```bash
# Regenerate Prisma Client
pnpm prisma:generate

# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
pnpm prisma:generate
```

## Database Backup

### Export Database

```bash
docker-compose exec mysql mysqldump -u root -p vexeviet > backup.sql
```

### Import Database

```bash
docker-compose exec -T mysql mysql -u root -p vexeviet < backup.sql
```

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="mysql://vexeviet_user:securepassword@localhost:3306/vexeviet"
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=vexeviet
MYSQL_USER=vexeviet_user
MYSQL_PASSWORD=securepassword
```

## Production Considerations

1. **Connection Pooling**: Prisma handles this automatically
2. **SSL/TLS**: Add `?sslmode=require` to DATABASE_URL
3. **Read Replicas**: Configure in Prisma schema
4. **Migration Strategy**: Use `prisma migrate deploy` in CI/CD
5. **Monitoring**: Track slow queries and connection pool usage

## Next Steps

After migrations complete:
1. Start user service: `cd services/user-service && pnpm dev`
2. Test registration: `POST /api/v1/auth/register`
3. View data: `pnpm prisma:studio`
