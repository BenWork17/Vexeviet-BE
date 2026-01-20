# AGENTS.md - VeXeViet Platform Project

> **Last Updated:** 2026-01-19  
> **Project Status:** PI 1 - Iteration 1-2 Complete  
> **Current Phase:** Core Services MVP - Auth & Database Integration Complete

---

## 🐳 Docker Development Setup

### Quick Start

```bash
# git remote add
git remote add origin https://github.com/BenWork17/VeXeViet.git

# Start all services
make dev-up
# or: docker-compose -f docker-compose.dev.yml up -d

# Open VSCode with Dev Container
code .
# VSCode will prompt: "Reopen in Container" → Click Yes

# Run database migrations
make db-migrate
# or: cd services/user-service && npx prisma migrate dev

# Seed sample data
make db-seed

# View logs
make logs
# or: docker-compose logs -f

# Stop all services
make dev-down
# or: docker-compose down
```

### Services & Ports

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| MySQL | 3306 | `mysql://root:root@localhost:3306/vexeviet` | root/root |
| Redis | 6379 | `redis://localhost:6379` | - |
| Elasticsearch | 9200 | `http://localhost:9200` | - |
| Kafka | 9092 | `localhost:9092` | - |
| MinIO | 9000 | `http://localhost:9000` | minioadmin/minioadmin |
| Mailhog | 8025 | `http://localhost:8025` | - |
| Adminer | 8080 | `http://localhost:8080` | - |
| Kafka UI | 8082 | `http://localhost:8082` | - |
| Redis UI | 8083 | `http://localhost:8083` | - |
| API Gateway | 8000 | `http://localhost:8000` | - |
| Web App | 3000 | `http://localhost:3000` | - |

### Dev Container Features

```json
// .devcontainer/devcontainer.json highlights
{
  "name": "VeXeViet Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "devcontainer",
  "workspaceFolder": "/workspace",
  
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/go:1": { "version": "1.21" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.11" },
    "ghcr.io/devcontainers/features/docker-in-docker:1": {}
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "Prisma.prisma",
        "ms-azuretools.vscode-docker",
        "GitHub.copilot"
      ]
    }
  },
  
  "postCreateCommand": "npm install && make setup"
}
```

### Makefile Commands

```makefile
# Development
make dev-up           # Start all services
make dev-down         # Stop all services
make dev-restart      # Restart all services
make logs             # View all logs
make logs-service     # View specific service logs

# Database
make db-migrate       # Run Prisma migrations
make db-seed          # Seed sample data
make db-reset         # Reset database (drop + migrate + seed)
make db-studio        # Open Prisma Studio (DB GUI)

# Testing
make test             # Run all tests
make test-unit        # Run unit tests only
make test-e2e         # Run E2E tests

# Cleanup
make clean            # Remove all containers & volumes
make prune            # Docker system prune
```

### Environment Variables

```bash
# .env.development (committed - no secrets)
NODE_ENV=development
API_URL=http://localhost:8000

# Database
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=vexeviet
MYSQL_USER=root
MYSQL_PASSWORD=root

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Elasticsearch
ELASTIC_HOST=elasticsearch
ELASTIC_PORT=9200

# Kafka
KAFKA_BROKER=kafka:9092

# MinIO (S3-compatible)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Email (Mailhog)
SMTP_HOST=mailhog
SMTP_PORT=1025

# .env.local (gitignored - for secrets)
JWT_SECRET=your-secret-here
OPENAI_API_KEY=sk-...
```

### Docker Compose Architecture

