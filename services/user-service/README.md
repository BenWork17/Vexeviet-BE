# User Service

User authentication and profile management microservice for VeXeViet platform.

## 🚀 Features

- ✅ User registration with email validation
- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Profile management (get, update, delete)
- ✅ Role-based access control (CUSTOMER, OPERATOR, ADMIN)
- ✅ Password hashing with bcrypt
- ✅ Request validation with Zod
- ✅ Error handling middleware
- ✅ Docker & Kubernetes ready

## 📂 Project Structure

```
src/
├── controllers/       # Request handlers
│   ├── auth.controller.ts
│   └── user.controller.ts
├── services/          # Business logic
│   ├── auth.service.ts
│   └── user.service.ts
├── routes/            # API routes
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   └── index.ts
├── middlewares/       # Express middlewares
│   ├── auth.middleware.ts
│   ├── validate.middleware.ts
│   └── error.middleware.ts
├── validators/        # Request validation schemas
│   └── auth.validator.ts
├── types/             # TypeScript types
│   └── index.ts
└── index.ts           # Entry point
```

## 🔌 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### User Profile

- `GET /api/v1/users/profile` - Get user profile (requires auth)
- `PATCH /api/v1/users/profile` - Update profile (requires auth)
- `DELETE /api/v1/users/profile` - Delete account (requires auth)

### Health Check

- `GET /health` - Service health status

## 🛠️ Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8.12.0

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

The service will run on `http://localhost:3001`

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
```

## 🐳 Docker

### Build Image

```bash
docker build -t vexeviet/user-service:latest .
```

### Run Container

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e JWT_SECRET="your-secret-key" \
  vexeviet/user-service:latest
```

## ☸️ Kubernetes Deployment

### Using kubectl

```bash
# Create namespace
kubectl apply -f ../../k8s/namespace.yaml

# Apply secrets (update with real values first!)
kubectl apply -f ../../k8s/secrets-example.yaml

# Deploy service
kubectl apply -f k8s/
```

### Using Helm

```bash
# Install
helm install user-service ./helm \
  --namespace vexeviet \
  --create-namespace \
  --set secrets.database.url="mysql://..." \
  --set secrets.jwt.secret="..." \
  --set image.tag="1.0.0"

# Upgrade
helm upgrade user-service ./helm --namespace vexeviet

# Uninstall
helm uninstall user-service --namespace vexeviet
```

## 🔐 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3001` | No |
| `DATABASE_URL` | MySQL connection string | - | Yes (future) |
| `REDIS_URL` | Redis connection string | - | Yes (future) |
| `JWT_SECRET` | JWT signing secret | `dev-secret-key` | Yes |
| `LOG_LEVEL` | Log level | `info` | No |

## 📝 Example Requests

### Register

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+84901234567"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Get Profile

```bash
curl -X GET http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer <access_token>"
```

## 🧪 Testing

```bash
pnpm test
```

## 📊 Monitoring

- Health check: `GET /health`
- Kubernetes liveness probe: `/health` (every 10s)
- Kubernetes readiness probe: `/health` (every 5s)

## 🚦 Status

**Iteration 1-1 (PI 1)** - ✅ Skeleton Complete

Next steps (Iteration 1-2):
- Database integration (Prisma)
- Redis integration
- Email verification
- Unit tests

## 📄 License

Proprietary - VeXeViet Platform
