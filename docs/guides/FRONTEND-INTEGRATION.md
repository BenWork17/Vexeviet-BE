# Hướng dẫn nhanh cho Frontend Developer

## 📁 Các file gửi cho Frontend

1. **`API-TESTING.md`** - Tài liệu chi tiết về API endpoints, request/response format
2. **`api-types.ts`** - TypeScript types cho tất cả API (có thể import trực tiếp vào FE)

---

## 🔗 Thông tin kết nối

| Môi trường | Base URL |
|------------|----------|
| **Local Development** | `http://localhost:3000/api/v1` |
| Production | (chưa deploy) |

---

## 🔑 Authentication Flow

```
1. User đăng ký/đăng nhập → Nhận accessToken + refreshToken
2. Gọi API → Header: Authorization: Bearer <accessToken>
3. Token hết hạn → Gọi /auth/refresh-token với refreshToken
4. Refresh thất bại → Redirect về login
```

**Token lifespan:**
- Access Token: 15 phút
- Refresh Token: 7 ngày

### 🔐 Token Storage (Khuyến nghị)

| Option | Ưu điểm | Nhược điểm | Khuyến nghị |
|--------|---------|------------|-------------|
| **localStorage** | Đơn giản, persist sau reload | Dễ bị XSS attack | ⚠️ Chỉ dùng cho development |
| **sessionStorage** | Tự xóa khi đóng tab | Mất token khi mở tab mới | ❌ Không khuyến nghị |
| **Memory (state)** | An toàn nhất với XSS | Mất khi refresh page | ✅ Cho accessToken |
| **httpOnly Cookie** | An toàn nhất | Cần BE hỗ trợ, CORS phức tạp | 🔜 Iteration sau |

**Khuyến nghị cho giai đoạn development:**
```typescript
// Lưu tokens
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Lấy token
const token = localStorage.getItem('accessToken');

// Xóa khi logout
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

**Kế hoạch tương lai:** BE sẽ hỗ trợ httpOnly cookies ở iteration sau để tăng security.

---

## 📋 API Endpoints chính

### Auth & User
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/auth/register` | ❌ | Đăng ký |
| POST | `/auth/login` | ❌ | Đăng nhập |
| POST | `/auth/refresh-token` | ❌ | Refresh token |
| GET | `/users/profile` | ✅ | Lấy profile |
| PATCH | `/users/profile` | ✅ | Cập nhật profile |

### Routes (Tuyến xe)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/routes/search?from=&to=&date=` | ❌ | Tìm tuyến |
| GET | `/routes/:id` | ❌ | Chi tiết tuyến |
| GET | `/routes/popular` | ❌ | Tuyến phổ biến |
| GET | `/cities` | ❌ | Danh sách thành phố |

### Booking (Đặt vé)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/bookings` | ✅ | Tạo booking |
| GET | `/bookings/my` | ✅ | Lịch sử booking |
| GET | `/bookings/:id` | ✅ | Chi tiết booking |
| POST | `/bookings/:id/cancel` | ✅ | Hủy booking |

### Seats (Ghế)
| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/seats/availability?routeId=&departureDate=` | ❌ | Xem ghế trống |
| POST | `/seats/check` | ❌ | Kiểm tra ghế |
| POST | `/seats/hold` | ✅ | Giữ ghế (15 phút) |
| POST | `/seats/release` | ✅ | Trả ghế |

---

## ⚡ Quick Start cho FE

### 1. Cài đặt API types
```bash
# Copy file api-types.ts vào project FE
cp api-types.ts src/types/api.ts
```

### 2. Ví dụ sử dụng với fetch
```typescript
import { LoginRequest, LoginResponse, ApiResponse } from './types/api';

const BASE_URL = 'http://localhost:3000/api/v1';