```yaml
# docker-compose.dev.yml (simplified)
version: '3.9'

services:
  # Database
  mysql:
    image: mysql:8.0
    ports: ['3306:3306']
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: vexeviet
    volumes:
      - mysql_data:/var/lib/mysql
      - ./infrastructure/docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache & Queue
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redis_data:/data

  # Search
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports: ['9200:9200']
    volumes:
      - es_data:/usr/share/elasticsearch/data

  # Object Storage
  minio:
    image: minio/minio:latest
    ports: ['9000:9000', '9001:9001']
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  # Email Testing
  mailhog:
    image: mailhog/mailhog:latest
    ports: ['1025:1025', '8025:8025']

  # Database UI
  adminer:
    image: adminer:latest
    ports: ['8080:8080']
    environment:
      ADMINER_DEFAULT_SERVER: mysql

volumes:
  mysql_data:
  redis_data:
  es_data:
  minio_data:

networks:
  default:
    name: vexeviet-dev
```

### Database Schema Management (Prisma)

```prisma
// services/user-service/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String?   @unique
  passwordHash  String
  fullName      String
  avatar        String?
  verified      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  bookings      Booking[]
  reviews       Review[]
  
  @@index([email])
  @@index([phone])
  @@map("users")
}

model Route {
  id            String    @id @default(uuid())
  operatorId    String
  fromCity      String
  toCity        String
  departureTime DateTime
  arrivalTime   DateTime
  price         Decimal   @db.Decimal(10, 2)
  busType       String
  totalSeats    Int
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  bookings      Booking[]
  
  @@index([fromCity, toCity, departureTime])
  @@map("routes")
}

model AppLog {
  id          String   @id @default(uuid())
  level       String   // INFO, WARN, ERROR
  message     String   @db.Text
  context     Json?    // Flexible JSON data
  service     String   // user-service, booking-service, etc.
  userId      String?
  requestId   String?
  timestamp   DateTime @default(now())
  
  @@index([level, timestamp])
  @@index([service, timestamp])
  @@index([userId, timestamp])
  @@map("app_logs")
}

// ... more models
```

