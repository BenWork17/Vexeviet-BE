# API Testing Guide - VeXeViet Backend

> **Version:** Iteration 1-3 (Route Service & Search Service)  
> **Last Updated:** 2026-01-20  
> **For:** Frontend Integration & API Testing

## 🚀 Quick Start

### 1. Start Services

**Option 1: One Command (Recommended)**

```bash
# Windows
start-dev.bat

# Linux/Mac
./start-dev.sh

# Or using npm script
pnpm dev:services
```

This will start:
- Docker (MySQL, Redis)
- API Gateway on port **3000**
- User Service on port 3001 (internal)
- Route Service on port 3002 (internal)

**Option 2: Manual (Step by Step)**

```bash
# Terminal 1: Start Docker (MySQL, Redis)
pnpm docker:up

# Terminal 2: Start API Gateway (Port 3000)
pnpm --filter @vexeviet/api-gateway dev

# Terminal 3: Start User Service (Port 3001)
pnpm --filter @vexeviet/user-service dev

# Terminal 4: Start Route Service (Port 3002)
pnpm --filter @vexeviet/route-service dev
```

### 2. Verify Services

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **API Gateway** | **3000** | http://localhost:3000 | **Primary Endpoint** |
| User Service | 3001 | http://localhost:3001 | Internal |
| Route Service | 3002 | http://localhost:3002 | Internal |
| MySQL | 3306 | localhost:3306 | Required |
| Redis | 6379 | localhost:6379 | Required |

### 3. Base URL

**Always use API Gateway (Recommended):**
```
http://localhost:3000/api/v1
```

All examples in this document use port **3000** (API Gateway).

---

## 📋 API Endpoints

### 🔒 Authentication & User Service (Port 3001)

#### Health Check

```http
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-01-20T..."
}
```

### 1. Register User

```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "method": "email",
  "email": "test@example.com",
  "password": "Test1234",
  "firstName": "John",
  "lastName": "Doe",
  "agreeToTerms": true
}
```

**Fields Required:**
- `method` (string): "email" or "phone"
- `password` (string): Min 8 chars, must have uppercase, number
- `firstName` (string): User's first name
- `lastName` (string): User's last name
- `agreeToTerms` (boolean): Must be true

**Fields Optional:**
- `email` (string): Required if method = "email"
- `phone` (string): Required if method = "phone"

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "isEmailVerified": false,
      "status": "PENDING_VERIFICATION",
      "createdAt": "2026-01-20T..."
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "verificationRequired": true,
    "verificationMethod": "email"
  }
}
```

**Error Cases:**
- Email already exists → 400
- Invalid password format → 400
- Missing required fields → 400

---

### 2. Login

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test1234"
}
```

**Fields Required:**
- `email` (string): User's email address
- `password` (string): User's password

**Fields Optional:** None

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Cases:**
- Wrong password → 401
- User not found → 401

---

### 3. Get Profile (Protected)

```http
GET http://localhost:3000/api/v1/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Headers Required:**
- `Authorization` (string): Bearer token from login/register

**Fields Required:** None (GET request)

**Fields Optional:** None

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": null,
    "role": "CUSTOMER",
    "isEmailVerified": false,
    "isPhoneVerified": false,
    "status": "PENDING_VERIFICATION",
    "createdAt": "2026-01-20T...",
    "updatedAt": "2026-01-20T..."
  }
}
```

**Error Cases:**
- No token → 401
- Invalid token → 401
- Expired token → 401

---

### 4. Update Profile (Protected)

```http
PATCH http://localhost:3000/api/v1/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+84901234567"
}
```

**Headers Required:**
- `Authorization` (string): Bearer token

**Fields Required:** None (at least one field must be provided)

**Fields Optional:**
- `firstName` (string): Update first name
- `lastName` (string): Update last name
- `phone` (string): Update phone number (must be unique)

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+84901234567",
    ...
  }
}
```

---

### 5. Refresh Token

```http
POST http://localhost:3000/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Fields Required:**
- `refreshToken` (string): Valid refresh token from login/register

