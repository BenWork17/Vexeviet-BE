# SAFe BACKEND - DETAILED SPECIFICATIONS

## FOLDER STRUCTURE

### Microservices Monorepo
```
services/
├── user-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── profile.controller.ts
│   │   │   └── bookings.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── jwt.service.ts
│   │   │   └── otp.service.ts
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   └── session.repository.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── session.model.ts
│   │   │   └── index.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   └── profile.validator.ts
│   │   ├── utils/
│   │   │   ├── crypto.ts
│   │   │   ├── email.ts
│   │   │   └── sms.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── dto.ts
│   │   │   ├── entities.ts
│   │   │   └── index.ts
│   │   ├── events/
│   │   │   ├── user.events.ts
│   │   │   └── publisher.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── search-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── search.controller.ts
│   │   ├── services/
│   │   │   ├── search.service.ts
│   │   │   ├── elasticsearch.service.ts
│   │   │   └── cache.service.ts
│   │   ├── repositories/
│   │   │   └── route.repository.ts
│   │   ├── models/
│   │   │   ├── route.model.ts
│   │   │   └── search.model.ts
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── types/
│   │   ├── tests/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── booking-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── booking.controller.ts
│   │   │   └── seat.controller.ts
│   │   ├── services/
│   │   │   ├── booking.service.ts
│   │   │   ├── seat.service.ts
│   │   │   ├── lock.service.ts
│   │   │   └── saga.service.ts
│   │   ├── repositories/
│   │   │   ├── booking.repository.ts
│   │   │   └── seat.repository.ts
│   │   ├── models/
│   │   │   ├── booking.model.ts
│   │   │   └── seat.model.ts
│   │   ├── sagas/
│   │   │   └── booking.saga.ts
│   │   ├── events/
│   │   │   ├── booking.events.ts
│   │   │   ├── consumer.ts
│   │   │   └── publisher.ts
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── types/
│   │   ├── tests/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── payment-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── payment.controller.ts
│   │   │   └── webhook.controller.ts
│   │   ├── services/
│   │   │   ├── payment.service.ts
│   │   │   ├── vnpay.service.ts
│   │   │   ├── momo.service.ts
│   │   │   ├── zalopay.service.ts
│   │   │   └── refund.service.ts
│   │   ├── repositories/
│   │   │   ├── payment.repository.ts
│   │   │   └── transaction.repository.ts
│   │   ├── models/
│   │   │   ├── payment.model.ts
│   │   │   └── transaction.model.ts
│   │   ├── webhooks/
│   │   │   ├── vnpay.webhook.ts
│   │   │   ├── momo.webhook.ts
│   │   │   └── zalopay.webhook.ts
│   │   ├── events/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   │   ├── crypto.ts
│   │   │   └── signature.ts
│   │   ├── config/
│   │   ├── types/
│   │   ├── tests/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── notification-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   ├── push.service.ts
│   │   │   └── template.service.ts
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── templates/
│   │   │   ├── email/
│   │   │   │   ├── booking-confirmation.html
│   │   │   │   ├── payment-success.html
│   │   │   │   └── cancellation.html
│   │   │   └── sms/
│   │   ├── consumers/
│   │   │   └── notification.consumer.ts
│   │   ├── queues/
│   │   │   └── notification.queue.ts
│   │   ├── middlewares/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── types/
│   │   ├── tests/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── route-service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── route.controller.ts
│   │   │   ├── operator.controller.ts
│   │   │   └── schedule.controller.ts
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── types/
│   │   ├── tests/
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── analytics-service/
├── review-service/
└── partner-service/

shared/
├── libs/
│   ├── common/
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── validator.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   └── cors.middleware.ts
│   │   │   ├── types/
│   │   │   └── constants/
│   │   └── package.json
│   ├── database/
│   │   ├── src/
│   │   │   ├── mysql.ts
│   │   │   ├── mongodb.ts
│   │   │   └── redis.ts
│   │   └── package.json
│   ├── messaging/
│   │   ├── src/
│   │   │   ├── kafka/
│   │   │   │   ├── producer.ts
│   │   │   │   └── consumer.ts
│   │   │   └── rabbitmq/
│   │   └── package.json
│   └── api-types/
│       ├── src/
│       │   ├── dtos/
│       │   ├── entities/
│       │   └── index.ts
│       └── package.json

infrastructure/
├── kubernetes/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   └── secret.yaml
│   ├── services/
│   │   ├── user-service/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── ingress.yaml
│   │   ├── search-service/
│   │   ├── booking-service/
│   │   └── payment-service/
│   └── overlays/
│       ├── dev/
│       ├── staging/
│       └── production/
├── helm/
│   └── vexeviet/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-dev.yaml
│       ├── values-prod.yaml
│       └── templates/
├── terraform/
│   ├── modules/
│   │   ├── eks/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   └── s3/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── production/
│   └── main.tf
└── monitoring/
    ├── prometheus/
    │   └── prometheus.yaml
    ├── grafana/
    │   └── dashboards/
    └── alertmanager/
        └── alerts.yaml
```

---

## API CONTRACTS

### 1. User Service - Registration API

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```typescript
interface RegisterRequest {
  method: "email" | "phone";
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
}
```

**Response:**
```typescript
interface RegisterResponse {
  success: boolean;
  data: {
    userId: string;
    verificationRequired: boolean;
    verificationMethod?: "email" | "sms";
    message: string;
  };
}
```