```bash
# Create migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

## 🎯 Project Overview

**Type:** Clone of vexere.com - Vietnamese bus ticket booking platform  
**Architecture:** Microservices + AI/ML + Event-driven  
**Framework:** SAFe Portfolio 6.0  
**Timeline:** 5 PIs × 10 weeks = 50 weeks (~12 months)  
**Target Launch:** PI 5 completion (Week 50)

**Business Domain:** Travel & Transportation  
**Core Value:** Connect passengers with bus operators through intelligent booking platform

---

## 📊 SAFe Organization

### Agile Release Train (ART)
**Name:** "VeXeViet Platform Train"  
**Cadence:** 10-week Program Increments (PI)  
**Structure:** 5 iterations (2 weeks each) + 1 IP iteration (2 weeks)

### Teams (6 Agile Teams, ~50 people)

| Team | Focus | Size | Primary Tech |
|------|-------|------|-------------|
| **Team 1** | Web Frontend | 8 | React/Next.js 14, TypeScript |
| **Team 2** | Mobile | 7 | React Native, TypeScript |
| **Team 3** | Core Services | 9 | Node.js/Go, PostgreSQL |
| **Team 4** | Payment & Integration | 8 | Node.js, Payment APIs |
| **Team 5** | AI/ML | 8 | Python, PyTorch, MLflow |
| **Team 6** | QA & DevOps | 7 | K8s, CI/CD, Testing |

### Key Roles
- **Release Train Engineer (RTE):** Facilitates ART execution
- **Product Management:** Owns vision & roadmap
- **System Architect:** Technical leadership
- **Business Owners:** Strategic decisions

---

## 🏗️ Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Mobile App  │  │ Partner API  │     │
│  │ (Next.js 14) │  │(React Native)│  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong)                       │
│            JWT Auth • Rate Limiting • CORS                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Microservices Layer                        │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│  │ User  │ │Search │ │Booking│ │Payment│ │ Route │ ...    │
│  │Service│ │Service│ │Service│ │Service│ │Service│        │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      AI/ML Services                          │
│  ┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │
│  │Recommendation│ │Chatbot  │ │  Smart   │ │   Fraud    │  │
│  │   Engine    │ │ Service │ │ Pricing  │ │ Detection  │  │
│  └─────────────┘ └─────────┘ └──────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────┐ ┌───────┐ ┌──────────────┐                   │
│  │  MySQL   │ │ Redis │ │Elasticsearch │                   │
│  │ 8.0+     │ │(Cache)│ │  (Search)    │                   │
│  │(Primary) │ │(Queue)│ │              │                   │
│  │(+ Logs)  │ │(Logs) │ │              │                   │
│  └──────────┘ └───────┘ └──────────────┘                   │
│  ┌──────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │  Kafka   │ │   S3/MinIO     │ │Data Warehouse  │       │
│  │(Events)  │ │(Object Store)  │ │  (BigQuery)    │       │
│  └──────────┘ └────────────────┘ └────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Microservices Breakdown

1. **User Service** - Auth, profiles, preferences
2. **Search Service** - Route search, filtering, Elasticsearch
3. **Booking Service** - Seat selection, reservations
4. **Payment Service** - VNPay, Momo, ZaloPay integration
5. **Route Service** - Routes, schedules, operators
6. **Notification Service** - Email, SMS, Push (FCM)
7. **Review Service** - Ratings, reviews
8. **Partner Service** - Bus operator management
9. **Analytics Service** - BI, reporting

### AI Services Breakdown

1. **Recommendation Engine** - Personalized suggestions
2. **Chatbot Service** - NLU + LLM (GPT-4/Claude)
3. **Smart Pricing Engine** - Dynamic pricing
4. **Fraud Detection Service** - Anomaly detection
5. **Route Optimization** - VRP solver
6. **Demand Forecasting** - Time-series prediction

---

## 🛠️ Technology Stack

### Frontend (Team 1 & 2)

**Web:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **State:** Redux Toolkit / Zustand
- **Styling:** Tailwind CSS + CSS Modules
- **UI Library:** Shadcn/ui + Radix UI
- **Testing:** Vitest, React Testing Library, Playwright
- **Build:** Vite / Turbopack
- **Monorepo:** Turborepo

**Mobile:**
- **Framework:** React Native 0.73+
- **Language:** TypeScript 5
- **Navigation:** React Navigation 6
- **State:** Redux Toolkit
- **Testing:** Jest, Detox
- **Build:** EAS (Expo Application Services)

### Backend (Team 3 & 4)

- **Languages:** Node.js (NestJS), Go, Python (FastAPI)
- **API:** RESTful + GraphQL (optional PI 3)
- **Databases:**
  - **MySQL 8.0+** (primary database)
    - Transactional data: users, bookings, routes, payments
    - Application logs: structured logs table with indexes
    - JSON columns for flexible schema when needed
  - **Redis 7+** (cache, session, queue, temporary logs)
  - **Elasticsearch 8+** (full-text search, analytics)
- **Message Queue:** 
  - Kafka 3+ (event streaming, CDC)
  - RabbitMQ 3.12+ (task queue, delayed jobs)
- **API Gateway:** Kong / Traefik
- **ORM/Query Builder:** 
  - Prisma (Node.js with MySQL)
  - TypeORM (NestJS alternative)
  - GORM (Go)

### Development Environment

- **Containerization:** Docker 24+ & Docker Compose
- **Dev Environment:** VSCode Dev Containers (`.devcontainer/`)
- **Local Stack:** All services run in Docker
  - MySQL, Redis, MongoDB, Elasticsearch
  - Kafka + Zookeeper
  - MinIO (S3-compatible storage)
  - Mailhog (email testing)
  - Adminer/phpMyAdmin (database UI)

### Infrastructure Philosophy

```
┌─────────────────────────────────────────────────────────┐
│  Developer Machine (VSCode + Dev Container)             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Dev Container (Node.js/Go/Python dev tools)       │ │
│  │  - Source code mounted as volume                   │ │
│  │  - Hot reload enabled                              │ │
│  │  - Connected to Docker network                     │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Docker Compose Network (vexeviet-dev)             │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐           │ │
│  │  │MySQL │ │Redis │ │ ES   │ │ Kafka  │           │ │
│  │  │:3306 │ │:6379 │ │:9200 │ │:9092   │           │ │
│  │  └──────┘ └──────┘ └──────┘ └────────┘           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐                       │ │
│  │  │MinIO │ │Mailhog│Adminer│                       │ │
│  │  │:9000 │ │:8025 │ │:8080 │                       │ │
│  │  └──────┘ └──────┘ └──────┘                       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Consistent environment across all developers
- ✅ No "works on my machine" issues
- ✅ Easy onboarding (one command: `docker-compose up`)
- ✅ Production parity (same DB versions, same configs)
- ✅ Isolated services (no port conflicts)
- ✅ Easy cleanup (`docker-compose down -v`)
- ✅ Simplified stack (MySQL for everything + Redis for cache)