**Fields Optional:** None

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN",
    "refreshToken": "NEW_REFRESH_TOKEN"
  }
}
```

**Note:** Old refresh token is invalidated (token rotation)

---

### 6. Logout

```http
POST http://localhost:3000/api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

**Fields Required:**
- `refreshToken` (string): Refresh token to invalidate

**Fields Optional:** None

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 7. Delete Account (Protected)

```http
DELETE http://localhost:3000/api/v1/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Headers Required:**
- `Authorization` (string): Bearer token

**Fields Required:** None (DELETE request)

**Fields Optional:** None

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 🧪 Testing Flow

### Happy Path

1. **Register** → Get tokens
2. **Login** → Get new tokens
3. **Get Profile** → View user data
4. **Update Profile** → Change data
5. **Refresh Token** → Get new tokens
6. **Logout** → Invalidate token

### Error Cases

1. **Register with duplicate email** → 400
2. **Login with wrong password** → 401
3. **Access protected route without token** → 401
4. **Use expired token** → 401
5. **Use invalidated refresh token** → 401

---

## 🔧 Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "VeXeViet API - Iteration 1-2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "http://localhost:3000/api/v1/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"method\": \"email\",\n  \"email\": \"test@example.com\",\n  \"password\": \"Test1234\",\n  \"firstName\": \"John\",\n  \"lastName\": \"Doe\",\n  \"agreeToTerms\": true\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "http://localhost:3000/api/v1/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test1234\"\n}"
            }
          }
        }
      ]
    },
    {
      "name": "User",
      "item": [
        {
          "name": "Get Profile",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
            "url": "http://localhost:3000/api/v1/users/profile"
          }
        }
      ]
    }
  ]
}
```

---

## 📊 Verification Checklist

- [ ] ✅ Health check returns 200
- [ ] ✅ Register creates user in database
- [ ] ✅ Login returns valid JWT tokens
- [ ] ✅ Access token expires after 15 minutes
- [ ] ✅ Refresh token works and rotates
- [ ] ✅ Protected routes require valid token
- [ ] ✅ Logout invalidates refresh token
- [ ] ✅ Duplicate email registration fails
- [ ] ✅ Wrong password login fails
- [ ] ✅ Profile update works
- [ ] ✅ Account deletion removes user

---

## 🐛 Common Issues

**Issue:** "Cannot connect to MySQL"
```bash
# Check if MySQL is running
docker ps | findstr mysql

# Restart MySQL
pnpm docker:up
```

**Issue:** "Port 3000 already in use"
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Issue:** "JWT token invalid"
- Check token format (should be `Bearer <token>`)
- Token might be expired (15 min lifetime)
- Use refresh token to get new access token

---

## 📝 Next Steps (Iteration 1-3)

- Route Service CRUD
- Search Service
- Redis cache integration
- Unit tests with Jest

---

## 🚗 Route Service & Search API (Port 3002)

### Health Check

```http
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "route-service",
  "timestamp": "2026-01-20T...",
  "uptime": 123.45
}
```

---

### 1. List Routes (Public)

```http
GET http://localhost:3000/api/v1/routes?page=1&limit=10
```

**Fields Required:** None

**Query Parameters (Optional):**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| origin | string | Filter by origin city |
| destination | string | Filter by destination city |
| busType | enum | STANDARD, VIP, LIMOUSINE, SLEEPER |
| minPrice | number | Minimum price |
| maxPrice | number | Maximum price |
| sortBy | string | price, departureTime, duration, createdAt |
| sortOrder | string | asc, desc (default: asc) |