**Validation Rules:**
- Email: RFC 5322 compliant
- Phone: Vietnamese format (+84xxxxxxxxx)
- Password: Min 8 chars, 1 uppercase, 1 number, 1 special char
- Names: 2-50 chars, letters only

**Error Responses:**
```typescript
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "Email already exists"
      }
    ]
  }
}

// 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many registration attempts. Try again in 15 minutes.",
    "retryAfter": 900
  }
}
```

**Acceptance Criteria:**
```
✅ AC1: Email/phone uniqueness validated (duplicate check)
✅ AC2: Password complexity enforced (8+ chars, uppercase, number, symbol)
✅ AC3: OTP sent to email/phone within 30 seconds
✅ AC4: Rate limit: 5 registrations per IP per hour
✅ AC5: User record created with status "PENDING_VERIFICATION"
✅ AC6: Response time p95 < 500ms
✅ AC7: Password hashed with bcrypt (cost factor 12)
✅ AC8: Event published: UserRegistered (to Kafka)
```

---

### 2. Search Service - Route Search API

**Endpoint:** `POST /api/v1/search/routes`

**Request:**
```typescript
interface SearchRoutesRequest {
  origin: string;
  destination: string;
  departureDate: string;        // YYYY-MM-DD
  returnDate?: string;
  passengers: number;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    departureTimeRange?: { start: string; end: string };
    busTypes?: string[];
    amenities?: string[];
    operatorIds?: string[];
  };
  sort?: {
    by: "price" | "duration" | "departure" | "rating";
    order: "asc" | "desc";
  };
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface SearchRoutesResponse {
  success: boolean;
  data: {
    routes: Route[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      priceRange: { min: number; max: number };
      departureTimeRange: { min: string; max: string };
      availableBusTypes: string[];
      availableAmenities: string[];
    };
  };
  metadata: {
    searchId: string;
    executionTime: number;        // Milliseconds
    cacheHit: boolean;
  };
}

interface Route {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorLogo: string;
  operatorRating: number;
  busType: string;
  busNumber: string;
  origin: {
    cityId: string;
    cityName: string;
    terminalName: string;
    coordinates: { lat: number; lng: number };
  };
  destination: {
    cityId: string;
    cityName: string;
    terminalName: string;
    coordinates: { lat: number; lng: number };
  };
  departureTime: string;          // ISO 8601
  arrivalTime: string;
  duration: number;               // Minutes
  distance: number;               // Kilometers
  price: {
    amount: number;
    currency: "VND";
    originalPrice?: number;
    discount?: number;
  };
  availableSeats: number;
  totalSeats: number;
  amenities: string[];
  pickupPoints: PickupPoint[];
  dropoffPoints: DropoffPoint[];
  policies: {
    cancellationDeadline: number; // Hours before departure
    refundPercentage: number;
  };
  images: string[];
}
```

**Database Query (MySQL + Elasticsearch):**
```sql
-- MySQL (for exact filters)
SELECT r.*, o.name as operator_name, o.rating
FROM routes r
INNER JOIN operators o ON r.operator_id = o.id
WHERE r.origin_city_id = ?
  AND r.destination_city_id = ?
  AND r.departure_date = ?
  AND r.available_seats >= ?
  AND r.price BETWEEN ? AND ?
ORDER BY r.departure_time ASC
LIMIT ? OFFSET ?;

-- Elasticsearch (for fuzzy search, geo-location)
{
  "query": {
    "bool": {
      "must": [
        { "match": { "origin.cityName": "Hanoi" } },
        { "match": { "destination.cityName": "Ho Chi Minh" } },
        { "range": { "departureDate": { "gte": "2026-02-15" } } }
      ],
      "filter": [
        { "range": { "price.amount": { "lte": 500000 } } },
        { "terms": { "busType": ["VIP", "LIMOUSINE"] } }
      ]
    }
  },
  "sort": [{ "price.amount": "asc" }],
  "from": 0,
  "size": 20
}
```

**Caching Strategy (Redis):**
```typescript
// Cache key format
const cacheKey = `search:${origin}:${destination}:${date}:${hash(filters)}`;

// Cache TTL: 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(results));

// Cache invalidation triggers
// - New route added
// - Seat availability changed
// - Price updated
```

**Acceptance Criteria:**
```
✅ AC1: Search returns results in < 200ms (p95) with cache hit
✅ AC2: Search returns results in < 800ms (p95) without cache
✅ AC3: Fuzzy search matches typos (e.g., "Ha Noi" → "Hanoi")
✅ AC4: Filters applied correctly (price, time, bus type)
✅ AC5: Pagination works (max 100 routes per request)
✅ AC6: Cache hit rate > 80%
✅ AC7: Search logged to analytics (searchId tracking)
✅ AC8: Empty results return suggestions (nearby cities)
```

---

### 3. Booking Service - Create Booking API

**Endpoint:** `POST /api/v1/bookings`

**Request:**
```typescript
interface CreateBookingRequest {
  routeId: string;
  departureDate: string;
  passengers: PassengerInfo[];
  seats: string[];              // ["A1", "A2"]
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: {
    email: string;
    phone: string;
  };
  addons?: {
    insurance?: boolean;
    meal?: boolean;
  };
  promoCode?: string;
  idempotencyKey: string;       // UUID for preventing duplicates
}

interface PassengerInfo {
  firstName: string;
  lastName: string;
  idNumber?: string;
  dateOfBirth?: string;
}
```