### AI/ML (Team 5)

- **Frameworks:** PyTorch 2.0+, TensorFlow 2.x
- **ML Platform:** Kubeflow / MLflow
- **Feature Store:** Feast / Tecton
- **Model Serving:** TorchServe / TensorFlow Serving
- **Data Warehouse:** BigQuery / Snowflake
- **Orchestration:** Airflow / Prefect
- **Monitoring:** Evidently AI, WhyLabs
- **LLMs:** OpenAI GPT-4, Anthropic Claude

### DevOps & Infrastructure (Team 6)

- **Container:** Docker 24+
- **Orchestration:** Kubernetes 1.28+ (EKS/GKE/AKS)
- **CI/CD:** GitHub Actions / GitLab CI
- **IaC:** Terraform / Pulumi
- **Monitoring:**
  - Metrics: Prometheus + Grafana
  - Logging: ELK Stack
  - Tracing: Jaeger / Zipkin
  - APM: New Relic / Datadog
- **Secret Management:** HashiCorp Vault

---

## 📂 Repository Structure

```
vexeviet-platform/
├── .devcontainer/              # VSCode Dev Container configs
│   ├── devcontainer.json       # Main dev container config
│   ├── docker-compose.yml      # Dev services stack
│   └── Dockerfile              # Dev container image
├── apps/
│   ├── web/                    # Next.js 14 Web App (Team 1)
│   ├── mobile/                 # React Native App (Team 2)
│   └── admin/                  # Admin dashboard (Future)
├── services/                   # Microservices (Team 3 & 4)
│   ├── user-service/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml  # Service-specific compose
│   │   └── prisma/             # Database schema & migrations
│   ├── search-service/
│   ├── booking-service/
│   ├── payment-service/
│   ├── route-service/
│   ├── notification-service/
│   ├── review-service/
│   ├── partner-service/
│   └── analytics-service/
├── ai-services/                # ML Services (Team 5)
│   ├── recommendation-engine/
│   ├── chatbot-service/
│   ├── smart-pricing/
│   ├── fraud-detection/
│   ├── route-optimization/
│   └── demand-forecasting/
├── packages/                   # Shared libraries
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # Shared configs
│   └── utils/                  # Shared utilities
├── infrastructure/             # IaC & DevOps (Team 6)
│   ├── terraform/
│   ├── k8s/
│   ├── docker/
│   │   ├── mysql/              # MySQL configs
│   │   │   ├── init.sql
│   │   │   └── my.cnf
│   │   ├── redis/              # Redis configs
│   │   │   └── redis.conf
│   │   ├── docker-compose.dev.yml      # Development stack
│   │   ├── docker-compose.staging.yml  # Staging stack
│   │   └── docker-compose.prod.yml     # Production stack
│   └── ci-cd/
├── docs/                       # Documentation
│   ├── adr/                    # Architecture Decision Records
│   ├── api/                    # API documentation
│   ├── database/               # DB schema & migrations docs
│   └── runbooks/               # Operational runbooks
├── tests/                      # E2E & integration tests
│   ├── e2e/
│   └── integration/
├── docker-compose.yml          # Root compose (all services)
└── Makefile                    # Common commands
```

