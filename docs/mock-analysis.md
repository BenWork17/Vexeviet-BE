# Mock Data vs Backend API - Gap Analysis

**Iteration Status:** 1-2 Complete (Auth + Database)  
**Next Iteration:** 1-3 (Route Service)

---

## 📋 SCOPE: Iteration 1-1 & 1-2 Only

This analysis focuses on **User authentication** components only, since:
- ✅ Iteration 1-1: User Service skeleton (8 endpoints)
- ✅ Iteration 1-2: Auth + Database integration (Prisma + MySQL)
- ⏳ Iteration 1-3: Route Service (not yet implemented)
- ⏳ PI 2: Booking, Payment (future iterations)

---

## ✅ USER MODEL - ITERATION 1-2 STATUS

### Current Prisma Schema (Iteration 1-2)

```prisma
model User {
  id                     String         @id @default(uuid())
  email                  String         @unique
  password               String
  firstName              String
  lastName               String
  phone                  String?        @unique
  role                   UserRole       @default(CUSTOMER)
  isEmailVerified        Boolean        @default(false)
  isPhoneVerified        Boolean        @default(false)
  registrationMethod     String?
  termsAcceptedAt        DateTime?
  verificationCode       String?        @db.VarChar(10)
  verificationCodeExpiry DateTime?
  status                 UserStatus     @default(PENDING_VERIFICATION)
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique @db.VarChar(500)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### Mock FE User Model

```typescript
// Mock không có full User model, chỉ có userId reference trong Booking
{
  userId: 'u1' // Simple string reference
}
```

### ✅ VERDICT: User Model OK for Now

**Alignment:**
- ✅ BE có đầy đủ auth fields (email, password, phone, verification)
- ✅ BE có refresh token storage (security best practice)
- ✅ BE có role system (ADMIN, OPERATOR, CUSTOMER)
- ℹ️ Mock FE không cần full user model vì focus vào booking flow

**No action needed in Iteration 1-3.**

---

## ⚠️ CRITICAL MISSING MODELS (FOR FUTURE ITERATIONS)

### 1. Route Model - **ITERATION 1-3** (Next Sprint)

**Current BE Schema (Iteration 1-2):**
```prisma
model Route {
  id          String   @id @default(uuid())
  name        String
  description String?  @db.Text
  origin      String
  destination String
  distance    Float
  duration    Int
  price       Decimal  @db.Decimal(10, 2)
  userId      String  // ⚠️ SAI - nên là operatorId
  user        User     @relation(fields: [userId], references: [id])
}
```

**Mock FE Requirements:**
```typescript
{
  id: string
  operator: Operator        // ⚠️ BE thiếu Operator model
  busType: string           // ⚠️ BE thiếu
  licensePlate: string      // ⚠️ BE thiếu
  departureTime: DateTime   // ⚠️ BE thiếu
  arrivalTime: DateTime     // ⚠️ BE thiếu
  availableSeats: number    // ⚠️ BE thiếu
  amenities: Amenity[]      // ⚠️ BE thiếu
  pickupPoints: Point[]     // ⚠️ BE thiếu
  dropoffPoints: Point[]    // ⚠️ BE thiếu
  policies: Policy[]        // ⚠️ BE thiếu
  images: string[]          // ⚠️ BE thiếu
}
```

**⚠️ ISSUES FOR ITERATION 1-3:**

| Field | BE Status | Priority |
|-------|-----------|----------|
| `operator` (nested) | ❌ Không có Operator table | 🔴 HIGH |
| `busType` | ❌ Thiếu | 🔴 HIGH |
| `licensePlate` | ❌ Thiếu | 🔴 HIGH |
| `departureTime` | ❌ Thiếu | 🔴 HIGH |
| `arrivalTime` | ❌ Thiếu | 🔴 HIGH |
| `availableSeats` | ❌ Thiếu | 🔴 HIGH |
| `amenities` | ❌ Thiếu | 🟡 MEDIUM |
| `pickupPoints` | ❌ Thiếu | 🟡 MEDIUM |
| `dropoffPoints` | ❌ Thiếu | 🟡 MEDIUM |
| `policies` | ❌ Thiếu | 🟢 LOW |
| `images` | ❌ Thiếu | 🟢 LOW |

**RECOMMENDED FOR ITERATION 1-3:**

**Phase A: Core Route Fields (Must-have)**
```prisma
model Operator {
  id            String   @id @default(uuid())
  name          String
  logoUrl       String?
  rating        Float?   @default(0)
  totalReviews  Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  routes        Route[]
  @@map("operators")
}