**Response:**
```typescript
interface CreateBookingResponse {
  success: boolean;
  data: {
    bookingId: string;
    bookingCode: string;         // VXV123456
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    route: RouteSnapshot;
    passengers: PassengerInfo[];
    seats: string[];
    totalPrice: {
      amount: number;
      currency: "VND";
      breakdown: {
        tickets: number;
        insurance?: number;
        meal?: number;
        serviceFee: number;
        discount?: number;
      };
    };
    paymentDeadline: string;     // ISO 8601 (15 minutes from now)
    paymentUrl: string;
    createdAt: string;
  };
}
```

**Business Logic Flow:**
```typescript
async function createBooking(request: CreateBookingRequest) {
  // 1. Idempotency check
  const existing = await checkIdempotency(request.idempotencyKey);
  if (existing) return existing;

  // 2. Seat availability check + lock (pessimistic locking)
  const transaction = await db.transaction();
  const seats = await lockSeats(request.routeId, request.seats, transaction);
  
  if (!seats.allAvailable) {
    await transaction.rollback();
    throw new Error("SEATS_UNAVAILABLE");
  }

  // 3. Calculate price
  const price = await calculatePrice({
    route: request.routeId,
    seats: request.seats.length,
    addons: request.addons,
    promoCode: request.promoCode
  });

  // 4. Create booking record
  const booking = await bookingRepository.create({
    ...request,
    totalPrice: price.total,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
  }, transaction);

  // 5. Set TTL for seat hold (Redis)
  await redis.setex(
    `seat-hold:${request.routeId}:${request.seats.join(",")}`,
    900, // 15 minutes
    booking.id
  );

  // 6. Publish event
  await publishEvent("BookingCreated", {
    bookingId: booking.id,
    userId: request.userId,
    routeId: request.routeId,
    totalPrice: price.total
  });

  // 7. Commit transaction
  await transaction.commit();

  return booking;
}
```

**Database Schema (MySQL - Prisma):**

> **Architecture Decision: BusTemplate + Seat Pattern**
> 
> Chúng ta sử dụng mô hình **BusTemplate → Seat** thay vì gắn Seat trực tiếp vào Route.
> Điều này cho phép:
> - ✅ Tái sử dụng layout ghế cho nhiều route cùng loại xe
> - ✅ Chuẩn hóa sơ đồ ghế theo từng loại xe (STANDARD 45 chỗ, LIMOUSINE 34 chỗ, SLEEPER 40 giường, ...)
> - ✅ Dễ dàng thay đổi layout mà không ảnh hưởng đến route
> - ✅ Hỗ trợ xe 2 tầng, xe giường nằm, xe VIP với layout khác nhau

```sql
-- =====================================================
-- BUS TEMPLATE & SEAT LAYOUT (Master Data)
-- =====================================================

-- Bus Template: Định nghĩa các loại xe với layout ghế chuẩn
CREATE TABLE bus_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,              -- "Limousine 34 chỗ", "Giường nằm 40 giường"
  bus_type ENUM('STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER') NOT NULL,
  total_seats INT NOT NULL,                 -- Tổng số ghế/giường
  floors INT NOT NULL DEFAULT 1,            -- Số tầng (1 hoặc 2)
  rows_per_floor INT NOT NULL,              -- Số hàng mỗi tầng
  columns VARCHAR(20) NOT NULL,             -- "A,B,C,D" hoặc "A,B,_,C,D" (_ = lối đi)
  description TEXT,
  layout_image VARCHAR(500),                -- URL hình ảnh sơ đồ ghế
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_bus_type (bus_type),
  INDEX idx_is_active (is_active)
);

-- Seat: Định nghĩa từng ghế trong template
CREATE TABLE seats (
  id VARCHAR(36) PRIMARY KEY,
  bus_template_id VARCHAR(36) NOT NULL,
  seat_number VARCHAR(5) NOT NULL,          -- "A1", "B2", "1A", "1B"
  seat_label VARCHAR(10),                   -- Label hiển thị cho khách (có thể khác seat_number)
  row_number INT NOT NULL,                  -- Hàng: 1, 2, 3, ...
  column_position VARCHAR(2) NOT NULL,      -- Cột: A, B, C, D
  floor INT NOT NULL DEFAULT 1,             -- Tầng: 1 (dưới), 2 (trên)
  seat_type ENUM('NORMAL', 'VIP', 'SLEEPER', 'SEMI_SLEEPER') NOT NULL DEFAULT 'NORMAL',
  position ENUM('WINDOW', 'AISLE', 'MIDDLE') NOT NULL, -- Vị trí: cửa sổ, lối đi, giữa
  price_modifier DECIMAL(10, 2) DEFAULT 0,  -- Phụ thu/giảm giá (VD: +50000 cho VIP)
  is_available BOOLEAN DEFAULT TRUE,        -- Ghế có thể đặt không (ghế hỏng = FALSE)
  metadata JSON,                            -- Dữ liệu bổ sung: {width, recline, hasUSB, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (bus_template_id) REFERENCES bus_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uk_template_seat (bus_template_id, seat_number),
  INDEX idx_bus_template (bus_template_id),
  INDEX idx_floor_row (floor, row_number),
  INDEX idx_seat_type (seat_type),
  INDEX idx_is_available (is_available)
);

-- =====================================================
-- ROUTE với BusTemplate reference
-- =====================================================

-- Route giờ reference tới BusTemplate thay vì tự định nghĩa layout
ALTER TABLE routes ADD COLUMN bus_template_id VARCHAR(36);
ALTER TABLE routes ADD FOREIGN KEY (bus_template_id) REFERENCES bus_templates(id);
ALTER TABLE routes ADD INDEX idx_bus_template (bus_template_id);

-- =====================================================
-- BOOKING MODELS
-- =====================================================

CREATE TABLE bookings (
  id VARCHAR(36) PRIMARY KEY,
  booking_code VARCHAR(10) UNIQUE NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  route_id VARCHAR(36) NOT NULL,
  departure_date DATE NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  total_price DECIMAL(10, 2) NOT NULL,
  service_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  payment_deadline TIMESTAMP NOT NULL,
  pickup_point_id VARCHAR(50),
  dropoff_point_id VARCHAR(50),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  promo_code VARCHAR(50),
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  notes TEXT,
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  INDEX idx_booking_code (booking_code),
  INDEX idx_user_id (user_id),
  INDEX idx_status_created (status, created_at),
  INDEX idx_route_departure (route_id, departure_date)
);

CREATE TABLE booking_passengers (
  id VARCHAR(36) PRIMARY KEY,
  booking_id VARCHAR(36) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  seat_id VARCHAR(36) NOT NULL,             -- Reference tới Seat
  seat_number VARCHAR(5) NOT NULL,          -- Denormalized for quick access
  id_number VARCHAR(20),
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id) REFERENCES seats(id),
  INDEX idx_booking_id (booking_id)
);

-- BookingSeat: Tracking trạng thái ghế theo ngày khởi hành
CREATE TABLE booking_seats (
  id VARCHAR(36) PRIMARY KEY,
  booking_id VARCHAR(36) NOT NULL,
  route_id VARCHAR(36) NOT NULL,
  seat_id VARCHAR(36) NOT NULL,             -- Reference tới Seat (master)
  departure_date DATE NOT NULL,
  seat_number VARCHAR(5) NOT NULL,          -- Denormalized for quick query
  status ENUM('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED') NOT NULL DEFAULT 'HELD',
  locked_at TIMESTAMP DEFAULT NOW(),
  locked_until TIMESTAMP NOT NULL,
  price DECIMAL(10, 2) NOT NULL,            -- Giá tại thời điểm đặt (base + modifier)
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (seat_id) REFERENCES seats(id),
  UNIQUE KEY uk_route_date_seat (route_id, departure_date, seat_number),
  INDEX idx_route_date_seat (route_id, departure_date, seat_number),
  INDEX idx_status (status),
  INDEX idx_booking_id (booking_id),
  INDEX idx_locked_until (locked_until)
);
```