---

## 🎨 Development Workflow

### Iteration Cadence (2 weeks)

```
Week 1 (Monday)      → Iteration Planning
Week 1 (Tue-Fri)     → Development Sprint
Week 2 (Mon-Thu)     → Development Sprint
Week 2 (Friday)      → System Demo + Retrospective
```

### Ceremonies

| Ceremony | Frequency | Duration | Attendees |
|----------|-----------|----------|-----------|
| Daily Standup | Daily | 15 min | Team |
| Iteration Planning | Bi-weekly | 2 hours | Team + PO |
| System Demo | Bi-weekly | 1 hour | All teams + stakeholders |
| Retrospective | Bi-weekly | 1 hour | Team |
| PI Planning | Every 10 weeks | 2 days | All ART |
| Inspect & Adapt | Every 10 weeks | 4 hours | All ART |

### Git Workflow

```bash
# Branch naming
feature/TEAM-XXX-short-description    # New feature
bugfix/TEAM-XXX-short-description     # Bug fix
hotfix/TEAM-XXX-short-description     # Production hotfix

# Examples
feature/FE-101-homepage-search
bugfix/BE-205-payment-webhook-retry
hotfix/MOB-305-crash-on-booking
```

### Commit Convention (Conventional Commits)

```bash
<type>(<scope>): <subject>

# Types: feat, fix, docs, style, refactor, test, chore
# Examples:
feat(search): implement autocomplete with debounce
fix(payment): handle VNPay webhook timeout
docs(api): update booking endpoints
test(booking): add unit tests for seat selection
```

---

## 📝 Code Conventions & Standards

### General Rules

1. **Follow existing patterns** - Check neighboring files before implementing
2. **No comments** unless explicitly requested or code is genuinely complex
3. **Security first** - Never expose/log secrets or API keys
4. **Use absolute paths** for file operations (avoid `../../../`)
5. **Check dependencies** before using new libraries - verify they exist in package.json
6. **TypeScript strict mode** - No `any` types unless absolutely necessary
7. **Error handling** - Always use try-catch, provide meaningful messages
8. **Accessibility** - WCAG 2.1 AA compliance (ARIA labels, keyboard nav)
9. **Performance** - Lazy loading, code splitting, memoization where needed
10. **Testing** - 70%+ coverage, test critical paths

### Frontend Conventions

```typescript
// ✅ Good: Named exports for components
export function SearchBox({ onSearch }: SearchBoxProps) {
  // Component logic
}

// ❌ Bad: Default exports (harder to refactor)
export default SearchBox;

// ✅ Good: Absolute imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';

// ❌ Bad: Relative imports
import { Button } from '../../../components/ui/button';

// ✅ Good: Type-safe API calls
const { data, error } = await api.routes.search({
  from: 'HCM',
  to: 'Hanoi',
  date: '2026-01-15'
});

// ✅ Good: Error boundaries
<ErrorBoundary fallback={<ErrorPage />}>
  <SearchResults />
</ErrorBoundary>
```

### Backend Conventions

```typescript
// ✅ Good: Layered architecture
// Controller → Service → Repository → Database

// ✅ Good: Dependency injection (NestJS)
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentClient: PaymentClient,
    private readonly logger: Logger
  ) {}
  
  async createBooking(dto: CreateBookingDto) {
    return this.prisma.booking.create({
      data: {
        userId: dto.userId,
        routeId: dto.routeId,
        seatNumbers: dto.seatNumbers,
        totalPrice: dto.totalPrice
      }
    });
  }
}

// ✅ Good: Validation with DTOs
@Post('/bookings')
async createBooking(@Body() dto: CreateBookingDto) {
  // dto is validated by class-validator
}

// ✅ Good: Error handling with custom exceptions
throw new BookingNotFoundException(bookingId);

// ✅ Good: Database queries with Prisma
const users = await prisma.user.findMany({
  where: { verified: true },
  include: { bookings: true },
  orderBy: { createdAt: 'desc' }
});

// ✅ Good: Transactions
await prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({ data: bookingData });
  await tx.seat.updateMany({
    where: { id: { in: seatIds } },
    data: { status: 'BOOKED' }
  });
});
```