**Example:**
```http
GET http://localhost:3000/api/v1/routes?origin=Ho Chi Minh&destination=Da Lat&busType=LIMOUSINE&sortBy=price&sortOrder=asc&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "HCM - Da Lat Express",
      "origin": "Ho Chi Minh City",
      "destination": "Da Lat",
      "departureTime": "2026-02-15T08:00:00Z",
      "arrivalTime": "2026-02-15T14:00:00Z",
      "duration": 360,
      "price": "350000.00",
      "busType": "LIMOUSINE",
      "totalSeats": 45,
      "availableSeats": 45,
      "status": "ACTIVE",
      "operatorId": "operator-uuid",
      "amenities": ["WiFi", "AC", "Water"],
      "createdAt": "2026-01-20T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 2. Get Route by ID (Public)

```http
GET http://localhost:3000/api/v1/routes/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "HCM - Da Lat Express",
    "description": "Luxury bus with reclining seats",
    "origin": "Ho Chi Minh City",
    "destination": "Da Lat",
    "departureLocation": "Ben Xe Mien Dong",
    "arrivalLocation": "Ben Xe Da Lat",
    "distance": 308.5,
    "departureTime": "2026-02-15T08:00:00Z",
    "arrivalTime": "2026-02-15T14:00:00Z",
    "duration": 360,
    "busType": "LIMOUSINE",
    "licensePlate": "51B-12345",
    "totalSeats": 45,
    "availableSeats": 42,
    "price": "350000.00",
    "amenities": ["WiFi", "AC", "Water", "USB Charging"],
    "pickupPoints": [
      { "location": "Ben Xe Mien Dong", "time": "08:00" },
      { "location": "Thu Duc", "time": "08:30" }
    ],
    "dropoffPoints": [
      { "location": "Ben Xe Da Lat", "time": "14:00" }
    ],
    "policies": {
      "cancellation": "Free cancellation up to 24h before",
      "luggage": "20kg per passenger"
    },
    "images": [
      "https://example.com/bus1.jpg"
    ],
    "status": "ACTIVE",
    "operatorId": "operator-uuid",
    "createdAt": "2026-01-20T...",
    "updatedAt": "2026-01-20T..."
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Route not found",
  "code": "ROUTE_NOT_FOUND"
}
```

---

### 3. Create Route (Operator/Admin Only)

```http
POST http://localhost:3000/api/v1/routes
Authorization: Bearer <operator-or-admin-token>
Content-Type: application/json

