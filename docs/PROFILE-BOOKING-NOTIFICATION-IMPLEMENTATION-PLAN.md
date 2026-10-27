# Profile + Bookings + Notifications
## Kế hoạch triển khai chi tiết (chất lượng cao, dễ bảo trì)

> Tài liệu này tổng hợp **phần đánh giá hiện trạng** và **kế hoạch triển khai chi tiết** cho 3 luồng chính:
> 1) Profile người dùng
> 2) Vé đã đặt (bookings/my)
> 3) Notifications (chưa có)

---

## 1) Phạm vi và mục tiêu

### Mục tiêu
- Chuẩn hóa API contract giữa backend và frontend.
- Loại bỏ rủi ro lộ field nội bộ từ Prisma models.
- Bổ sung Notification API theo hướng đơn giản trước, mở rộng dễ sau.
- Giữ thay đổi nhỏ, rõ ràng, có test, dễ rollback.

### Ngoài phạm vi (phase này)
- Không làm push notification mobile/web real-time ngay.
- Không refactor lớn toàn bộ event platform.

---

## 2) Hiện trạng đã xác thực từ codebase

## 2.1 Profile API
- Route: `GET/PATCH/DELETE /api/v1/users/profile`
  - [`services/user-service/src/routes/user.routes.ts`](file:///D:/vexeviet-BE/services/user-service/src/routes/user.routes.ts)
  - [`services/user-service/src/controllers/user.controller.ts`](file:///D:/vexeviet-BE/services/user-service/src/controllers/user.controller.ts)
- Service hiện dùng type `User = Omit<PrismaUser, 'password'>`
  - [`services/user-service/src/types/index.ts`](file:///D:/vexeviet-BE/services/user-service/src/types/index.ts)

**Rủi ro:** trả trực tiếp shape gần Prisma model có thể làm lộ field không mong muốn khi schema đổi (vd verification/status fields từ [`packages/database/prisma/schema.prisma`](file:///D:/vexeviet-BE/packages/database/prisma/schema.prisma)).

## 2.2 Vé đã đặt (bookings)
- Endpoint chính cho Profile page:
  - `GET /api/v1/bookings/my`
  - `GET /api/v1/bookings/:id`
  - `GET /api/v1/bookings/code/:code`
  - [`services/booking-service/src/routes/index.ts`](file:///D:/vexeviet-BE/services/booking-service/src/routes/index.ts)
  - [`services/booking-service/src/controllers/booking.controller.ts`](file:///D:/vexeviet-BE/services/booking-service/src/controllers/booking.controller.ts)
  - [`services/booking-service/src/services/booking.service.ts`](file:///D:/vexeviet-BE/services/booking-service/src/services/booking.service.ts)

**Vấn đề contract:** tài liệu frontend hiện có lệch naming so với API thực tế (ví dụ `totalAmount` vs `totalPrice`) trong [`docs/api-types.ts`](file:///D:/vexeviet-BE/docs/api-types.ts).

## 2.3 Notifications
- Chưa có HTTP API notifications trong các service hiện tại.
- Event infra đang không đồng nhất:
  - Booking service có Rabbit publisher/consumer (`events/*`) nhưng chưa thấy luồng publish được dùng đầy đủ từ booking flow.
  - User service event publisher hiện chủ yếu log/dev, chưa có backend bus production-ready.

## 2.4 Frontend Profile trong workspace
- Workspace hiện là backend monorepo, không thấy source frontend runtime (tsx/jsx/vue/svelte app) để đối chiếu trực tiếp trang Profile.

---

## 3) Nguyên tắc thiết kế (clean + maintainable)

1. **Contract-first DTO**: Controller chỉ trả DTO whitelist field.
2. **Không trả Prisma shape thô** ra public API.
3. **Naming nhất quán 1 lần** (không alias kéo dài không kiểm soát).
4. **Mở rộng theo phase**: In-app notification trước, push/email sau.
5. **Backward compatibility có kế hoạch**: deprecate có thời hạn + contract test.
6. **Tối ưu vừa đủ**: pagination + index + query chọn field tối thiểu.

---

## 4) Thiết kế contract mục tiêu

## 4.1 User Profile DTO

```ts
export type UserProfileResponse = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'OPERATOR' | 'ADMIN';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## 4.2 Update Profile DTO

```ts
export type UpdateProfileRequest = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};
```

> Không nhận update trực tiếp các field: role/status/password/verification fields.

## 4.3 Booking Summary DTO (cho tab “vé đã đặt”)

```ts
export type BookingSummary = {
  bookingId: string;
  bookingCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  departureDate: string;
  route: {
    id: string;
    name: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    busType: string;
  };
  seats: string[];
  totalPrice: { amount: number; currency: 'VND' };
  paymentDeadline: string;
  createdAt: string;
};
```

## 4.4 Notification DTO

```ts
export type NotificationItem = {
  id: string;
  userId: string;
  type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'PAYMENT_FAILED' | 'SYSTEM';
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
};
```

---

## 5) Kế hoạch triển khai chi tiết theo phase

## Phase A — Chuẩn hóa Profile + Booking contracts

### A1. User Service
**Mục tiêu:** chỉ expose DTO an toàn.

- Thêm mapper `toUserProfileResponse`.
- Sửa `getProfile`, `updateProfile` trả DTO này.
- Hạn chế input update bằng schema/DTO whitelist.

**Files chính:**
- [`services/user-service/src/controllers/user.controller.ts`](file:///D:/vexeviet-BE/services/user-service/src/controllers/user.controller.ts)
- [`services/user-service/src/services/user.service.ts`](file:///D:/vexeviet-BE/services/user-service/src/services/user.service.ts)
- [`services/user-service/src/types/index.ts`](file:///D:/vexeviet-BE/services/user-service/src/types/index.ts)

### A2. Booking Service
**Mục tiêu:** contract rõ cho list/detail.

- Tách mapper summary/detail trong service.
- `GET /bookings/my` trả `BookingSummary[]` + pagination.
- `GET /bookings/:id`, `/bookings/code/:code` trả `BookingDetail` ổn định.

**Files chính:**
- [`services/booking-service/src/services/booking.service.ts`](file:///D:/vexeviet-BE/services/booking-service/src/services/booking.service.ts)
- [`services/booking-service/src/controllers/booking.controller.ts`](file:///D:/vexeviet-BE/services/booking-service/src/controllers/booking.controller.ts)
- [`services/booking-service/src/types/index.ts`](file:///D:/vexeviet-BE/services/booking-service/src/types/index.ts)

### A3. Đồng bộ docs contract
- Cập nhật [`docs/api-types.ts`](file:///D:/vexeviet-BE/docs/api-types.ts) theo contract API thực tế.
- Đánh dấu deprecated fields (nếu có).

---

## Phase B — Notification Service (MVP production-ready)

## B1. Schema DB
Thêm model Notification vào Prisma:

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   @db.VarChar(50)
  title     String   @db.VarChar(255)
  message   String   @db.Text
  payload   Json?
  isRead    Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
  @@index([userId, isRead])
  @@map("notifications")
}
```

## B2. Service mới
Tạo `services/notification-service` theo pattern chuẩn hiện có:
- `routes -> controller -> service -> repository`
- validate bằng Zod
- error middleware thống nhất

## B3. Endpoints
### Public
- `GET /api/v1/notifications?unreadOnly=&page=&limit=`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`

### Internal
- `POST /api/v1/internal/notifications`
  - bảo vệ bằng `x-internal-api-key`

## B4. Gateway mapping
Thêm prefix `/notifications` ở:
- [`apps/api-gateway/src/config/services.config.ts`](file:///D:/vexeviet-BE/apps/api-gateway/src/config/services.config.ts)

---

## Phase C — Kết nối luồng dữ liệu sang Notifications

### C1. Ngắn hạn (khuyến nghị)
Dùng internal HTTP call (đồng bộ) từ nơi đã có business event:
- Booking confirm/cancel/payment-failed
- User register/verify

**Ưu điểm:** debug dễ, ít moving parts, rollout nhanh.

### C2. Trung hạn
Nâng cấp sang async event bus thống nhất khi event infra ổn định:
- chuẩn envelope event
- retry + DLQ
- idempotency theo `sourceEventId`

---

## 6) Rủi ro chính & biện pháp tránh

| Rủi ro | Mức độ | Biện pháp |
|---|---:|---|
| Lộ field nội bộ user | Cao | DTO whitelist + test cấm field |
| FE/BE drift contract | Cao | Contract tests + update docs cùng PR |
| Notification duplicate | Trung bình | Idempotency key unique |
| Endpoint internal bị lạm dụng | Cao | `x-internal-api-key` + audit log |
| Query chậm profile page | Trung bình | Pagination cứng + index phù hợp |
| Race condition read-all | Trung bình | Update theo `userId` + transaction |
| Breaking change âm thầm | Cao | Deprecation window + changelog |

---

## 7) Test strategy bắt buộc

## 7.1 Unit
- Mapper profile/booking/notification.
- Validation request schemas.

## 7.2 Integration
- `GET/PATCH /users/profile`
- `GET /bookings/my`
- `GET/PATCH /notifications*`

## 7.3 Contract
- Snapshot JSON schema response.
- Assert không có field cấm.

## 7.4 Regression
- `pnpm lint`
- `pnpm type-check`
- test theo service filter.

---

## 8) Rollout plan an toàn (không downtime)

1. Deploy Phase A (contract DTO) với backward-compatible window ngắn.
2. Deploy notification-service + route gateway.
3. Bật gửi notifications bằng feature flag/env.
4. Theo dõi logs/metrics (error rate, latency, duplicate count).
5. Gỡ legacy fields sau khi FE xác nhận stable.

---

## 9) Checklist triển khai thực thi

- [ ] Tạo DTO profile + mapper + tests
- [ ] Siết update profile request whitelist
- [ ] Chuẩn hóa booking summary/detail DTO
- [ ] Cập nhật `docs/api-types.ts` khớp API
- [ ] Add Notification model + migration
- [ ] Tạo `notification-service` (MVP)
- [ ] Add gateway mapping `/notifications`
- [ ] Internal auth cho `/internal/notifications`
- [ ] Viết integration + contract tests
- [ ] Rollout theo feature flag + monitor

---

## 10) Ghi chú quyết định kiến trúc

- Chọn **DTO contract-first** để tối đa an toàn contract.
- Chọn **sync internal notification ingestion** trước để giảm complexity.
- Event bus full async chỉ bật khi hạ tầng event đã thống nhất và có giám sát/đảm bảo delivery.

---

## 11) Kỳ vọng nghiệm thu

- Tab profile dùng API ổn định, không field surprise.
- Tab “vé đã đặt” khớp contract tài liệu.
- Tab “thông báo” có data thật từ notification-service.
- Không phát sinh breaking change không kiểm soát.