### Testing Standards

```typescript
// ✅ Good: Descriptive test names
describe('SearchBox', () => {
  it('should show autocomplete after typing 2 characters', async () => {
    // Test logic
  });

  it('should debounce API calls by 300ms', async () => {
    // Test logic
  });
});

// ✅ Good: Test coverage requirements
// Unit tests: 80%+
// Integration tests: Critical paths
// E2E tests: Happy paths + edge cases
```

---

## 🔐 Security Guidelines

1. **Secrets Management:**
   - Use environment variables (`.env.local` for development)
   - Never commit secrets to Git (add to `.gitignore`)
   - Use Docker secrets in production
   - Development secrets in `.env.development` (safe defaults only)

2. **Authentication:**
   - JWT with short expiry (15 min access, 7 day refresh)
   - HTTP-only cookies for tokens
   - Rate limiting on auth endpoints
   - Bcrypt for password hashing (cost factor: 12)

3. **API Security:**
   - HTTPS only in production
   - CORS properly configured
   - Input validation on all endpoints
   - SQL injection prevention (Prisma parameterized queries)
   - XSS protection (sanitize inputs)

4. **Database Security:**
   - Use Prisma's type-safe queries (prevents SQL injection)
   - Separate DB users for services (least privilege)
   - Enable MySQL slow query log in development
   - Row-level security for multi-tenant data

5. **Dependencies:**
   - Regular security audits (`npm audit`, `pnpm audit`)
   - Keep dependencies updated
   - Review third-party packages before adding
   - Use Docker image scanning (Trivy, Snyk)

---

## 📊 Metrics & KPIs

### Technical Metrics

- **Test Coverage:** ≥ 70% (unit + integration)
- **Code Quality:** SonarQube score A
- **API Response Time:** p95 < 500ms
- **Uptime SLA:** 99.95%
- **Build Time:** < 10 minutes
- **Deployment Frequency:** Multiple per day

### Business Metrics

- **Booking Conversion Rate:** Target 10%+
- **Search-to-Book Time:** < 5 minutes
- **Payment Success Rate:** > 95%
- **Customer Satisfaction (NPS):** > 50

---

## 🚀 Current Phase (PI 1, Iteration 1-2)

### ✅ Completed (Iteration 1-1 & 1-2)

**Team 3 (Core Services) - Iteration 1-1:**
- [x] Setup Docker Compose stack (MySQL, Redis, Elasticsearch)
- [x] Repository structure (monorepo with pnpm workspaces)
- [x] User Service skeleton with 8 API endpoints
- [x] Kubernetes manifests & Helm charts
- [x] Docker multi-stage build setup
- [x] TypeScript strict mode (0 errors)

**Team 3 (Core Services) - Iteration 1-2:**
- [x] Database integration (Prisma + MySQL)
- [x] User authentication (register, login, refresh token)
- [x] Database-backed refresh tokens with rotation
- [x] User & RefreshToken repositories
- [x] API Gateway enhanced (logging, rate limiting, error handling)
- [x] Migration scripts (migrate.sh, migrate.bat)
- [x] Database setup documentation

**Team 6 (QA & DevOps) - Iteration 1-1:**
- [x] Kubernetes setup scripts (k8s-setup.sh, .bat)
- [x] Build & deploy automation scripts
- [x] Docker Compose configuration
- [x] Documentation (K8S-DEPLOYMENT.md, DATABASE-SETUP.md)

