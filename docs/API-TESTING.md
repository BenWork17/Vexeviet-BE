# API Testing Guide - Iteration 1-2

## 🚀 Quick Start

### 1. Start Services

```bash
# Terminal 1: Start Docker
pnpm docker:up

# Terminal 2: Start API Gateway
pnpm --filter @vexeviet/api-gateway dev

# Terminal 3: Start User Service
pnpm --filter @vexeviet/user-service dev
```

### 2. Verify Services

- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- MySQL: localhost:3306
- Redis: localhost:6379

---

## 📋 API Endpoints (Iteration 1-2)

### Health Check

```http
GET http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-20T..."
}
```

---

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

**Status:** ✅ Iteration 1-2 Complete  
**Last Updated:** 2026-01-20