model Route {
  id                String         @id @default(uuid())
  operatorId        String         // ✅ Change from userId
  operator          Operator       @relation(fields: [operatorId], references: [id])
  
  // Basic info
  name              String?
  description       String?        @db.Text
  
  // Location
  origin            String         // "HCM"
  destination       String         // "Da Lat"
  distance          Float
  
  // Time - ✅ NEW
  departureTime     DateTime
  arrivalTime       DateTime
  duration          Int            // minutes
  
  // Bus details - ✅ NEW
  busType           String         // "Limousine 34 Seats"
  licensePlate      String
  totalSeats        Int
  availableSeats    Int
  
  // Pricing
  basePrice         Decimal        @db.Decimal(10, 2)
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  @@index([origin, destination, departureTime])
  @@map("routes")
}
```

**Phase B: Route Details (Nice-to-have for Iteration 1-4)**
```prisma
model RouteAmenity {
  id       String @id @default(uuid())
  routeId  String
  name     String
  icon     String
  route    Route  @relation(fields: [routeId], references: [id], onDelete: Cascade)
  @@map("route_amenities")
}

model PickupPoint {
  id       String @id @default(uuid())
  routeId  String
  time     String
  location String
  address  String   @db.Text
  route    Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  @@map("pickup_points")
}

model DropoffPoint {
  id       String @id @default(uuid())
  routeId  String
  time     String
  location String
  address  String   @db.Text
  route    Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  @@map("dropoff_points")
}

model RoutePolicy {
  id          String     @id @default(uuid())
  routeId     String
  type        PolicyType
  title       String
  description String     @db.Text
  route       Route      @relation(fields: [routeId], references: [id], onDelete: Cascade)
  @@map("route_policies")
}