**Acceptance Criteria:**
```
✅ AC1: Seat locking prevents double booking (pessimistic lock)
✅ AC2: Booking expires after 15 minutes if not paid
✅ AC3: Idempotency key prevents duplicate bookings (same request)
✅ AC4: Promo code validation (exists, not expired, valid for route)
✅ AC5: Event published to Kafka (BookingCreated)
✅ AC6: Transaction rollback on any failure (atomicity)
✅ AC7: Booking code generated (alphanumeric, 10 chars, unique)
✅ AC8: Response time p95 < 1s
✅ AC9: BusTemplate loaded with seats when route is fetched
✅ AC10: Seat price = base route price + seat.priceModifier
```

---

### 3.1. Seat Availability API

**Endpoint:** `GET /api/v1/seats/availability`

**Query Parameters:**
```typescript
interface SeatAvailabilityParams {
  routeId: string;           // UUID của route
  departureDate: string;     // YYYY-MM-DD
}
```

**Response:**
```typescript
interface SeatAvailabilityResponse {
  success: boolean;
  data: {
    routeId: string;
    departureDate: string;
    busTemplate: BusTemplateInfo;
    seats: SeatInfo[];
    summary: {
      totalSeats: number;
      availableSeats: number;
      bookedSeats: number;
      heldSeats: number;
      blockedSeats: number;
    };
  };
}

interface BusTemplateInfo {
  id: string;
  name: string;                    // "Limousine 34 chỗ"
  busType: "STANDARD" | "VIP" | "LIMOUSINE" | "SLEEPER";
  totalSeats: number;
  floors: number;                  // 1 hoặc 2
  rowsPerFloor: number;
  columns: string[];               // ["A", "B", "_", "C", "D"] (_ = lối đi)
  layoutImage?: string;            // URL hình ảnh sơ đồ
}

interface SeatInfo {
  id: string;                      // Seat master ID
  seatNumber: string;              // "A1", "B2"
  seatLabel: string;               // Label hiển thị (có thể khác seatNumber)
  row: number;                     // Hàng: 1, 2, 3, ...
  column: string;                  // Cột: A, B, C, D
  floor: number;                   // Tầng: 1 (dưới), 2 (trên)
  seatType: "NORMAL" | "VIP" | "SLEEPER" | "SEMI_SLEEPER";
  position: "WINDOW" | "AISLE" | "MIDDLE";
  
  // Pricing
  basePrice: number;               // Giá route gốc
  priceModifier: number;           // Phụ thu/giảm (+50000, -10000)
  finalPrice: number;              // basePrice + priceModifier
  
  // Availability for this date
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
  isSelectable: boolean;           // true nếu status = AVAILABLE
  
  // Metadata
  metadata?: {
    hasUSB?: boolean;
    hasLegRoom?: boolean;
    width?: string;                // "standard", "wide"
    recline?: string;              // "fixed", "partial", "full"
  };
}
```

