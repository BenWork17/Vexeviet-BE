# 🎫 Booking & Payment - Frontend Integration Guide

> **Base URL:** `http://localhost:3000/api/v1`  
> **Swagger UI:** `http://localhost:3000/api/docs`  
> **Last Updated:** 2026-02-26

---

## 📋 Tổng quan Flow

```
Tìm tuyến → Chọn ghế → Tạo booking → Thanh toán → Kết quả
```

---

## 🔐 Authentication (Bắt buộc)

Tất cả API booking đều cần JWT token. Thêm header:

```
Authorization: Bearer <accessToken>
```

### Lấy token

```
POST /api/v1/auth/login
```

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** `data.accessToken` → lưu vào localStorage/cookie

---

## 🚌 Flow chi tiết (7 bước)

### Bước 1: Tìm tuyến xe

```
POST /api/v1/search/routes
```

```json
{
  "fromCity": "Huế - Thừa Thiên Huế",
  "toCity": "Đồng Hới - Quảng Bình",
  "departureDate": "2026-03-01"
}
```

**Response:** Danh sách routes → User chọn 1 route → lưu `routeId`

---

### Bước 2: Xem sơ đồ ghế

```
GET /api/v1/seats/availability?routeId={routeId}&departureDate=2026-03-01
```

**Response:**

```json
{
  "success": true,
  "data": {
    "routeId": "0010129d-...",
    "totalSeats": 34,
    "availableSeats": 30,
    "seats": [
      {
        "seatNumber": "1A",
        "seatLabel": "1A",
        "row": 1,
        "column": "A",
        "floor": 1,
        "seatType": "VIP",
        "position": "WINDOW",
        "status": "AVAILABLE",    // ← User có thể chọn
        "isSelectable": true,
        "finalPrice": 150000
      },
      {
        "seatNumber": "1B",
        "status": "HELD",         // ← Đang bị giữ, không chọn được
        "isSelectable": false
      },
      {
        "seatNumber": "2A",
        "status": "BOOKED",       // ← Đã đặt, không chọn được
        "isSelectable": false
      }
    ]
  }
}
```

**FE render:** Hiển thị sơ đồ ghế theo `floor`, `row`, `column`. Màu theo `status`:
- 🟢 `AVAILABLE` → xanh, click được
- 🟡 `HELD` → vàng, không click được
- 🔴 `BOOKED` → đỏ, không click được
- ⚫ `BLOCKED` → xám, ghế hỏng

---

### Bước 3: (Tùy chọn) Giữ ghế tạm thời

> **Khuyến nghị gọi API này** khi user chọn ghế, trước khi vào form điền thông tin. Ghế sẽ được giữ 15 phút, tránh người khác đặt trùng.

```
POST /api/v1/seats/hold
Authorization: Bearer <token>
```

```json
{
  "routeId": "0010129d-59bc-4341-9554-00bb5a87be59",
  "departureDate": "2026-03-01",
  "seats": ["1A", "2A"],
  "ttlSeconds": 900
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "holdId": "abc123-...",
    "seats": ["1A", "2A"],
    "expiresAt": "2026-03-01T08:15:00.000Z"
  }
}
```

> ⚠️ Lưu `holdId` để release ghế nếu user thoát trang.  
> ⚠️ Hiển thị countdown 15 phút cho user biết thời gian giữ ghế.

**Nếu user thoát trang / hủy chọn ghế:**

```
POST /api/v1/seats/release
Authorization: Bearer <token>
```

```json
{
  "holdId": "abc123-..."
}
```

---

### Bước 4: Tạo Booking

> User đã điền xong thông tin hành khách → Gọi API tạo booking.

```
POST /api/v1/bookings
Authorization: Bearer <token>
```

```json
{
  "routeId": "0010129d-59bc-4341-9554-00bb5a87be59",
  "departureDate": "2026-03-01",
  "seats": ["1A", "2A"],
  "passengers": [
    {
      "firstName": "Van A",
      "lastName": "Nguyen",
      "seatNumber": "1A",
      "idNumber": "079123456789",
      "dateOfBirth": "1990-01-15"
    },
    {
      "firstName": "Thi B",
      "lastName": "Tran",
      "seatNumber": "2A",
      "idNumber": "079987654321",
      "dateOfBirth": "1992-05-20"
    }
  ],
  "pickupPointId": "p1",
  "dropoffPointId": "d1",
  "contactInfo": {
    "email": "user@example.com",
    "phone": "0901234567"
  },
  "idempotencyKey": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "notes": ""
}
```