{
  "name": "HCM - Da Lat Express",
  "description": "Luxury limousine service",
  "origin": "Ho Chi Minh City",
  "destination": "Da Lat",
  "departureLocation": "Ben Xe Mien Dong",
  "arrivalLocation": "Ben Xe Da Lat",
  "distance": 308.5,
  "departureTime": "2026-02-15T08:00:00Z",
  "arrivalTime": "2026-02-15T14:00:00Z",
  "duration": 360,
  "busType": "LIMOUSINE",
  "licensePlate": "51B-12345",
  "totalSeats": 45,
  "price": 350000,
  "amenities": ["WiFi", "AC", "Water"],
  "pickupPoints": [
    { "location": "Ben Xe Mien Dong", "time": "08:00" }
  ],
  "dropoffPoints": [
    { "location": "Ben Xe Da Lat", "time": "14:00" }
  ]
}
```

**Required Fields:**
- name, origin, destination, departureTime, arrivalTime, duration, price

**Response (201):**
```json
{
  "success": true,
  "data": { /* Created route object */ }
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized (no token)
- 403: Forbidden (not Operator/Admin)

---

### 4. Update Route (Operator/Admin Only)

```http
PUT http://localhost:3000/api/v1/routes/:id
Authorization: Bearer <operator-or-admin-token>
Content-Type: application/json

{
  "price": 380000,
  "availableSeats": 40
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* Updated route object */ }
}
```

**Errors:**
- 404: Route not found
- 403: Not authorized to update this route

---

### 5. Delete Route (Soft Delete - Operator/Admin Only)

```http
DELETE http://localhost:3000/api/v1/routes/:id
Authorization: Bearer <operator-or-admin-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Route deleted successfully"
}
```

**Note:** Soft delete - sets `status=DELETED` and `deletedAt` timestamp

---

### 6. Get My Routes (Operator Only)

```http
GET http://localhost:3000/api/v1/routes/my/routes
Authorization: Bearer <operator-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [ /* Array of routes owned by operator */ ]
}
```

---

### 🔍 Search Service

### 7. Search Routes (Public)

```http
POST http://localhost:3000/api/v1/search/routes
Content-Type: application/json

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

**Required Fields:**
- origin (string)
- destination (string)

**Optional Fields:**
| Field | Type | Description |
|-------|------|-------------|
| departureDate | string | Format: YYYY-MM-DD |
| passengers | number | Number of passengers |
| busType | enum | STANDARD, VIP, LIMOUSINE, SLEEPER |
| minPrice | number | Minimum price filter |
| maxPrice | number | Maximum price filter |
| sortBy | string | price, departureTime, duration |
| sortOrder | string | asc, desc |
| page | number | Page number (default: 1) |
| pageSize | number | Results per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "uuid",
        "name": "HCM - Da Lat Express",
        "origin": "Ho Chi Minh City",
        "destination": "Da Lat",
        "departureTime": "2026-02-15T08:00:00Z",
        "arrivalTime": "2026-02-15T14:00:00Z",
        "price": "350000.00",
        "busType": "LIMOUSINE",
        "availableSeats": 42,
        "duration": 360
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 15,
      "totalPages": 1
    },
    "cached": false
  }
}
```

**Errors:**
- 400: Missing required fields (origin, destination)

**Note:** Results are cached in Redis for 5 minutes

---

### 8. Get Popular Routes

```http
GET http://localhost:3000/api/v1/search/popular?limit=10
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 10 | Number of routes to return |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "HCM - Da Lat Express",
      "origin": "Ho Chi Minh City",
      "destination": "Da Lat",
      "price": "350000.00",
      "busType": "LIMOUSINE"
    }
  ],
  "cached": true
}
```

**Note:** Cached for 10 minutes

---

### 9. Get Autocomplete Suggestions

```http
GET http://localhost:3000/api/v1/search/suggestions?field=origin&query=Ho
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| field | string | Yes | origin or destination |
| query | string | Yes | Search query (min 2 chars) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    "Ho Chi Minh City",
    "Hoi An"
  ]
}
```

**Errors:**
- 400: Invalid field or query too short

---

## 🧪 Testing Scenarios

### Scenario 1: Customer Books a Bus Ticket (End-to-End)

**Step 1: Register new customer**
```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "method": "email",
  "email": "customer@example.com",
  "password": "Customer@123",
  "firstName": "Nguyen",
  "lastName": "Van A",
  "agreeToTerms": true
}
```
**Expected:** 201 Created, receive `accessToken` and `refreshToken`

---

**Step 2: Search available routes**
```http
POST http://localhost:3000/api/v1/search/routes
Content-Type: application/json

{
  "origin": "Ho Chi Minh City",
  "destination": "Da Lat",
  "departureDate": "2026-02-15",
  "busType": "LIMOUSINE",
  "sortBy": "price"
}
```
**Expected:** 200 OK, list of routes matching criteria

---

**Step 3: Get route details**
```http
GET http://localhost:3000/api/v1/routes/{route_id}
```
**Expected:** 200 OK, full route information with amenities, pickup points, etc.

---

**Step 4: Create booking** (Future: Booking Service - Iteration 1-4)
```http
POST http://localhost:3000/api/v1/bookings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "routeId": "{route_id}",
  "seatNumbers": ["A1", "A2"],
  "passengerInfo": [
    {
      "name": "Nguyen Van A",
      "phone": "+84901234567",
      "email": "customer@example.com"
    }
  ]
}
```

---

### Scenario 2: Operator Manages Routes (Full Workflow)

**Step 1: Register as Operator**
```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "method": "email",
  "email": "operator@buscompany.com",
  "password": "Operator@123",
  "firstName": "Tran",
  "lastName": "Van B",
  "role": "OPERATOR",
  "agreeToTerms": true
}
```
**Expected:** 201 Created

---

**Step 2: Login to get access token**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "operator@buscompany.com",
  "password": "Operator@123"
}
```
**Expected:** 200 OK, save `accessToken` for next requests

---

**Step 3: Create new route**
```http
POST http://localhost:3000/api/v1/routes
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "HCM - Vung Tau Express",
  "origin": "Ho Chi Minh City",
  "destination": "Vung Tau",
  "departureTime": "2026-02-20T06:00:00Z",
  "arrivalTime": "2026-02-20T08:30:00Z",
  "duration": 150,
  "price": 120000,
  "busType": "STANDARD",
  "totalSeats": 45
}
```
**Expected:** 201 Created, route object with generated ID

---

**Step 4: View my routes**
```http
GET http://localhost:3000/api/v1/routes/my/routes
Authorization: Bearer {accessToken}
```
**Expected:** 200 OK, list of routes owned by operator

---

**Step 5: Update route (change price)**
```http
PUT http://localhost:3000/api/v1/routes/{route_id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "price": 150000,
  "availableSeats": 40
}
```
**Expected:** 200 OK, updated route object

---

**Step 6: Delete route (soft delete)**
```http
DELETE http://localhost:3000/api/v1/routes/{route_id}
Authorization: Bearer {accessToken}
```
**Expected:** 200 OK, route marked as DELETED

---

### Scenario 3: Frontend Search Flow (Autocomplete + Search)

**Step 1: User types "Ho" in origin field**
```http
GET http://localhost:3000/api/v1/search/suggestions?field=origin&query=Ho
```
**Expected:** 200 OK
```json
{
  "success": true,
  "data": ["Ho Chi Minh City", "Hoi An", "Hoa Binh"]
}
```

---

**Step 2: User types "Da" in destination field**
```http
GET http://localhost:3000/api/v1/search/suggestions?field=destination&query=Da
```
**Expected:** 200 OK
```json
{
  "success": true,
  "data": ["Da Lat", "Da Nang"]
}
```

---

**Step 3: User selects "Ho Chi Minh City" → "Da Lat" and clicks search**
```http
POST http://localhost:3000/api/v1/search/routes
Content-Type: application/json