**Business Logic:**
```typescript
async function getSeatAvailability(routeId: string, departureDate: string) {
  // 1. Get route with BusTemplate
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      busTemplate: {
        include: {
          seats: {
            where: { isAvailable: true },
            orderBy: [{ floor: 'asc' }, { rowNumber: 'asc' }, { columnPosition: 'asc' }]
          }
        }
      }
    }
  });

  if (!route || !route.busTemplate) {
    throw new Error("ROUTE_NOT_FOUND");
  }

  // 2. Get booked/held seats for this date
  const bookedSeats = await prisma.bookingSeat.findMany({
    where: {
      routeId,
      departureDate: new Date(departureDate),
      status: { in: ['HELD', 'BOOKED', 'BLOCKED'] },
      // Filter out expired holds
      OR: [
        { status: { in: ['BOOKED', 'BLOCKED'] } },
        { status: 'HELD', lockedUntil: { gt: new Date() } }
      ]
    }
  });

  const bookedSeatMap = new Map(bookedSeats.map(s => [s.seatId, s.status]));

  // 3. Map seats with availability
  const seats = route.busTemplate.seats.map(seat => ({
    id: seat.id,
    seatNumber: seat.seatNumber,
    seatLabel: seat.seatLabel || seat.seatNumber,
    row: seat.rowNumber,
    column: seat.columnPosition,
    floor: seat.floor,
    seatType: seat.seatType,
    position: seat.position,
    basePrice: Number(route.price),
    priceModifier: Number(seat.priceModifier),
    finalPrice: Number(route.price) + Number(seat.priceModifier),
    status: bookedSeatMap.get(seat.id) || 'AVAILABLE',
    isSelectable: !bookedSeatMap.has(seat.id),
    metadata: seat.metadata
  }));

  // 4. Calculate summary
  const summary = {
    totalSeats: seats.length,
    availableSeats: seats.filter(s => s.status === 'AVAILABLE').length,
    bookedSeats: seats.filter(s => s.status === 'BOOKED').length,
    heldSeats: seats.filter(s => s.status === 'HELD').length,
    blockedSeats: seats.filter(s => s.status === 'BLOCKED').length
  };

  return {
    routeId,
    departureDate,
    busTemplate: {
      id: route.busTemplate.id,
      name: route.busTemplate.name,
      busType: route.busTemplate.busType,
      totalSeats: route.busTemplate.totalSeats,
      floors: route.busTemplate.floors,
      rowsPerFloor: route.busTemplate.rowsPerFloor,
      columns: route.busTemplate.columns.split(','),
      layoutImage: route.busTemplate.layoutImage
    },
    seats,
    summary
  };
}
```

**Caching Strategy (Redis):**
```typescript
// Cache key format
const cacheKey = `seats:${routeId}:${departureDate}`;

// Cache TTL: 30 seconds (short because availability changes frequently)
await redis.setex(cacheKey, 30, JSON.stringify(result));

// Cache invalidation triggers:
// - New booking created (HELD)
// - Booking confirmed (BOOKED)
// - Booking cancelled (release seat)
// - Hold expired (background job)
```

**Acceptance Criteria (Seat Availability API):**
```
✅ AC1: Response includes full seat layout from BusTemplate
✅ AC2: Each seat shows real-time availability status
✅ AC3: Expired holds (lockedUntil < now) are treated as AVAILABLE
✅ AC4: Price includes base route price + seat modifier
✅ AC5: Response includes floor/row/column for UI rendering
✅ AC6: Cache TTL 30 seconds to balance freshness vs performance
✅ AC7: Response time p95 < 200ms (with cache hit)
✅ AC8: Summary counts all seat statuses correctly
```

---

### 3.2. Seat Layout Examples

**Example 1: Standard Bus 45 chỗ (1 tầng)**
```json
{
  "busTemplate": {
    "id": "tpl-standard-45",
    "name": "Xe ghế ngồi 45 chỗ",
    "busType": "STANDARD",
    "totalSeats": 45,
    "floors": 1,
    "rowsPerFloor": 11,
    "columns": ["A", "B", "_", "C", "D"]
  },
  "seats": [
    { "seatNumber": "A1", "row": 1, "column": "A", "floor": 1, "position": "WINDOW", "status": "AVAILABLE" },
    { "seatNumber": "B1", "row": 1, "column": "B", "floor": 1, "position": "AISLE", "status": "BOOKED" },
    { "seatNumber": "C1", "row": 1, "column": "C", "floor": 1, "position": "AISLE", "status": "AVAILABLE" },
    { "seatNumber": "D1", "row": 1, "column": "D", "floor": 1, "position": "WINDOW", "status": "HELD" }
  ]
}
```

**Example 2: Limousine 34 chỗ (ghế VIP)**
```json
{
  "busTemplate": {
    "id": "tpl-limousine-34",
    "name": "Limousine 34 chỗ",
    "busType": "LIMOUSINE",
    "totalSeats": 34,
    "floors": 1,
    "rowsPerFloor": 9,
    "columns": ["A", "_", "B", "_", "C"]
  },
  "seats": [
    { "seatNumber": "A1", "row": 1, "column": "A", "floor": 1, "seatType": "VIP", "priceModifier": 50000 },
    { "seatNumber": "B1", "row": 1, "column": "B", "floor": 1, "seatType": "VIP", "priceModifier": 50000 },
    { "seatNumber": "C1", "row": 1, "column": "C", "floor": 1, "seatType": "VIP", "priceModifier": 50000 }
  ]
}
```

