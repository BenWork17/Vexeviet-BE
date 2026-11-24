# ITERATION 1-4 COMPLETE

## Summary

**Timeline:** Week 7-8  
**Theme:** Booking Service - Seat Reservation & Concurrency Handling

---

## Completed Items

### Team 3 (Core Services)

#### ✅ Booking Service - Seat Reservation
- Created complete booking-service microservice
- Implemented CRUD operations for bookings
- Seat reservation logic with passenger management
- Booking code generation (VXV + 7 alphanumeric)

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/bookings` | Create a new booking |
| GET | `/api/v1/bookings/my` | Get user's bookings |
| GET | `/api/v1/bookings/:id` | Get booking by ID |
| GET | `/api/v1/bookings/code/:code` | Get booking by code |
| POST | `/api/v1/bookings/:id/cancel` | Cancel booking |
| POST | `/api/v1/bookings/:id/confirm` | Confirm booking (internal) |
| GET | `/api/v1/seats/availability` | Get seat availability with layout |
| POST | `/api/v1/seats/check` | Check specific seats |
| POST | `/api/v1/seats/hold` | Hold seats temporarily |
| POST | `/api/v1/seats/release` | Release held seats |
| GET | `/api/v1/bus-templates` | Get all bus templates |
| GET | `/api/v1/bus-templates/:id` | Get bus template with seats |

#### ✅ BusTemplate & Seat Master Data (NEW)
- Created `BusTemplate` model for vehicle layout definitions
- Created `Seat` model for master seat definitions
- Implemented seat layout generation for different bus types:
  - Standard Bus (45 seats, 1 floor)
  - Limousine (34 seats, 1 floor, VIP rows)
  - Sleeper Bus (40 beds, 2 floors)
  - VIP Bus (24 seats, 1 floor)
- Seat pricing with `priceModifier` (VIP surcharge, upper floor discount)
- Seat position tracking (WINDOW, AISLE, MIDDLE)

#### ✅ Concurrency Handling (Pessimistic Locking)
- Idempotency keys to prevent duplicate bookings
- Pessimistic locking in seat reservation transactions
- TTL-based seat holds (15 minutes default)
- Automatic seat release on booking cancellation/expiration

#### ✅ Message Queue Setup (RabbitMQ)
- Added RabbitMQ to docker-compose.yml
- Created event publisher/consumer infrastructure
- Defined booking event types:
  - `BookingCreated`
  - `BookingConfirmed`
  - `BookingCancelled`
  - `SeatReserved`
  - `SeatReleased`

---

## Database Schema Updates

### New Models Added (Prisma)

```prisma
// =====================================================
// BUS TEMPLATE & SEAT LAYOUT (Master Data)
// =====================================================

enum SeatType {
  NORMAL
  VIP
  SLEEPER
  SEMI_SLEEPER
}

enum SeatPosition {
  WINDOW
  AISLE
  MIDDLE
}

model BusTemplate {
  id            String    @id @default(uuid())
  name          String    @db.VarChar(100)  // "Limousine 34 chỗ"
  busType       BusType
  totalSeats    Int
  floors        Int       @default(1)        // 1 hoặc 2
  rowsPerFloor  Int
  columns       String    @db.VarChar(20)    // "A,B,_,C,D" (_ = lối đi)
  description   String?   @db.Text
  layoutImage   String?   @db.VarChar(500)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  seats         Seat[]
  routes        Route[]
  
  @@map("bus_templates")
}

model Seat {
  id              String       @id @default(uuid())
  busTemplateId   String
  busTemplate     BusTemplate  @relation(...)
  seatNumber      String       @db.VarChar(5)   // "A1", "B2", "1A-L"
  seatLabel       String?      @db.VarChar(10)  // Label hiển thị
  rowNumber       Int
  columnPosition  String       @db.VarChar(2)   // A, B, C, D
  floor           Int          @default(1)      // 1 (dưới), 2 (trên)
  seatType        SeatType     @default(NORMAL)
  position        SeatPosition                   // WINDOW, AISLE, MIDDLE
  priceModifier   Decimal      @default(0)      // Phụ thu/giảm giá
  isAvailable     Boolean      @default(true)   // false = ghế hỏng
  metadata        Json?                          // {hasUSB, hasLegRoom, ...}
  
  @@unique([busTemplateId, seatNumber])
  @@map("seats")
}

// =====================================================
// BOOKING MODELS (Updated)
// =====================================================

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  EXPIRED
}

enum SeatStatus {
  AVAILABLE
  HELD
  BOOKED
  BLOCKED
}

model Booking {
  id                 String           @id @default(uuid())
  bookingCode        String           @unique @db.VarChar(10)
  userId             String
  routeId            String
  departureDate      DateTime         @db.Date
  status             BookingStatus    @default(PENDING)
  totalPrice         Decimal          @db.Decimal(10, 2)
  serviceFee         Decimal          @default(0) @db.Decimal(10, 2)
  discount           Decimal          @default(0) @db.Decimal(10, 2)
  paymentDeadline    DateTime
  pickupPointId      String?
  dropoffPointId     String?
  contactEmail       String           @db.VarChar(255)
  contactPhone       String           @db.VarChar(20)
  promoCode          String?          @db.VarChar(50)
  idempotencyKey     String           @unique @db.VarChar(100)
  notes              String?          @db.Text
  confirmedAt        DateTime?
  cancelledAt        DateTime?
  cancellationReason String?          @db.Text
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  passengers         BookingPassenger[]
  seats              BookingSeat[]
}