{
  "origin": "Ho Chi Minh City",
  "destination": "Da Lat",
  "departureDate": "2026-02-15"
}
```
**Expected:** 200 OK, list of routes with pagination

---

**Step 4: Display popular routes on homepage**
```http
GET http://localhost:3000/api/v1/search/popular?limit=5
```
**Expected:** 200 OK, top 5 popular routes (cached)

---

### Scenario 4: Admin Manages System

**Step 1: Login as Admin** (seeded account)
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@vexeviet.com",
  "password": "Admin@123456"
}
```
**Expected:** 200 OK, admin access token

---

**Step 2: View all routes (admin can see all)**
```http
GET http://localhost:3000/api/v1/routes?limit=50
Authorization: Bearer {admin_accessToken}
```
**Expected:** 200 OK, all routes from all operators

---

**Step 3: Update any operator's route**
```http
PUT http://localhost:3000/api/v1/routes/{any_route_id}
Authorization: Bearer {admin_accessToken}
Content-Type: application/json

{
  "status": "INACTIVE"
}
```
**Expected:** 200 OK (admin can edit any route)

---

**Step 4: Delete any route**
```http
DELETE http://localhost:3000/api/v1/routes/{any_route_id}
Authorization: Bearer {admin_accessToken}
```
**Expected:** 200 OK (admin can delete any route)

---

### Scenario 5: Token Refresh Flow

**Step 1: Login**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "Customer@123"
}
```
**Expected:** Save both `accessToken` (expires in 15 min) and `refreshToken` (expires in 7 days)

---

**Step 2: Use access token until it expires**
```http
GET http://localhost:3000/api/v1/users/profile
Authorization: Bearer {accessToken}
```
**After 15 min:** 401 Unauthorized (token expired)

---

**Step 3: Refresh token**
```http
POST http://localhost:3000/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refreshToken}"
}
```
**Expected:** 200 OK, new `accessToken` and new `refreshToken` (old refresh token invalidated)

---

**Step 4: Continue using new access token**
```http
GET http://localhost:3000/api/v1/users/profile
Authorization: Bearer {new_accessToken}
```
**Expected:** 200 OK

---

### Scenario 6: Error Handling

**Test 1: Invalid credentials**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "wrong@example.com",
  "password": "WrongPassword"
}
```
**Expected:** 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

