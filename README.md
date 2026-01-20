# VeXeViet Backend Monorepo

Monorepo backend cho hệ thống VeXeViet theo chuẩn SAFe Architecture.

## Cấu trúc

```
vexeviet-BE/
├── packages/          # Shared libraries & utilities
│   ├── common/        # Common utilities, types, constants
│   ├── database/      # Prisma schema & database client
│   └── config/        # Shared configuration
├── services/          # Business domain services
│   ├── user-service/  # User management service
│   └── route-service/ # Route management service
├── apps/              # Applications & API gateways
│   └── api-gateway/   # Main API gateway
└── docs/              # Documentation

## Công nghệ

- **Build System**: Turbo (Turborepo)
- **Package Manager**: pnpm
- **Runtime**: Node.js >= 18
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma
- **Database**: MySQL 8.0
- **Cache**: Redis 7

## Bắt đầu

### Cài đặt

```bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development

```bash
# Start Docker containers
pnpm docker:up

# Run all services in dev mode
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Database

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Access MySQL
docker-compose exec mysql mysql -u vexeviet_user -p
```

### Build

```bash
# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

## Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages and services
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm type-check` - Type check all TypeScript code
- `pnpm docker:up` - Start Docker containers
- `pnpm docker:down` - Stop Docker containers

## Architecture

Monorepo này tuân theo các nguyên tắc SAFe:

1. **Modularity**: Mỗi service/package độc lập
2. **Shared Libraries**: Code dùng chung trong packages/
3. **Type Safety**: TypeScript strict mode
4. **Testing**: Unit & integration tests
5. **CI/CD Ready**: Build pipeline với Turbo

## Environment Variables

Copy `.env.example` to `.env` và cập nhật các giá trị:

```bash
cp .env.example .env
```