**Example 3: Sleeper Bus 40 giường (2 tầng)**
```json
{
  "busTemplate": {
    "id": "tpl-sleeper-40",
    "name": "Giường nằm 40 giường",
    "busType": "SLEEPER",
    "totalSeats": 40,
    "floors": 2,
    "rowsPerFloor": 10,
    "columns": ["A", "_", "B", "C"]
  },
  "seats": [
    { "seatNumber": "1A-L", "row": 1, "column": "A", "floor": 1, "seatType": "SLEEPER", "seatLabel": "1A Tầng dưới" },
    { "seatNumber": "1B-L", "row": 1, "column": "B", "floor": 1, "seatType": "SLEEPER", "seatLabel": "1B Tầng dưới" },
    { "seatNumber": "1A-U", "row": 1, "column": "A", "floor": 2, "seatType": "SLEEPER", "seatLabel": "1A Tầng trên", "priceModifier": -20000 },
    { "seatNumber": "1B-U", "row": 1, "column": "B", "floor": 2, "seatType": "SLEEPER", "seatLabel": "1B Tầng trên", "priceModifier": -20000 }
  ]
}
```

---

### 4. Payment Service - Initiate Payment API

**Endpoint:** `POST /api/v1/payments/initiate`

**Request:**
```typescript
interface InitiatePaymentRequest {
  bookingId: string;
  paymentMethod: "VNPAY" | "MOMO" | "ZALOPAY" | "CREDIT_CARD";
  returnUrl: string;
  cancelUrl: string;
  locale?: "vi" | "en";
}
```

**Response:**
```typescript
interface InitiatePaymentResponse {
  success: boolean;
  data: {
    paymentId: string;
    paymentUrl: string;          // Redirect URL
    qrCode?: string;             // Base64 QR code image
    deepLink?: string;           // For mobile apps
    expiresAt: string;
  };
}
```

**VNPay Integration Example:**
```typescript
async function createVNPayPayment(booking: Booking): Promise<string> {
  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_Amount: booking.totalPrice * 100, // VNPay uses smallest unit
    vnp_CurrCode: "VND",
    vnp_TxnRef: booking.bookingCode,
    vnp_OrderInfo: `Payment for booking ${booking.bookingCode}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
    vnp_IpAddr: request.ip,
    vnp_CreateDate: format(new Date(), "yyyyMMddHHmmss"),
  };

  // Sort params alphabetically
  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((acc, key) => ({ ...acc, [key]: vnp_Params[key] }), {});

  // Create signature
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET);
  const signature = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Build payment URL
  const paymentUrl = `${process.env.VNPAY_URL}?${signData}&vnp_SecureHash=${signature}`;

  return paymentUrl;
}
```

**Webhook Handler (VNPay Return URL):**
```typescript
async function handleVNPayWebhook(query: any) {
  // 1. Verify signature
  const { vnp_SecureHash, ...params } = query;
  const sortedParams = Object.keys(params).sort().reduce(...);
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET);
  const signature = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  if (signature !== vnp_SecureHash) {
    throw new Error("INVALID_SIGNATURE");
  }

  // 2. Check transaction status
  const success = query.vnp_ResponseCode === "00";

  // 3. Update payment record
  await paymentRepository.update(query.vnp_TxnRef, {
    status: success ? "SUCCESS" : "FAILED",
    transactionId: query.vnp_TransactionNo,
    paidAt: success ? new Date() : null,
    responseCode: query.vnp_ResponseCode
  });

  // 4. Publish event
  await publishEvent(success ? "PaymentSucceeded" : "PaymentFailed", {
    bookingId: query.vnp_TxnRef,
    paymentMethod: "VNPAY",
    amount: query.vnp_Amount / 100
  });

  // 5. If success, confirm booking
  if (success) {
    await bookingService.confirmBooking(query.vnp_TxnRef);
  }

  return { success };
}
```

**Database Schema (PostgreSQL):**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  payment_method VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  status VARCHAR(20) NOT NULL,
  transaction_id VARCHAR(100),
  gateway_response JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_booking_id (booking_id),
  INDEX idx_status (status),
  INDEX idx_transaction_id (transaction_id)
);

CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Acceptance Criteria:**
```
✅ AC1: Payment URL generated in < 500ms
✅ AC2: Signature verification prevents tampering
✅ AC3: Idempotency: same paymentId returns same URL
✅ AC4: Webhook processed within 2 seconds
✅ AC5: Payment success triggers booking confirmation
✅ AC6: Payment failure releases seat hold
✅ AC7: Refund API supports partial/full refunds
✅ AC8: All payment events logged to data warehouse
```

---

### 5. Notification Service - Send Email API

**Endpoint:** `POST /api/v1/notifications/email` (Internal API)

**Request:**
```typescript
interface SendEmailRequest {
  to: string;
  template: "booking-confirmation" | "payment-success" | "cancellation" | "reminder";
  data: {
    bookingCode?: string;
    passengerName?: string;
    routeInfo?: RouteInfo;
    totalPrice?: number;
    departureTime?: string;
    [key: string]: any;
  };
  priority?: "high" | "normal" | "low";
}
```

**Response:**
```typescript
interface SendEmailResponse {
  success: boolean;
  data: {
    messageId: string;
    queuedAt: string;
  };
}
```

**Email Template (Handlebars):**
```html
<!-- templates/email/booking-confirmation.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Confirmation - {{bookingCode}}</title>
</head>
<body>
  <h1>Booking Confirmed!</h1>
  <p>Dear {{passengerName}},</p>
  <p>Your booking <strong>{{bookingCode}}</strong> has been confirmed.</p>
  
  <h2>Trip Details</h2>
  <table>
    <tr>
      <td>Route:</td>
      <td>{{routeInfo.origin}} → {{routeInfo.destination}}</td>
    </tr>
    <tr>
      <td>Departure:</td>
      <td>{{departureTime}}</td>
    </tr>
    <tr>
      <td>Seats:</td>
      <td>{{seats}}</td>
    </tr>
    <tr>
      <td>Total:</td>
      <td>{{totalPrice}} VND</td>
    </tr>
  </table>
  
  <p><a href="{{ticketUrl}}">View E-Ticket</a></p>