**Test 2: Create route without authentication**
```http
POST http://localhost:3000/api/v1/routes
Content-Type: application/json

{
  "name": "Test Route",
  "origin": "HCM"
}
```
**Expected:** 401 Unauthorized

---

**Test 3: Customer tries to create route (role check)**
```http
POST http://localhost:3000/api/v1/routes
Authorization: Bearer {customer_accessToken}
Content-Type: application/json

{
  "name": "Test Route",
  "origin": "HCM",
  "destination": "Da Lat",
  "departureTime": "2026-02-15T08:00:00Z",
  "arrivalTime": "2026-02-15T14:00:00Z",
  "duration": 360,
  "price": 300000
}
```
**Expected:** 403 Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```

---

**Test 4: Missing required fields**
```http
POST http://localhost:3000/api/v1/search/routes
Content-Type: application/json

{
  "origin": "Ho Chi Minh City"
}
```
**Expected:** 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "destination": "Destination is required"
  }
}
```

---

**Test 5: Route not found**
```http
GET http://localhost:3000/api/v1/routes/invalid-uuid-123
```
**Expected:** 404 Not Found
```json
{
  "success": false,
  "error": "Route not found",
  "code": "ROUTE_NOT_FOUND"
}
```

---

## 🔧 Postman Collection (Updated for Iteration 1-3)

### Import JSON

```json
{
  "info": {
    "name": "VeXeViet API - Complete (v1.3)",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3002"
    },
    {
      "key": "userServiceUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "accessToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Route Service",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/health"
          }
        },
        {
          "name": "List Routes",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/routes?page=1&limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "routes"],
              "query": [
                { "key": "page", "value": "1" },
                { "key": "limit", "value": "10" },
                { "key": "origin", "value": "Ho Chi Minh", "disabled": true },
                { "key": "busType", "value": "LIMOUSINE", "disabled": true }
              ]
            }
          }
        },
        {
          "name": "Get Route by ID",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/v1/routes/:id",
            "variable": [
              { "key": "id", "value": "your-route-id" }
            ]
          }
        },
        {
          "name": "Create Route (Operator)",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{accessToken}}" }
            ],
            "url": "{{baseUrl}}/api/v1/routes",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"HCM - Da Lat Express\",\n  \"origin\": \"Ho Chi Minh City\",\n  \"destination\": \"Da Lat\",\n  \"departureTime\": \"2026-02-15T08:00:00Z\",\n  \"arrivalTime\": \"2026-02-15T14:00:00Z\",\n  \"duration\": 360,\n  \"price\": 350000,\n  \"busType\": \"LIMOUSINE\",\n  \"totalSeats\": 45\n}"
            }
          }
        },
        {
          "name": "Update Route (Operator)",
          "request": {
            "method": "PUT",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{accessToken}}" }
            ],
            "url": "{{baseUrl}}/api/v1/routes/:id",
            "variable": [
              { "key": "id", "value": "your-route-id" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"price\": 380000,\n  \"availableSeats\": 40\n}"
            }
          }
        },
        {
          "name": "Delete Route (Operator)",
          "request": {
            "method": "DELETE",
            "header": [
              { "key": "Authorization", "value": "Bearer {{accessToken}}" }
            ],
            "url": "{{baseUrl}}/api/v1/routes/:id",
            "variable": [
              { "key": "id", "value": "your-route-id" }
            ]
          }
        },
        {
          "name": "Get My Routes (Operator)",
          "request": {
            "method": "GET",
            "header": [
              { "key": "Authorization", "value": "Bearer {{accessToken}}" }
            ],
            "url": "{{baseUrl}}/api/v1/routes/my/routes"
          }
        }
      ]
    },
    {
      "name": "Search Service",
      "item": [
        {
          "name": "Search Routes",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "url": "{{baseUrl}}/api/v1/search/routes",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"origin\": \"Ho Chi Minh City\",\n  \"destination\": \"Da Lat\",\n  \"departureDate\": \"2026-02-15\",\n  \"busType\": \"LIMOUSINE\",\n  \"sortBy\": \"price\",\n  \"sortOrder\": \"asc\",\n  \"page\": 1,\n  \"pageSize\": 20\n}"
            }
          }
        },
        {
          "name": "Get Popular Routes",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/search/popular?limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "search", "popular"],
              "query": [
                { "key": "limit", "value": "10" }
              ]
            }
          }
        },
        {
          "name": "Get Suggestions (Origin)",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/search/suggestions?field=origin&query=Ho",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "search", "suggestions"],
              "query": [
                { "key": "field", "value": "origin" },
                { "key": "query", "value": "Ho" }
              ]
            }
          }
        },
        {
          "name": "Get Suggestions (Destination)",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/search/suggestions?field=destination&query=Da",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "search", "suggestions"],
              "query": [
                { "key": "field", "value": "destination" },
                { "key": "query", "value": "Da" }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "User Service (Auth)",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "url": "{{userServiceUrl}}/api/v1/auth/register",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"method\": \"email\",\n  \"email\": \"operator@example.com\",\n  \"password\": \"Test1234\",\n  \"firstName\": \"John\",\n  \"lastName\": \"Operator\",\n  \"role\": \"OPERATOR\",\n  \"agreeToTerms\": true\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "url": "{{userServiceUrl}}/api/v1/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"operator@example.com\",\n  \"password\": \"Test1234\"\n}"
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const response = pm.response.json();",
                  "if (response.data && response.data.accessToken) {",
                  "  pm.collectionVariables.set('accessToken', response.data.accessToken);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Variables Setup

1. Set `baseUrl` = `http://localhost:3002`
2. Set `userServiceUrl` = `http://localhost:3001`
3. After login, `accessToken` is auto-saved