// Login
async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Protected API call
async function getProfile(token: string) {
  const res = await fetch(`${BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
```

### 3. Ví dụ với Axios
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// Add auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await api.post('/auth/refresh-token', { refreshToken });
      localStorage.setItem('accessToken', data.data.accessToken);
      // Retry original request
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 🎯 Booking Flow (quan trọng)

```
1. Tìm tuyến xe    → GET /routes/search
2. Chọn tuyến      → GET /routes/:id
3. Xem ghế trống   → GET /seats/availability
4. Giữ ghế (15p)   → POST /seats/hold (optional, để tránh conflict)
5. Tạo booking     → POST /bookings
6. Thanh toán      → (iteration sau)
7. Xác nhận        → Tự động khi thanh toán thành công
```

**⚠️ Lưu ý quan trọng:**
- Booking có deadline 15 phút để thanh toán
- Luôn dùng `idempotencyKey` (UUID) khi tạo booking để tránh duplicate
- Seat có thể bị người khác đặt bất cứ lúc nào → handle error `SEATS_UNAVAILABLE`

---

## 🪑 Seat Map Layout

### Cấu trúc dữ liệu ghế

API `/seats/availability` trả về danh sách ghế theo format:

```typescript
interface SeatAvailabilityResponse {
  routeId: string;
  departureDate: string;
  totalSeats: number;
  availableSeats: number;
  seats: Array<{
    seatNumber: string;    // "A1", "B1", "C1", "D1", "A2"...
    status: 'AVAILABLE' | 'HELD' | 'BOOKED';
    lockedUntil?: string;  // ISO datetime nếu đang bị hold
  }>;
}
```

### Quy tắc đánh số ghế (Standard Bus - 4 cột)

```
Layout xe giường nằm tiêu chuẩn (4 cột x N hàng):

    Cột A   Cột B     Lối đi     Cột C   Cột D
    ┌───┐   ┌───┐               ┌───┐   ┌───┐
Row 1│ A1│   │ B1│               │ C1│   │ D1│
    └───┘   └───┘               └───┘   └───┘
    ┌───┐   ┌───┐               ┌───┐   ┌───┐
Row 2│ A2│   │ B2│               │ C2│   │ D2│
    └───┘   └───┘               └───┘   └───┘
    ┌───┐   ┌───┐               ┌───┐   ┌───┐
Row 3│ A3│   │ B3│               │ C3│   │ D3│
    └───┘   └───┘               └───┘   └───┘
    ...
```

### Code ví dụ để render Seat Map

```typescript
// Chuyển đổi flat array thành 2D grid
function buildSeatGrid(seats: SeatInfo[], columns: number = 4): SeatInfo[][] {
  const grid: SeatInfo[][] = [];
  const rows = Math.ceil(seats.length / columns);
  
  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < columns; col++) {
      const seatNumber = `${String.fromCharCode(65 + col)}${row + 1}`; // A1, B1, C1, D1
      const seat = seats.find(s => s.seatNumber === seatNumber);
      if (seat) {
        grid[row].push(seat);
      }
    }
  }
  
  return grid;
}

// React component example
function SeatMap({ seats }: { seats: SeatInfo[] }) {
  const grid = buildSeatGrid(seats);
  
  return (
    <div className="seat-map">
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} className="seat-row">
          {row.map((seat) => (
            <button
              key={seat.seatNumber}
              className={`seat seat-${seat.status.toLowerCase()}`}
              disabled={seat.status !== 'AVAILABLE'}
              onClick={() => onSelectSeat(seat.seatNumber)}
            >
              {seat.seatNumber}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### CSS cho Seat Map

```css
.seat-map {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seat-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Tạo lối đi giữa cột B và C */
.seat-row .seat:nth-child(2) {
  margin-right: 24px;
}

.seat {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid #ccc;
  cursor: pointer;
  font-weight: bold;
}

.seat-available {
  background: #e8f5e9;
  border-color: #4caf50;
}

.seat-available:hover {
  background: #c8e6c9;
}

.seat-held {
  background: #fff3e0;
  border-color: #ff9800;
  cursor: not-allowed;
}

.seat-booked {
  background: #ffebee;
  border-color: #f44336;
  cursor: not-allowed;
}

.seat-selected {
  background: #2196f3;
  border-color: #1976d2;
  color: white;
}
```

### Xe 2 tầng (Sleeper Bus)

Đối với xe 2 tầng, BE hiện trả về flat list. FE có thể split dựa vào:
- Tầng 1: Ghế 1 → totalSeats/2
- Tầng 2: Ghế (totalSeats/2 + 1) → totalSeats

```typescript
function splitByFloor(seats: SeatInfo[], totalSeats: number) {
  const halfSeats = totalSeats / 2;
  return {
    floor1: seats.slice(0, halfSeats),
    floor2: seats.slice(halfSeats),
  };
}
```

> **📝 Note:** Nếu FE cần thêm metadata về layout (rows, columns, floors) trong response API, hãy báo BE để bổ sung.

---

## 🔄 Data Mapping (FE ↔ BE)

### Route Data Structure

```typescript
// ✅ BE Response - FE nên dùng trực tiếp
interface Route {
  id: string;
  departureCity: string;        // "Hồ Chí Minh"
  arrivalCity: string;          // "Đà Lạt"  
  departureCitySlug: string;    // "ho-chi-minh" (dùng cho URL)
  arrivalCitySlug: string;      // "da-lat"
  departureTime: string;        // "08:00"
  arrivalTime: string;          // "14:00"
  duration: number;             // 360 (phút)
  price: number;                // 250000
  availableSeats: number;
  totalSeats: number;
  vehicleType: 'LIMOUSINE' | 'SLEEPER_BUS' | 'STANDARD' | 'VIP';
  amenities: string[];          // ["wifi", "ac", "toilet"]
  pickupPoints: PickupPoint[];
  dropoffPoints: DropoffPoint[];
  operator?: {
    id: string;
    name: string;               // "Phương Trang"
    logo?: string;              // URL logo
    rating?: number;            // 4.5
    totalTrips?: number;
  };
}
```

### Helper Functions cho FE

```typescript
// Format thời gian
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? mins + 'p' : ''}`;
}

// Format giá tiền
function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

// Lấy thông tin operator an toàn
function getOperatorDisplay(route: Route) {
  return {
    name: route.operator?.name ?? 'Chưa xác định',
    logo: route.operator?.logo ?? '/images/default-operator.png',
    rating: route.operator?.rating ?? 0,
  };
}

// Build URL cho route detail
function buildRouteUrl(route: Route, date: string): string {
  return `/routes/${route.departureCitySlug}-${route.arrivalCitySlug}/${route.id}?date=${date}`;
}
```

### Pickup/Dropoff Points

```typescript
interface PickupPoint {
  id: string;
  name: string;       // "Bến xe Miền Đông"
  address: string;    // "292 Đinh Bộ Lĩnh, Q.Bình Thạnh"
  time: string;       // "08:00" - thời gian đón
  latitude?: number;  // Tọa độ (optional)
  longitude?: number;
}
```

---

## ❌ Error Handling

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;  // e.g., "SEATS_UNAVAILABLE"
    message: string;
    details?: any;
  };
}

// Common error codes
const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  TOKEN_EXPIRED: 'Phiên đăng nhập hết hạn',
  SEATS_UNAVAILABLE: 'Ghế đã được đặt, vui lòng chọn ghế khác',
  BOOKING_EXPIRED: 'Booking đã hết hạn',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
};
```

---

## 📞 Liên hệ khi cần hỗ trợ

- Nếu gặp lỗi API → Gửi request + response để debug
- Nếu cần thêm API → Tạo issue trên repo

---

**Version:** Iteration 1-4 (Booking Service)  
**Last Updated:** 2026-01-19