> ⚠️ **idempotencyKey**: Tạo UUID mới mỗi lần user nhấn "Đặt vé". Dùng `crypto.randomUUID()` hoặc `uuid()`.  
> ⚠️ **Số passengers PHẢI BẰNG số seats**, không thì sẽ bị lỗi 409.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "bookingId": "d53f5375-7220-4311-b93b-ebb13705d8ed",
    "bookingCode": "VXVR7Q088T",
    "status": "PENDING",
    "route": {
      "id": "0010129d-...",
      "name": "Huế - Đồng Hới (18:00)",
      "origin": "Huế - Thừa Thiên Huế",
      "destination": "Đồng Hới - Quảng Bình",
      "departureTime": "2026-03-01T11:00:00.000Z",
      "arrivalTime": "2026-03-01T14:00:00.000Z",
      "busType": "VIP",
      "operatorName": "Phương Trang"
    },
    "seats": ["1A", "2A"],
    "totalPrice": {
      "amount": 315000,
      "currency": "VND",
      "breakdown": {
        "tickets": 300000,
        "serviceFee": 15000,
        "total": 315000
      }
    },
    "paymentDeadline": "2026-02-26T07:47:46.939Z",
    "createdAt": "2026-02-26T07:32:46.994Z"
  }
}
```

**Lưu lại:**
- `bookingId` → dùng cho bước thanh toán
- `totalPrice.amount` → số tiền cần thanh toán
- `paymentDeadline` → hiển thị countdown (15 phút)
- `bookingCode` → hiển thị cho user (mã tra cứu)

---

### Bước 5: Tạo Payment (chuyển sang VNPay)

```
POST /api/v1/payments
```

```json
{
  "bookingId": "d53f5375-7220-4311-b93b-ebb13705d8ed",
  "amount": 315000,
  "method": "VNPAY",
  "language": "vn"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "paymentId": "3630fc14-...",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...",
    "transactionId": "VXV177069...",
    "expiredAt": "2026-02-26T04:09:59.484Z"
  }
}
```

**FE xử lý:**

```javascript
// Redirect trình duyệt đến VNPay
window.location.href = data.paymentUrl;
```

> ⚠️ **KHÔNG mở trong iframe** - VNPay không cho phép.  
> ⚠️ User sẽ chọn ngân hàng và thanh toán trên trang VNPay.

---

### Bước 6: VNPay redirect về FE

Sau khi thanh toán xong (thành công hoặc thất bại), VNPay redirect về:

```
→ Backend: /api/v1/webhooks/vnpay/return?vnp_...
→ Backend verify chữ ký
→ Backend redirect (302) về FE: http://localhost:8081/payment/result?...
```

**URL FE nhận được:**

```
http://localhost:8081/payment/result?success=true&status=COMPLETED&paymentId=VXV177...&transactionId=15430815&bankCode=NCB&message=Giao+dịch+thành+công&responseCode=00
```

**Query params:**

| Param | Giá trị | Ý nghĩa |
|-------|---------|---------|
| `success` | `true` / `false` | Thanh toán thành công hay không |
| `status` | `COMPLETED` / `FAILED` / `CANCELLED` | Trạng thái chi tiết |
| `paymentId` | `VXV177...` | Mã giao dịch (transaction ref) |
| `transactionId` | `15430815` | Mã giao dịch VNPay |
| `bankCode` | `NCB` | Ngân hàng thanh toán |
| `message` | `Giao dịch thành công` | Thông báo tiếng Việt |
| `responseCode` | `00` | Mã response VNPay (`00` = thành công) |
| `error` | (khi fail) | Thông báo lỗi |

**FE parse và hiển thị:**

```javascript
// Trong trang /payment/result
const params = new URLSearchParams(window.location.search);

const isSuccess = params.get('success') === 'true';
const status = params.get('status');
const message = params.get('message');
const paymentId = params.get('paymentId');
const bankCode = params.get('bankCode');