</body>
</html>
```

**Queue Processing (BullMQ):**
```typescript
import { Queue, Worker } from "bullmq";

const emailQueue = new Queue("email", {
  connection: redisConnection
});

// Producer
async function queueEmail(request: SendEmailRequest) {
  await emailQueue.add("send-email", request, {
    priority: request.priority === "high" ? 1 : 10,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    }
  });
}

// Consumer
const worker = new Worker("email", async (job) => {
  const { to, template, data } = job.data;
  
  // 1. Render template
  const html = await renderTemplate(template, data);
  
  // 2. Send via SendGrid
  const result = await sendgrid.send({
    to,
    from: "no-reply@vexeviet.com",
    subject: getSubject(template),
    html
  });
  
  // 3. Log delivery
  await logEmailDelivery({
    messageId: result.messageId,
    to,
    template,
    status: "sent"
  });
  
  return result;
}, { connection: redisConnection });
```

**Acceptance Criteria:**
```
✅ AC1: Email queued in < 100ms
✅ AC2: Email delivered within 30 seconds (p95)
✅ AC3: Retry failed emails up to 3 times (exponential backoff)
✅ AC4: Dead letter queue for undeliverable emails
✅ AC5: Template rendering supports i18n (Vietnamese/English)
✅ AC6: Unsubscribe link in all marketing emails
✅ AC7: Bounce/spam tracking via SendGrid webhooks
✅ AC8: Rate limit: 100 emails/second (burst protection)
```

---

## SERVICE ACCEPTANCE CRITERIA

### PI 1 - Feature: BE-101 (User Service - Auth)

**User Story:**
```
As a backend developer,
I need a user authentication service,
So that users can securely register and login.
```

**Acceptance Criteria:**

**AC1: Registration Endpoint**
- ✅ POST /api/v1/auth/register accepts email or phone
- ✅ Password complexity enforced (8+ chars, uppercase, number, symbol)
- ✅ Duplicate email/phone returns 400 error
- ✅ OTP sent within 30 seconds
- ✅ User created with status PENDING_VERIFICATION
- ✅ Rate limit: 5 registrations per IP per hour

**AC2: Login Endpoint**
- ✅ POST /api/v1/auth/login supports email/phone + password
- ✅ Returns JWT (access token + refresh token)
- ✅ Access token expires in 1 hour
- ✅ Refresh token expires in 30 days
- ✅ Failed login attempts tracked (max 5, then 15-min lockout)

**AC3: Token Refresh**
- ✅ POST /api/v1/auth/refresh accepts refresh token
- ✅ Returns new access token
- ✅ Invalid/expired refresh token returns 401
- ✅ Refresh token rotation (new refresh token issued)

**AC4: OTP Verification**
- ✅ POST /api/v1/auth/verify-otp accepts code
- ✅ OTP valid for 5 minutes
- ✅ Max 3 attempts per OTP
- ✅ User status updated to ACTIVE on success

**AC5: Security**
- ✅ Passwords hashed with bcrypt (cost 12)
- ✅ JWT signed with RS256 (asymmetric)
- ✅ Refresh tokens stored in database (revocable)
- ✅ Rate limiting on all endpoints

**AC6: Logging & Monitoring**
- ✅ All auth events logged (login, logout, failed attempts)
- ✅ Metrics: login success rate, avg response time
- ✅ Alerts: >5 failed logins from same IP in 5 min

**AC7: Testing**
- ✅ Unit tests: 80% coverage
- ✅ Integration tests: happy path + error cases
- ✅ Load test: 1000 concurrent logins

**AC8: Documentation**
- ✅ OpenAPI spec generated
- ✅ Swagger UI available at /api-docs
- ✅ README with setup instructions

---

### PI 2 - Feature: BE-251 (Payment Service - VNPay Integration)

**User Story:**
```
As a backend developer,
I need VNPay payment integration,
So that users can pay for bookings via ATM/Credit Card.
```

**Acceptance Criteria:**

**AC1: Payment Initiation**
- ✅ POST /api/v1/payments/initiate creates VNPay payment
- ✅ Payment URL generated in < 500ms
- ✅ HMAC-SHA512 signature correct (verified by VNPay)
- ✅ Payment amount in smallest unit (VND * 100)

**AC2: Webhook Handling**
- ✅ GET /api/v1/payments/vnpay/return processes webhook
- ✅ Signature verification prevents tampering
- ✅ Response code 00 = success, others = failure
- ✅ Webhook processed within 2 seconds

**AC3: Payment Confirmation**
- ✅ Success: booking status → CONFIRMED
- ✅ Success: seats released from hold
- ✅ Success: email sent (booking confirmation)
- ✅ Failure: booking status → CANCELLED

**AC4: Idempotency**
- ✅ Same bookingId returns same paymentUrl
- ✅ Duplicate webhooks ignored (deduplicated by transactionId)

**AC5: Error Handling**
- ✅ VNPay timeout: retry up to 3 times
- ✅ Invalid signature: log alert, return 400
- ✅ Network error: queue for retry (exponential backoff)

**AC6: Security**
- ✅ HMAC secret stored in Vault (not in code)
- ✅ HTTPS only (reject HTTP)
- ✅ IP whitelist for VNPay webhook

**AC7: Monitoring**
- ✅ Metrics: payment success rate, avg processing time
- ✅ Alerts: success rate < 95%, signature verification failures
- ✅ Dashboard: real-time payment volume

**AC8: Testing**
- ✅ Integration tests with VNPay sandbox
- ✅ Mock webhook responses for unit tests
- ✅ Chaos testing: simulate VNPay downtime

---

### PI 3 - Feature: BE-301 (Search Service - Elasticsearch)

**User Story:**
```
As a backend developer,
I need Elasticsearch for route search,
So that users get fast, relevant search results.
```

**Acceptance Criteria:**

**AC1: Index Setup**
- ✅ Elasticsearch index created (routes index)
- ✅ Mapping defined (text, keyword, geo_point fields)
- ✅ Analyzer: Vietnamese + English
- ✅ Refresh interval: 1 second

**AC2: Data Indexing**
- ✅ All routes indexed on service startup
- ✅ Real-time updates via Kafka consumer
- ✅ Bulk indexing for large datasets (10k+ routes)
- ✅ Index rebuild triggered manually (admin API)

**AC3: Search Queries**
- ✅ Full-text search on city names (fuzzy matching)
- ✅ Filter by price, time, bus type
- ✅ Geo-location search (pickup points within radius)
- ✅ Autocomplete suggestions (prefix matching)

**AC4: Performance**
- ✅ Search latency < 200ms (p95)
- ✅ Autocomplete latency < 100ms (p95)
- ✅ Support 1000 queries/second (load tested)

**AC5: Caching**
- ✅ Redis cache for popular searches (TTL 5 min)
- ✅ Cache hit rate > 80%
- ✅ Cache invalidation on route updates

**AC6: Relevance**
- ✅ Boost popular routes (rating score)
- ✅ Typo tolerance (fuzzy matching, edit distance 2)
- ✅ Synonym support (e.g., "HCMC" → "Ho Chi Minh")

**AC7: Monitoring**
- ✅ Metrics: query latency, cache hit rate, index size
- ✅ Alerts: latency > 500ms, cluster health yellow/red
- ✅ Dashboard: search volume, top queries

**AC8: Testing**
- ✅ Unit tests: query builders
- ✅ Integration tests: search + filter combinations
- ✅ Load test: 10k concurrent searches

---

## DATABASE SPECIFICATIONS

### PostgreSQL Schema - Bookings Table

```sql
-- Bookings table with partitioning (monthly)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(10) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  departure_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
  total_price DECIMAL(10, 2) NOT NULL,
  payment_deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Partitions (monthly)
