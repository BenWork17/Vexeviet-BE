# 🔧 Architecture Explanation - API Gateway vs Direct Service Access

## 🎯 Tại sao chia port cho từng service?

### Kiến trúc Microservices

```
┌─────────────────────────────────────────────────────────┐
│  Client (Browser/Mobile/Postman)                        │
│  Chỉ cần biết 1 địa chỉ duy nhất: localhost:3000       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ ALL requests go here
                 ↓
┌─────────────────────────────────────────────────────────┐
│  🚪 API Gateway (Port 3000)                             │
│  - Single entry point                                   │
│  - Authentication check                                 │
│  - Rate limiting                                        │
│  - Logging                                              │
│  - Route requests to correct service                    │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
       │              │              │
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│   User   │   │  Route   │   │ Booking  │
│ Service  │   │ Service  │   │ Service  │
│  :3001   │   │  :3002   │   │  :3003   │
└──────────┘   └──────────┘   └──────────┘
```

## ✅ Lợi ích

### 1. **Single Entry Point**
- Client chỉ cần nhớ 1 địa chỉ: `http://localhost:3000`
- Không cần biết port của từng service
- Dễ deploy, dễ scale

### 2. **Security**
- Chỉ Gateway exposed ra internet
- Services bên trong không public trực tiếp
- Authentication/Authorization tập trung

### 3. **Load Balancing**
- Gateway có thể route đến nhiều instance của service
- Example: 3 User Service instances (3001, 3002, 3003) → Gateway pick 1

### 4. **Monitoring & Logging**
- Tất cả request đi qua Gateway → dễ track
- Rate limiting tập trung
- Analytics tập trung

## 🔀 Flow Request

### Qua Gateway (RECOMMENDED - Production)
```
Client → POST localhost:3000/api/v1/auth/register
  ↓
Gateway nhận request
  ↓
Gateway check: /api/v1/auth → route to User Service
  ↓
Gateway proxy → localhost:3001/api/v1/auth/register
  ↓
User Service xử lý
  ↓
Response → Gateway → Client
```

**Ưu điểm:**
- ✅ Có rate limiting
- ✅ Có logging
- ✅ Có authentication check (cho protected routes)
- ✅ Production-ready

### Direct to Service (ONLY for Development/Testing)
```
Client → POST localhost:3001/api/v1/auth/register
  ↓
User Service xử lý trực tiếp
  ↓
Response → Client
```

**Ưu điểm:**
- ✅ Nhanh hơn (no proxy overhead)
- ✅ Dễ debug (see logs directly)

**Nhược điểm:**
- ❌ Bypass security checks
- ❌ No rate limiting
- ❌ No centralized logging

## 🐛 Hiện tại - Vấn đề Timeout

### Nguyên nhân
API Gateway **proxy configuration SAI**, dẫn đến:

1. Request từ client → Gateway (OK)
2. Gateway proxy request → User Service (FAILED)
3. User Service không nhận được request đúng format
4. Gateway timeout sau 30s

### Giải pháp

**Option 1: Sửa Gateway proxy** ✅ (RECOMMENDED)
```typescript
// apps/api-gateway/src/index.ts
pathRewrite: {
  [`^${API_PREFIX}`]: '/api/v1',  // ⚠️ Wrong
}

// Should be:
pathRewrite: {
  // Remove /api/v1 prefix before proxying
  [`^/api/v1`]: '/api/v1',  // Keep it as-is
}
```

**Option 2: Tắt pathRewrite** ✅ (SIMPLEST)
```typescript
app.use(
  proxyPath,
  createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    // Remove pathRewrite completely
  })
);
```

## 📊 Port Assignment Strategy

| Service | Port | Accessed Via |
|---------|------|--------------|
| API Gateway | 3000 | ✅ Clients should use this |
| User Service | 3001 | ⚠️ Only for development |
| Route Service | 3002 | ⚠️ Only for development |
| Booking Service | 3003 | ⚠️ Only for development |
| Payment Service | 3004 | ⚠️ Only for development |

## 🎯 Kết luận

**Trong Development:**
- Có thể gọi trực tiếp service (port 3001, 3002, ...) để debug
- Nhưng nên dùng Gateway (port 3000) để test flow thật

**Trong Production:**
- Client CHỈ biết Gateway
- Services chạy trong private network
- Không thể access trực tiếp từ bên ngoài

---

**Next Step:** Fix Gateway proxy configuration để timeout issue resolved.
