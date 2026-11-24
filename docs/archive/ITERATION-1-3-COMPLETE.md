# Iteration 1-3 Complete Summary

> **PI:** 1 | **Iteration:** 1-3 | **Week:** 5-6  
> **Status:** ✅ COMPLETE  
> **Date:** January 20, 2026

---

## 📋 Scope Delivered

### BE-102: Route Service - CRUD Operations ✅

**Endpoints Implemented:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/routes` | List routes with pagination & filters | Public |
| GET | `/api/v1/routes/:id` | Get route details | Public |
| POST | `/api/v1/routes` | Create new route | Operator/Admin |
| PUT | `/api/v1/routes/:id` | Update route | Operator/Admin |
| DELETE | `/api/v1/routes/:id` | Soft delete route | Operator/Admin |
| GET | `/api/v1/routes/my/routes` | Get operator's own routes | Operator/Admin |

**Features:**
- ✅ Full CRUD operations
- ✅ Pagination (page, limit, total, totalPages)
- ✅ Filtering (origin, destination, busType, price range, date)
- ✅ Sorting (price, departureTime, duration, createdAt)
- ✅ Soft delete (status=DELETED, deletedAt timestamp)
- ✅ Authorization middleware (Operator/Admin roles)
- ✅ Validation middleware with detailed error messages
- ✅ Proper error handling (400, 401, 403, 404, 500)

### BE-103: Search Service - Basic Search ✅

**Endpoints Implemented:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/search/routes` | Search routes with filters |
| GET | `/api/v1/search/popular` | Get popular routes |
| GET | `/api/v1/search/suggestions` | Get autocomplete suggestions |

**Search Request Body:**
```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Da Lat",
  "departureDate": "2026-02-15",
  "passengers": 2,
  "busType": "LIMOUSINE",
  "minPrice": 100000,
  "maxPrice": 500000,
  "sortBy": "price",
  "sortOrder": "asc",
  "page": 1,
  "pageSize": 20
}
```

**Features:**
- ✅ Search by origin + destination (required)
- ✅ Filter by date, busType, price range
- ✅ Sort by price, departureTime, duration
- ✅ Pagination support
- ✅ Fuzzy matching (city name contains)
- ✅ Popular routes endpoint
- ✅ Autocomplete suggestions

### Redis Cache Integration ✅

**Implementation:**
- ✅ Redis client setup with connection handling
- ✅ CacheService with get/set/delete/invalidate
- ✅ Cache key generation (MD5 hash of params)
- ✅ TTL: 5 minutes for search results
- ✅ TTL: 10 minutes for suggestions
- ✅ Cache hit/miss logging

**Cache Keys:**
- `vexeviet:search:{hash}` - Search results
- `vexeviet:popular:routes:{limit}` - Popular routes
- `vexeviet:suggestions:{field}:{query}` - Autocomplete suggestions

---

## 🗄️ Database Changes

### Schema Updates (Prisma)

**New Enums:**
```prisma
enum BusType {
  STANDARD
  VIP
  LIMOUSINE
  SLEEPER
}

enum RouteStatus {
  ACTIVE
  INACTIVE
  DELETED
}
```

**Updated Route Model:**
```prisma
model Route {
  id                 String      @id @default(uuid())
  name               String
  description        String?     @db.Text
  
  // Location
  origin             String      
  destination        String      
  departureLocation  String?     
  arrivalLocation    String?     
  distance           Float?      
  
  // Time
  departureTime      DateTime
  arrivalTime        DateTime
  duration           Int         
  
  // Bus info
  busType            BusType     @default(STANDARD)
  licensePlate       String?
  totalSeats         Int         @default(45)
  availableSeats     Int         @default(45)
  
  // Pricing
  price              Decimal     @db.Decimal(10, 2)
  
  // Flexible JSON data
  amenities          Json?       
  pickupPoints       Json?       
  dropoffPoints      Json?       
  policies           Json?       
  images             Json?       
  
  // Status
  status             RouteStatus @default(ACTIVE)
  deletedAt          DateTime?
  
  // Operator
  operatorId         String
  operator           User        @relation(...)
  
  // Audit
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([origin, destination])
  @@index([departureTime])
  @@index([status])
  @@index([operatorId])
}
```

**Migration:** `20260120030521_iteration_1_3_route_update`