CREATE TABLE bookings_2026_01 PARTITION OF bookings
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE bookings_2026_02 PARTITION OF bookings
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_status_created ON bookings(status, created_at DESC);
CREATE INDEX idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX idx_bookings_route_departure ON bookings(route_id, departure_date);

-- Triggers
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Acceptance Criteria:**
```
✅ AC1: Partitioning reduces query time by 50% (large datasets)
✅ AC2: Indexes cover all common queries (user bookings, route bookings)
✅ AC3: Soft delete (deleted_at) preserves data for analytics
✅ AC4: updated_at auto-updates on every change
✅ AC5: Booking code unique constraint enforced
```

---

## DEPLOYMENT SPECIFICATIONS

### Kubernetes Deployment - Booking Service

```yaml
# kubernetes/services/booking-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: booking-service
  namespace: vexeviet
  labels:
    app: booking-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: booking-service
  template:
    metadata:
      labels:
        app: booking-service
        version: v1
    spec:
      containers:
      - name: booking-service
        image: vexeviet/booking-service:v1.0.0
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: booking-service-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: booking-service-secrets
              key: redis-url
        - name: KAFKA_BROKERS
          valueFrom:
            configMapKeyRef:
              name: kafka-config
              key: brokers
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - booking-service
              topologyKey: kubernetes.io/hostname
```

**HPA (Horizontal Pod Autoscaler):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-service-hpa
  namespace: vexeviet
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

**Acceptance Criteria:**
```
✅ AC1: Rolling update with zero downtime
✅ AC2: HPA scales up within 30 seconds when CPU > 70%
✅ AC3: HPA scales down after 5 minutes when load decreases
✅ AC4: Liveness probe restarts unhealthy pods
✅ AC5: Readiness probe prevents traffic to unready pods
✅ AC6: Pod anti-affinity spreads pods across nodes
✅ AC7: Resource limits prevent OOM kills
✅ AC8: Secrets injected from Kubernetes Secrets
```

---

**Document Owner:** Backend Tech Leads + System Architect  
**Last Updated:** January 12, 2026  
**Status:** Ready for Implementation  
**Next Review:** PI 1 Planning