### 📋 Next Iteration (1-3) - Week 5-6

**Team 3 (Core Services):**
- [ ] Route Service - CRUD operations
- [ ] Search Service - Basic search by origin/destination/date
- [ ] Redis cache integration for route data
- [ ] Unit tests for User Service (Jest)

**Team 4 (Payment & Integration):**
- [ ] Payment Service skeleton
- [ ] API Gateway routing configuration
- [ ] Database connection pooling optimization

**Team 6 (QA & DevOps):**
- [ ] Integration tests (Postman collections)
- [ ] CI/CD pipeline setup (GitHub Actions)
- [ ] Performance baseline testing

---

## 📖 Key Documents

- **SAFe Plans:**
  - `docs/SAFe-Plan-Frontend.md` - Web & Mobile roadmap
  - `docs/SAFe-Plan-Backend.md` - Microservices roadmap
  - `docs/SAFe-Plan-AI-ML.md` - AI services roadmap

- **Iteration Summaries:**
  - `docs/ITERATION-1-1-COMPLETE.md` - ✅ Foundation & User Service skeleton
  - `docs/ITERATION-1-2-COMPLETE.md` - ✅ Database integration & Auth system

- **Architecture:**
  - `docs/adr/` - Architecture Decision Records
  - `docs/api/` - API documentation (OpenAPI specs)
  - `docs/DATABASE-SETUP.md` - Database setup & migration guide
  - `docs/K8S-DEPLOYMENT.md` - Kubernetes deployment guide

- **Operations:**
  - `docs/runbooks/` - Incident response guides
  - `infrastructure/` - IaC & deployment configs
  - `scripts/` - Automation scripts (k8s-setup, migrate, build, deploy)

---

## 🤖 AI Agent Guidelines

### When generating code:

1. **Always check context:**
   - Which team am I working with?
   - Which PI and iteration?
   - What features are in scope?

2. **Reference SAFe plans:**
   - Check feature dependencies
   - Verify API contracts with backend
   - Ensure alignment with acceptance criteria

3. **Generate complete solutions:**
   - Component + Props + Types
   - Unit tests (coverage > 70%)
   - Error handling
   - Accessibility attributes
   - Performance optimizations

4. **Follow conventions:**
   - Use existing patterns from codebase
   - Match file/folder structure
   - Follow naming conventions
   - Add proper TypeScript types

5. **Ask clarifying questions if:**
   - Requirements are ambiguous
   - API contract is missing
   - Design reference is needed
   - Performance requirements unclear

### Example AI workflow:

```
User: "Implement homepage search box"

AI should:
1. Check: docs/SAFe-Plan-Frontend.md → Feature FE-101
2. Verify: API contract for /api/v1/routes/search
3. Check: Existing Button, Input components in design system
4. Review: AGENTS.md for folder structure & conventions
5. Confirm: Docker services are running (MySQL, Redis available)
6. Generate: SearchBox component + tests + Storybook story
7. Validate: Accessibility, performance, TypeScript strict
8. Test: Against local Docker stack (no mocks needed)
```

**Backend Example:**

```
User: "Add booking service API"

AI should:
1. Check: docs/SAFe-Plan-Backend.md → Feature BE-104
2. Review: packages/database/prisma/schema.prisma for models
3. Check: services/user-service/ for patterns
4. Follow: Controller → Service → Repository architecture
5. Generate: Booking endpoints + Prisma repository + validation
6. Test: pnpm type-check, pnpm lint
7. Document: Update API docs in docs/api/
```

---

## 🛠️ Development Onboarding

### New Developer Setup (< 30 minutes)

```bash
# 1. Prerequisites
# - Docker Desktop installed
# - VSCode installed
# - Git configured

# 2. Clone & Start
git clone https://github.com/your-org/vexeviet-platform.git
cd vexeviet-platform
make dev-up

# 3. Open in Dev Container
code .
# Click "Reopen in Container" when prompted

# 4. Install dependencies (auto-runs in container)
pnpm install

# 5. Setup database
make db-migrate
make db-seed

# 6. Start development
cd apps/web
pnpm dev
# Open http://localhost:3000

# 7. Verify services
make health-check
# Should show all services: ✅ MySQL, ✅ Redis, etc.
```