---

## 📁 Files Created/Modified

### New Files (Route Service)

```
services/route-service/src/
├── config/
│   └── redis.ts                    # Redis client setup
├── controllers/
│   ├── route.controller.ts         # CRUD endpoints handler
│   └── search.controller.ts        # Search endpoints handler
├── middlewares/
│   ├── auth.middleware.ts          # JWT auth + role check
│   └── error.middleware.ts         # Error handling
├── repositories/
│   └── route.repository.ts         # Prisma data access
├── routes/
│   ├── index.ts                    # Route aggregator
│   ├── route.routes.ts             # CRUD routes
│   └── search.routes.ts            # Search routes
├── services/
│   ├── cache.service.ts            # Redis cache operations
│   ├── route.service.ts            # Business logic
│   └── search.service.ts           # Search logic
├── types/
│   └── index.ts                    # TypeScript types & DTOs
├── validators/
│   └── route.validator.ts          # Request validation
└── index.ts                        # App entry point (updated)
```

### Modified Files

- `packages/database/prisma/schema.prisma` - Added Route fields, enums
- `packages/database/src/index.ts` - Export Decimal type
- `services/route-service/package.json` - Added dependencies
- `apps/api-gateway/src/index.ts` - Fixed unused variable lint error
- `services/user-service/src/index.ts` - Fixed unused import

---

## ✅ Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| TypeScript Errors | 0 | 0 | ✅ |
| ESLint Errors | 0 | 0 | ✅ |
| Build Success | Yes | Yes | ✅ |
| Service Starts | Yes | Yes | ✅ |
| Database Migration | Applied | Applied | ✅ |

---

## 🚀 How to Run

```bash
# 1. Start Docker services
pnpm docker:up

# 2. Run migration (if needed)
set DATABASE_URL=mysql://root:root@localhost:3306/vexeviet
cd packages/database && npx prisma migrate dev

# 3. Start Route Service (port 3002)
cd services/route-service
pnpm dev

# 4. (Optional) Start API Gateway (port 3000)
cd apps/api-gateway
pnpm dev
```

### Service Ports
| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Proxy all requests to microservices |
| User Service | 3001 | Auth & user management |
| Route Service | 3002 | Routes CRUD & Search |

---

## 📌 API Examples

### Create Route (Operator)
```bash
# Direct to Route Service (port 3002)
curl -X POST http://localhost:3002/api/v1/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <operator-token>" \
  -d '{
    "name": "HCM - Da Lat Express",
    "origin": "Ho Chi Minh City",
    "destination": "Da Lat",
    "departureTime": "2026-02-15T08:00:00Z",
    "arrivalTime": "2026-02-15T14:00:00Z",
    "duration": 360,
    "price": 350000,
    "busType": "LIMOUSINE"
  }'

# Or via API Gateway (port 3000)
curl -X POST http://localhost:3000/api/v1/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <operator-token>" \
  -d '{"name": "HCM - Da Lat Express", ...}'
```

### Search Routes
```bash
# Direct to Route Service (port 3002)
curl -X POST http://localhost:3002/api/v1/search/routes \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Ho Chi Minh",
    "destination": "Da Lat",
    "departureDate": "2026-02-15"
  }'

# Or via API Gateway (port 3000)
curl -X POST http://localhost:3000/api/v1/search/routes \
  -H "Content-Type: application/json" \
  -d '{"origin": "Ho Chi Minh", "destination": "Da Lat"}'
```

### List Routes with Filters
```bash
# Direct (port 3002)
curl "http://localhost:3002/api/v1/routes?origin=HCM&busType=LIMOUSINE&page=1&limit=10"

# Via Gateway (port 3000)
curl "http://localhost:3000/api/v1/routes?origin=HCM&busType=LIMOUSINE"
```

---

## 📋 Next Iteration (1-4) - Week 7-8

**Team 3 (Core Services):**
- [ ] Booking Service - Seat reservation
- [ ] Booking Service - Concurrency handling (pessimistic locking)
- [ ] Message queue setup (RabbitMQ/Kafka)

**Team 4 (Payment & Integration):**
- [ ] Payment Service skeleton
- [ ] API Gateway routing configuration

---

**Document Owner:** Team 3 - Core Services  
**Reviewed By:** System Architect  
**Status:** Ready for Demo