enum PolicyType {
  CANCELLATION
  LUGGAGE
  REFUND
  OTHER
}
```

---

### 2. Booking Model - **PI 2 (Iteration 2-1)** (Future)

**Mock FE Requirements:**
```typescript
{
  id: string
  bookingCode: string      // "VXV-ABC123"
  userId: string
  routeId: string
  status: BookingStatus
  passengers: Passenger[]
  seatNumbers: string[]
  totalPrice: number
  paymentMethod: string
  paymentStatus: string
  transactionId: string
}
```

**BE Current:** ❌ Không có

**Action:** Wait for **Iteration 2-1 (PI 2)** - per SAFe plan

---

### 3. Payment Model - **PI 2 (Iteration 2-1)** (Future)

**Mock FE Requirements:**
```typescript
{
  transactionId: string
  paymentMethod: 'VNPAY' | 'MOMO' | 'ZALOPAY'
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED'
  amount: number
}
```

**BE Current:** ❌ Không có

**Action:** Wait for **Iteration 2-1 (PI 2)** - per SAFe plan

---

## 📊 SUMMARY - ITERATION 1-2 vs MOCK DATA

| Component | Mock FE | BE (1-2) | Gap | Action |
|-----------|---------|----------|-----|--------|
| **User** | Basic | ✅ Full | ✅ OK | None |
| **RefreshToken** | N/A | ✅ Full | ✅ OK | None |
| **Operator** | ✅ Full | ❌ Missing | 🔴 CRITICAL | **Iteration 1-3** |
| **Route** | ✅ Full | ⚠️ 40% done | 🔴 CRITICAL | **Iteration 1-3** |
| **Booking** | ✅ Full | ❌ Missing | 🟡 FUTURE | PI 2 (Iteration 2-1) |
| **Payment** | ✅ Full | ❌ Missing | 🟡 FUTURE | PI 2 (Iteration 2-1) |
| **Amenity** | ✅ Full | ❌ Missing | 🟢 NICE-TO-HAVE | Iteration 1-4 |
| **PickupPoint** | ✅ Full | ❌ Missing | 🟢 NICE-TO-HAVE | Iteration 1-4 |
| **DropoffPoint** | ✅ Full | ❌ Missing | 🟢 NICE-TO-HAVE | Iteration 1-4 |
| **Policy** | ✅ Full | ❌ Missing | 🟢 NICE-TO-HAVE | Iteration 1-4 |

---

## 🎯 ITERATION 1-3 ACTION PLAN (Week 5-6)

Per [SAFe-Plan-Backend.md](./SAFe-Plan-Backend.md):

### Team 3 Tasks:
1. ✅ Create `Operator` model + migration
2. ✅ Refactor `Route` model:
   - Change `userId` → `operatorId`
   - Add `busType`, `licensePlate`
   - Add `departureTime`, `arrivalTime`
   - Add `totalSeats`, `availableSeats`
3. ✅ Implement Route Service CRUD:
   - `POST /api/v1/routes` - Create route
   - `GET /api/v1/routes/:id` - Get route details
   - `GET /api/v1/routes` - List routes
   - `PATCH /api/v1/routes/:id` - Update route
   - `DELETE /api/v1/routes/:id` - Delete route
4. ✅ Search Service basic:
   - `GET /api/v1/search?from=HCM&to=DaLat&date=2026-01-20`

### Team 6 Tasks:
- Integration tests (Postman collections)
- Redis cache setup

---

## ⏳ FUTURE ITERATIONS (Not in Scope)

### Iteration 1-4 (Week 7-8):
- Route details: Amenities, PickupPoints, DropoffPoints, Policies
- Booking Service skeleton

### PI 2 (Week 11-20):
- Booking model + service
- Payment model + service
- VNPay, Momo, ZaloPay integration

---

## ⚠️ CRITICAL MISSING MODELS (FULL LIST FOR REFERENCE)

### 1. Booking Model (HIGHEST PRIORITY)

**Mock FE có:**
```typescript
{
  id: string
  userId: string
  routeId: string
  departureTime: DateTime
  arrivalTime: DateTime
  departureLocation: string
  arrivalLocation: string
  operatorName: string
  totalPrice: number
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'PENDING'
  seatNumbers: string[]
  passengers: Passenger[]
  paymentMethod: string
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED'
  transactionId: string
  bookingCode: string
  ticketPrice: number
  serviceFee: number
}
```

**BE hiện tại:** ❌ KHÔNG CÓ

**Cần thêm vào Prisma:**
```prisma
model Booking {
  id                String        @id @default(uuid())
  bookingCode       String        @unique // VXV-ABC123
  userId            String
  routeId           String
  status            BookingStatus @default(PENDING)
  
  // Pricing
  ticketPrice       Decimal       @db.Decimal(10, 2)
  serviceFee        Decimal       @db.Decimal(10, 2)
  totalPrice        Decimal       @db.Decimal(10, 2)
  
  // Payment
  paymentMethod     String?       // VNPAY, MOMO, ZALOPAY
  paymentStatus     PaymentStatus @default(PENDING)
  transactionId     String?       @unique
  
  // Timestamps
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  // Relations
  user              User          @relation(fields: [userId], references: [id])
  route             Route         @relation(fields: [routeId], references: [id])
  passengers        Passenger[]
  seats             BookingSeat[]
  
  @@index([userId, createdAt])
  @@index([routeId, status])
  @@map("bookings")
}