### Common Issues & Solutions

**Issue:** `Cannot connect to MySQL`
```bash
# Solution: Check if MySQL container is healthy
docker ps | grep mysql
docker logs vexeviet-mysql

# Restart if needed
make dev-restart
```

**Issue:** `Port 3306 already in use`
```bash
# Solution: Stop local MySQL or change port in docker-compose
# Edit docker-compose.dev.yml:
ports: ['3307:3306']  # Use 3307 on host
```

**Issue:** `Prisma migration failed`
```bash
# Solution: Reset database
make db-reset

# Or manually
docker exec -it vexeviet-mysql mysql -uroot -proot -e "DROP DATABASE vexeviet; CREATE DATABASE vexeviet;"
npx prisma migrate dev
```

### Daily Development Workflow

```bash
# Morning
make dev-up              # Start all services
code .                   # Open in Dev Container

# Development
# ... write code ...
pnpm test               # Run tests
make db-studio          # View/edit data

# Evening
git commit -m "feat: ..."
make dev-down           # Stop services (optional - can leave running)
```

---

## 📞 Contact & Escalation

- **Technical Issues:** Ping System Architect
- **Product Questions:** Contact Product Owner
- **Blockers:** Raise in Daily Standup or to Scrum Master
- **Architectural Changes:** Create ADR (Architecture Decision Record)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-12 | Initial version for PI 1 |
| 1.1 | 2026-01-19 | Updated for Iteration 1-2 completion - Database integration & Auth |

---

**Document Owner:** Release Train Engineer (RTE)  
**Reviewed By:** System Architect, Product Management  
**Next Review:** PI 2 Planning (Week 11)

---

## 📚 Quick Reference - Backend

### Project Structure
```
vexeviet-BE/
├── packages/
│   ├── common/       # Shared utilities, types, constants
│   ├── database/     # Prisma schema & client
│   └── config/       # Shared configuration
├── services/
│   ├── user-service/ # Auth & user management
│   └── route-service/# Route management (coming in 1-3)
├── apps/
│   └── api-gateway/  # API Gateway with routing
├── k8s/              # Kubernetes manifests
├── scripts/          # Automation scripts
└── docs/             # Documentation
```

### Key Commands
```bash
# Development
pnpm dev                 # Start all services
pnpm docker:up           # Start Docker containers
pnpm docker:down         # Stop Docker containers

# Build & Check
pnpm build               # Build all packages
pnpm type-check          # TypeScript type checking
pnpm lint                # ESLint
pnpm test                # Run tests

# Database (Prisma)
pnpm prisma:generate     # Generate Prisma Client
pnpm prisma:migrate      # Run migrations
cd packages/database && pnpm prisma:studio  # Open Prisma Studio
```

### Technology Stack
- **Runtime**: Node.js >= 18
- **Language**: TypeScript 5.3+ (strict mode)
- **Package Manager**: pnpm 8.12+
- **Build System**: Turborepo
- **ORM**: Prisma 5
- **Database**: MySQL 8.0
- **Cache**: Redis 7
- **API Framework**: Express

### Services & Ports
- API Gateway: 3000
- User Service: 3001
- Route Service: 3002 (coming in 1-3)
- MySQL: 3306
- Redis: 6379

### Code Standards
- TypeScript strict mode enabled
- ESLint with TypeScript rules
- Prettier for formatting
- No `any` types allowed
- Explicit function return types recommended

### Environment Setup
1. Copy `.env.example` to `.env`
2. Start Docker: `pnpm docker:up`
3. Run migrations: `pnpm prisma:migrate`
4. Start dev: `pnpm dev`