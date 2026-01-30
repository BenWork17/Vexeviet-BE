# VeXeViet API Documentation

## Overview

This directory contains API documentation for the VeXeViet Backend services.

## Available Documentation

### 1. Swagger UI (Interactive)
- **URL:** http://localhost:3000/api/docs
- **Description:** Interactive API documentation with try-it-out functionality

### 2. OpenAPI Specification (JSON)
- **URL:** http://localhost:3000/api/docs.json
- **Description:** Raw OpenAPI 3.0 specification

### 3. Postman Collection
- **Location:** `tests/integration/VeXeViet-API.postman_collection.json`
- **Environment:** `tests/integration/VeXeViet-API.postman_environment.json`
- **Import:** Open Postman → Import → Select files

## API Endpoints Summary

### Health Checks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API Gateway health |

### Authentication (`/api/v1/users/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login | No |
| POST | `/refresh` | Refresh token | No |
| POST | `/logout` | Logout | Yes |
| POST | `/verify-otp` | Verify OTP | No |
| POST | `/resend-otp` | Resend OTP | No |

### User Profile (`/api/v1/users`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profile` | Get profile | Yes |
| PATCH | `/profile` | Update profile | Yes |
| DELETE | `/profile` | Delete account | Yes |

### Bus Templates (`/api/v1/users/bus-templates`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all templates | No |
| GET | `/:id` | Get template by ID | No |

### Routes (`/api/v1/routes`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all routes | No |
| GET | `/:id` | Get route by ID | No |
| POST | `/` | Create route | Operator |
| PUT | `/:id` | Update route | Operator |
| DELETE | `/:id` | Delete route | Operator |

### Search (`/api/v1/routes/search`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/routes` | Search routes | No |
| GET | `/popular` | Get popular routes | No |
| GET | `/suggestions` | Autocomplete | No |

### Seats (`/api/v1/booking/seats`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/availability` | Get seat availability | No |
| POST | `/check` | Check seats | No |
| POST | `/hold` | Hold seats | Yes |
| POST | `/release` | Release seats | Yes |
| POST | `/validate` | Validate seats | No |

### Bookings (`/api/v1/booking/bookings`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create booking | Yes |
| GET | `/my` | Get my bookings | Yes |
| GET | `/:id` | Get booking by ID | Yes |
| GET | `/code/:code` | Get by booking code | No |
| POST | `/:id/cancel` | Cancel booking | Yes |
| POST | `/:id/confirm` | Confirm (internal) | Internal |

## Authentication

### JWT Bearer Token
All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Flow
1. **Register/Login** → Returns `accessToken` (15 min) + `refreshToken` (7 days)
2. **Use accessToken** for API calls
3. **Refresh** when token expires
4. **Logout** to invalidate tokens

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., seats already booked) |
| 500 | Internal Server Error |

## Rate Limiting

- **Default:** 100 requests per minute
- **Auth endpoints:** 10 requests per minute

## Quick Start

### 1. Start Services
```bash
pnpm docker:up
pnpm dev:services
```

### 2. Access Documentation
Open http://localhost:3000/api/docs

### 3. Test with Postman
1. Import `tests/integration/VeXeViet-API.postman_collection.json`
2. Import `tests/integration/VeXeViet-API.postman_environment.json`
3. Run "Auth > Register User" to get tokens
4. Other requests will use saved tokens automatically

## Versioning

API version is included in URL path: `/api/v1/...`

Future versions will be `/api/v2/...` with deprecation notices.