if (isSuccess) {
  // ✅ Hiển thị "Thanh toán thành công"
  // Hiển thị: mã giao dịch, ngân hàng, thông báo
} else {
  // ❌ Hiển thị "Thanh toán thất bại"  
  // Hiển thị: lý do lỗi, nút "Thử lại"
}
```

---

### Bước 7: (Tùy chọn) Tra cứu booking

**Theo mã booking (không cần login):**

```
GET /api/v1/bookings/code/VXVR7Q088T
```

**Theo booking ID (cần login):**

```
GET /api/v1/bookings/{bookingId}
Authorization: Bearer <token>
```

**Xem tất cả booking của user:**

```
GET /api/v1/bookings/my?status=PENDING&page=1&limit=20
Authorization: Bearer <token>
```

**Hủy booking:**

```
POST /api/v1/bookings/{bookingId}/cancel
Authorization: Bearer <token>
```

```json
{
  "reason": "Thay đổi lịch trình"
}
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BOOKING & PAYMENT FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ① POST /search/routes                                          │
│     └→ User chọn tuyến xe → lưu routeId                        │
│                    ↓                                             │
│  ② GET /seats/availability?routeId=...&departureDate=...        │
│     └→ Render sơ đồ ghế → User chọn ghế                        │
│                    ↓                                             │
│  ③ POST /seats/hold  (tùy chọn, khuyến nghị)                   │
│     └→ Giữ ghế 15 phút → Hiển thị countdown                    │
│                    ↓                                             │
│  ④ POST /bookings                                               │
│     └→ Tạo booking (PENDING) → lưu bookingId + amount          │
│                    ↓                                             │
│  ⑤ POST /payments                                               │
│     └→ Nhận paymentUrl → redirect đến VNPay                    │
│                    ↓                                             │
│  ⑥ [User thanh toán trên VNPay]                                 │
│     └→ VNPay → Backend verify → Redirect FE                    │
│     └→ FE: /payment/result?success=true&status=COMPLETED&...   │
│                    ↓                                             │
│  ⑦ GET /bookings/{id} hoặc /bookings/code/{code}               │
│     └→ Hiển thị chi tiết booking + vé điện tử                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Xử lý lỗi thường gặp

| HTTP Code | Lỗi | Nguyên nhân | FE xử lý |
|-----------|------|-------------|-----------|
| 401 | `No token provided` | Chưa login / token hết hạn | Redirect → trang login |
| 404 | `Route not found` | routeId sai | Quay lại tìm tuyến |
| 409 | `Seats unavailable` | Ghế đã bị người khác đặt | Reload sơ đồ ghế, chọn ghế khác |
| 409 | `Number of passengers must match number of seats` | Số hành khách ≠ số ghế | Kiểm tra form |
| 409 | `Booking is already cancelled` | Booking đã hủy rồi | Thông báo user |
| 409 | `Cannot confirm (not PENDING or expired)` | Hết 15 phút | Tạo booking mới |

---

## ⏱️ Timeout & Expiry

| Item | Thời gian | Khi hết hạn |
|------|-----------|-------------|
| Seat Hold | 15 phút | Ghế tự động release, người khác có thể đặt |
| Booking (PENDING) | 15 phút | `paymentDeadline` hết → booking tự hủy |
| Payment URL (VNPay) | 15 phút | Link VNPay hết hạn, cần tạo payment mới |
| JWT Access Token | 15 phút | Gọi refresh token hoặc login lại |

> **FE nên:** Hiển thị countdown timer từ lúc tạo booking → `paymentDeadline`. Khi hết giờ, disable nút thanh toán và thông báo user.

---

## 🧪 Test với VNPay Sandbox

Khi thanh toán trên trang VNPay sandbox, dùng thẻ test:

| Thông tin | Giá trị |
|-----------|---------|
| **Ngân hàng** | NCB |
| **Số thẻ** | 9704198526191432198 |
| **Tên chủ thẻ** | NGUYEN VAN A |
| **Ngày phát hành** | 07/15 |
| **Mật khẩu OTP** | 123456 |

---

## 🔧 Biến môi trường FE cần set

```env
# URL backend API Gateway
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Tắt mock payment (dùng backend thật)
NEXT_PUBLIC_USE_MOCK_PAYMENT=false
```

**Backend đã set:**

```env
# Redirect về FE sau thanh toán
FRONTEND_PAYMENT_RESULT_URL=http://localhost:8081/payment/result
```

---

## 📱 Tóm tắt API Endpoints

| # | Method | Endpoint | Auth | Mô tả |
|---|--------|----------|------|--------|
| 1 | POST | `/search/routes` | ❌ | Tìm tuyến xe |
| 2 | GET | `/seats/availability` | ❌ | Sơ đồ ghế |
| 3 | POST | `/seats/hold` | ✅ | Giữ ghế tạm |
| 4 | POST | `/seats/release` | ✅ | Hủy giữ ghế |
| 5 | POST | `/seats/check` | ❌ | Kiểm tra ghế trống |
| 6 | POST | `/seats/validate` | ❌ | Validate số ghế |
| 7 | POST | `/bookings` | ✅ | **Tạo booking** |
| 8 | GET | `/bookings/my` | ✅ | Booking của tôi |
| 9 | GET | `/bookings/{id}` | ✅ | Chi tiết booking |
| 10 | GET | `/bookings/code/{code}` | ❌ | Tra cứu bằng mã |
| 11 | POST | `/bookings/{id}/cancel` | ✅ | Hủy booking |
| 12 | POST | `/payments` | ❌ | **Tạo payment** → nhận VNPay URL |
| 13 | GET | `/payments/{paymentId}` | ❌ | Kiểm tra trạng thái payment |