model Passenger {
  id          String   @id @default(uuid())
  bookingId   String
  fullName    String
  phone       String
  email       String?
  seatNumber  String
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  
  @@map("passengers")
}

model BookingSeat {
  id          String   @id @default(uuid())
  bookingId   String
  seatNumber  String
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  
  @@unique([bookingId, seatNumber])
  @@map("booking_seats")
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

---

### 2. Route Model (CẦN MỞ RỘNG)

**Mock FE có:**
```typescript
{
  id: string
  operator: Operator  // ⚠️ Nested object
  busType: string
  licensePlate: string
  departureTime: DateTime
  arrivalTime: DateTime
  departureLocation: string
  arrivalLocation: string
  duration: string
  price: number
  availableSeats: number
  amenities: Amenity[]
  pickupPoints: PickupPoint[]
  dropoffPoints: DropoffPoint[]
  policies: Policy[]
  images: string[]
}
```

**BE hiện tại:**
```prisma
model Route {
  id          String   @id @default(uuid())
  name        String
  description String?  @db.Text
  origin      String
  destination String
  distance    Float
  duration    Int
  price       Decimal  @db.Decimal(10, 2)
  userId      String  // ⚠️ SAI - nên là operatorId
  user        User     @relation(fields: [userId], references: [id])
}
```

**⚠️ VẤN ĐỀ:**
1. Thiếu `busType`, `licensePlate`, `availableSeats`
2. Thiếu `departureTime`, `arrivalTime` (chỉ có `duration`)
3. Thiếu `amenities`, `pickupPoints`, `dropoffPoints`, `policies`, `images`
4. SAI: `userId` nên là `operatorId` và point đến `Operator` table, không phải `User`

**Cần sửa:**
```prisma
model Route {
  id                String         @id @default(uuid())
  operatorId        String         // ⚠️ Change from userId
  operator          Operator       @relation(fields: [operatorId], references: [id])
  
  // Basic info
  name              String?
  description       String?        @db.Text
  
  // Location
  origin            String         // "HCM"
  destination       String         // "Da Lat"
  originLocation    String         // "Mien Tay Bus Station, HCM"
  destinationLocation String       // "Da Lat Bus Station"
  distance          Float          // km
  
  // Time
  departureTime     DateTime
  arrivalTime       DateTime
  duration          Int            // minutes
  
  // Bus details
  busType           String         // "Limousine 34 Seats"
  licensePlate      String
  totalSeats        Int
  availableSeats    Int
  
  // Pricing
  basePrice         Decimal        @db.Decimal(10, 2)
  currentPrice      Decimal        @db.Decimal(10, 2) // dynamic pricing
  
  // Media
  images            String?        @db.Text // JSON array
  
  // Status
  status            RouteStatus    @default(ACTIVE)
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  // Relations
  amenities         RouteAmenity[]
  pickupPoints      PickupPoint[]
  dropoffPoints     DropoffPoint[]
  policies          RoutePolicy[]
  bookings          Booking[]
  
  @@index([origin, destination, departureTime])
  @@index([operatorId, status])
  @@map("routes")
}

// ⚠️ NEW TABLE
model Operator {
  id            String   @id @default(uuid())
  name          String
  logoUrl       String?
  rating        Float?   @default(0)
  totalReviews  Int      @default(0)
  email         String?  @unique
  phone         String?
  address       String?  @db.Text
  status        OperatorStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  routes        Route[]
  
  @@map("operators")
}

model RouteAmenity {
  id       String @id @default(uuid())
  routeId  String
  name     String
  icon     String
  route    Route  @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  @@map("route_amenities")
}

model PickupPoint {
  id       String @id @default(uuid())
  routeId  String
  time     String   // "08:00"
  location String   // "Mien Tay Bus Station"
  address  String   @db.Text
  route    Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  @@map("pickup_points")
}

model DropoffPoint {
  id       String @id @default(uuid())
  routeId  String
  time     String   // "14:00"
  location String   // "Da Lat Bus Station"
  address  String   @db.Text
  route    Route    @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  @@map("dropoff_points")
}

model RoutePolicy {
  id          String     @id @default(uuid())
  routeId     String
  type        PolicyType
  title       String
  description String     @db.Text
  route       Route      @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  @@map("route_policies")
}

enum PolicyType {
  CANCELLATION
  LUGGAGE
  REFUND
  OTHER
}

enum RouteStatus {
  ACTIVE
  INACTIVE
  CANCELLED
}

enum OperatorStatus {
  ACTIVE
  SUSPENDED
  INACTIVE
}
```

---

### 3. Payment Model (THIẾU)

**Mock FE sử dụng:**
- `transactionId`
- `paymentMethod` (VNPAY, MOMO, ZALOPAY)
- `paymentStatus` (PAID, PENDING, REFUNDED)

**BE hiện tại:** ❌ KHÔNG CÓ (đang nhúng trong Booking)

**Nên tách riêng để audit:**
```prisma
model Payment {
  id              String        @id @default(uuid())
  bookingId       String        @unique
  transactionId   String        @unique
  
  amount          Decimal       @db.Decimal(10, 2)
  method          PaymentMethod
  status          PaymentStatus @default(PENDING)
  
  // Gateway response
  gatewayResponse String?       @db.Text // JSON
  
  // Refund
  refundAmount    Decimal?      @db.Decimal(10, 2)
  refundedAt      DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  booking         Booking       @relation(fields: [bookingId], references: [id])
  
  @@index([transactionId])
  @@index([status, createdAt])
  @@map("payments")
}

enum PaymentMethod {
  VNPAY
  MOMO
  ZALOPAY
  BANK_TRANSFER
  COD
}
```

---

## 📊 SUMMARY

| Model | Mock FE | BE Status | Action |
|-------|---------|-----------|--------|
| User | Basic | ✅ OK | No change needed |
| Operator | ✅ Full | ❌ Không có | **TẠO MỚI** |
| Route | ✅ Full | ⚠️ Thiếu 60% | **MỞ RỘNG** |
| Booking | ✅ Full | ❌ Không có | **TẠO MỚI** |
| Passenger | ✅ Full | ❌ Không có | **TẠO MỚI** |
| Payment | ✅ Full | ❌ Không có | **TẠO MỚI** |
| Amenity | ✅ Full | ❌ Không có | **TẠO MỚI** |
| PickupPoint | ✅ Full | ❌ Không có | **TẠO MỚI** |
| DropoffPoint | ✅ Full | ❌ Không có | **TẠO MỚI** |
| Policy | ✅ Full | ❌ Không có | **TẠO MỚI** |

---

## 🎯 RECOMMENDED ACTIONS

### Phase 1: Core Business Logic (Iteration 1-3)
1. ✅ Tạo `Operator` model
2. ✅ Sửa `Route` model (thêm fields, relations)
3. ✅ Tạo `Booking` model với `Passenger` và `BookingSeat`
4. ✅ Tạo `Payment` model

### Phase 2: Route Details (Iteration 1-4)
5. ✅ Tạo `RouteAmenity`, `PickupPoint`, `DropoffPoint`, `RoutePolicy`

### Phase 3: Reviews & Advanced (PI 2)
6. Tạo `Review` model
7. Tạo `Notification` model

---

## 🚨 BREAKING CHANGES

1. **Route.userId → Route.operatorId**
   - Tách `User` và `Operator` thành 2 entities riêng
   - Bus operator ≠ Platform user

2. **Route structure mở rộng**
   - Thêm 10+ fields mới
   - Thêm 4 related tables

3. **Booking hoàn toàn mới**
   - Core business logic của platform