---

## 📊 Response Format Standards

### Success Response

```json
{
  "success": true,
  "data": { /* Response data */ }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* Optional error details */ }
}
```

### Pagination Format

```json
{
  "success": true,
  "data": [ /* Array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 🔐 Authentication

### Token Types

1. **Access Token** - JWT, expires in 15 minutes
2. **Refresh Token** - JWT, expires in 7 days

### Using Tokens in Requests

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Roles & Permissions

| Role | Permissions |
|------|-------------|
| CUSTOMER | Search routes, book tickets |
| OPERATOR | Manage own routes, view bookings |
| ADMIN | Manage all routes, users, bookings |

---

## 🐛 Common Errors

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "origin": "Origin is required",
    "price": "Price must be a positive number"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "INVALID_TOKEN"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Route not found",
  "code": "ROUTE_NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## 💡 Best Practices for Frontend Integration

### 1. Environment Variables

```javascript
// .env.development
VITE_USER_SERVICE_URL=http://localhost:3001
VITE_ROUTE_SERVICE_URL=http://localhost:3002
VITE_API_GATEWAY_URL=http://localhost:3000

// .env.production
VITE_API_GATEWAY_URL=https://api.vexeviet.com
```

### 2. API Client Setup (Example)

```typescript
// api/client.ts
const API_BASE = import.meta.env.VITE_ROUTE_SERVICE_URL;

export const routeApi = {
  searchRoutes: async (params: SearchParams) => {
    const response = await fetch(`${API_BASE}/api/v1/search/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  },
  
  getRouteById: async (id: string) => {
    const response = await fetch(`${API_BASE}/api/v1/routes/${id}`);
    return response.json();
  }
};
```

### 3. Error Handling

```typescript
try {
  const result = await routeApi.searchRoutes(params);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  console.error('Search failed:', error);
  // Show error to user
}
```

### 4. Caching Strategy

- Search results are cached server-side (Redis, 5 min)
- Frontend can cache popular routes (10 min)
- Use SWR or React Query for client-side caching

### 5. Debounce Autocomplete

```typescript
const debouncedSearch = debounce(async (query: string) => {
  if (query.length < 2) return;
  const suggestions = await routeApi.getSuggestions('origin', query);
  setSuggestions(suggestions.data);
}, 300);
```

---

---

**Status:** ✅ Iteration 1-3 Complete (Route Service & Search Service)  
**Last Updated:** 2026-01-20  
**Next Iteration:** Booking Service (Week 7-8)