model BookingPassenger {
  id           String    @id @default(uuid())
  bookingId    String
  seatId       String?   // NEW: Reference to master Seat
  firstName    String    @db.VarChar(50)
  lastName     String    @db.VarChar(50)
  seatNumber   String    @db.VarChar(5)   // Denormalized
  idNumber     String?   @db.VarChar(20)
  dateOfBirth  DateTime? @db.Date
  createdAt    DateTime  @default(now())
}

model BookingSeat {
  id             String     @id @default(uuid())
  bookingId      String
  routeId        String
  seatId         String?    // NEW: Reference to master Seat
  departureDate  DateTime   @db.Date
  seatNumber     String     @db.VarChar(5)   // Denormalized
  status         SeatStatus @default(HELD)
  lockedAt       DateTime   @default(now())
  lockedUntil    DateTime
  price          Decimal?   @db.Decimal(10, 2)  // NEW: Price at booking time
  createdAt      DateTime   @default(now())
  
  @@unique([routeId, departureDate, seatNumber])
}

// Route now references BusTemplate
model Route {
  // ... existing fields ...
  busTemplateId  String?
  busTemplate    BusTemplate? @relation(...)
}
```

---

## Infrastructure Updates

### Docker Compose
Added RabbitMQ with management UI:
```yaml
rabbitmq:
  image: rabbitmq:3.13-management-alpine
  ports:
    - "5672:5672"   # AMQP
    - "15672:15672" # Management UI
```

### Service Ports
| Service | Port |
|---------|------|
| User Service | 3001 |
| Route Service | 3002 |
| Booking Service | 3003 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ Management | 15672 |

---

## File Structure Created/Updated

```
services/user-service/
├── src/
│   ├── controllers/
│   │   ├── seat.controller.ts      # NEW
│   │   └── ...
│   ├── repositories/
│   │   ├── seat.repository.ts      # NEW
│   │   ├── bus-template.repository.ts  # NEW
│   │   └── ...
│   ├── routes/
│   │   ├── seat.routes.ts          # NEW
│   │   ├── bus-template.routes.ts  # NEW
│   │   └── ...
│   ├── services/
│   │   ├── seat.service.ts         # NEW
│   │   └── ...
│   └── ...

services/booking-service/
├── src/
│   ├── config/
│   │   └── index.ts
│   ├── controllers/
│   │   ├── booking.controller.ts
│   │   └── seat.controller.ts
│   ├── events/
│   │   ├── booking.events.ts
│   │   ├── consumer.ts
│   │   ├── index.ts
│   │   └── publisher.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── repositories/
│   │   ├── booking.repository.ts
│   │   └── seat.repository.ts
│   ├── routes/
│   │   └── index.ts
│   ├── services/
│   │   ├── booking.service.ts
│   │   └── seat.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── validators/
│   │   └── booking.validator.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md

packages/database/prisma/
├── schema.prisma               # Updated with BusTemplate & Seat
├── seed.ts                     # Updated with bus template seeding
└── migrations/
    └── 20260120081031_add_bus_template_and_seat/
```

---

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| Seat locking prevents double booking (pessimistic lock) | ✅ |
| Booking expires after 15 minutes if not paid | ✅ |
| Idempotency key prevents duplicate bookings | ✅ |
| Event published to RabbitMQ (BookingCreated) | ✅ |
| Transaction rollback on any failure (atomicity) | ✅ |
| Booking code generated (alphanumeric, 10 chars, unique) | ✅ |
| Validation with Zod schemas | ✅ |
| TypeScript strict mode (0 errors) | ✅ |
| **BusTemplate loaded with seats when route is fetched** | ✅ NEW |
| **Seat price = base route price + seat.priceModifier** | ✅ NEW |
| **Response includes floor/row/column for UI rendering** | ✅ NEW |

---

## Seat Availability API Response Example

```json
{
  "success": true,
  "data": {
    "routeId": "route-uuid",
    "departureDate": "2026-02-15",
    "busTemplate": {
      "id": "tpl-uuid",
      "name": "Limousine 34 chỗ",
      "busType": "LIMOUSINE",
      "totalSeats": 34,
      "floors": 1,
      "rowsPerFloor": 10,
      "columns": ["A", "_", "B", "_", "C"]
    },
    "seats": [
      {
        "id": "seat-uuid",
        "seatNumber": "A1",
        "seatLabel": "A1",
        "row": 1,
        "column": "A",
        "floor": 1,
        "seatType": "VIP",
        "position": "WINDOW",
        "basePrice": 350000,
        "priceModifier": 50000,
        "finalPrice": 400000,
        "status": "AVAILABLE",
        "isSelectable": true
      }
    ],
    "summary": {
      "totalSeats": 34,
      "availableSeats": 30,
      "bookedSeats": 3,
      "heldSeats": 1,
      "blockedSeats": 0
    }
  }
}
```

---

## Testing Commands

```bash
# Type check
pnpm type-check

# Run database migrations
cd packages/database
set DATABASE_URL=mysql://root:root@localhost:3306/vexeviet
npx prisma migrate dev --name add_bus_template_and_seat

# Generate Prisma client
npx prisma generate

# Seed database (includes bus templates)
npx prisma db seed

# Start services
docker-compose up -d
pnpm --filter @vexeviet/user-service dev
pnpm --filter @vexeviet/booking-service dev
```

---

## Next Iteration (1-5) Scope

**Theme:** API Documentation & Integration Tests

- [ ] API documentation (Swagger UI / OpenAPI)
- [ ] Integration tests (Postman collections)
- [ ] Performance baseline testing
- [ ] End-to-end booking flow tests

---

**Document Owner:** Team 3 (Core Services)  
**Last Updated:** 2026-01-20  
**Status:** ✅ Complete
