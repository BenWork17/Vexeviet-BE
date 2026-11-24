# VeXeViet Backend (`vexeviet-be`)

Backend Microservices Turborepo cho nền tảng đặt vé xe khách trực tuyến **VeXeViet**.

## Cấu trúc hệ thống & Cổng dịch vụ

```text
vexeviet-be/
├── apps/
│   └── api-gateway/        # (:3000) API Gateway: Proxy /api/v1/*, CORS, Rate-limit, OpenAPI (/api/docs), X-Request-Id
├── services/
│   ├── user-service/       # (:3001) Auth, Users, Operators, BusTemplates, Media Uploads, AuditLogs
│   ├── route-service/      # (:3002) Tìm kiếm & Quản lý chuyến xe
│   ├── booking-service/    # (:3003) Giữ ghế, Đặt vé, Quản trị Booking, Đánh giá nhà xe
│   └── payment-service/    # (:3004) Thanh toán VNPay, Webhooks, Đối soát & Hoàn tiền
├── packages/
│   ├── config/             # (@vexeviet/config) Kiểm tra biến môi trường bằng Zod & chuẩn hoá Service URLs
│   ├── common/             # (@vexeviet/common) AppError, Unified ErrorHandler, Pino Logger + RequestId, Auth/RBAC, Zod Validator, Redis
│   └── database/           # (@vexeviet/database) Prisma MySQL schema, migrations, singleton client, audit log helper
├── docs/                   # { architecture/, api/, guides/, archive/ }
├── scripts/                # Scripts vận hành & migration
├── tests/                  # Postman integration & k6 performance tests
├── docker-compose.yml      # Hạ tầng phát triển local (chỉ chạy MySQL 8 + Redis 7, và optional ngrok profile)
└── docker-compose.apps.yml # Cấu hình chạy container các services
```

## Khởi chạy môi trường phát triển (Local Dev)

```bash
pnpm install
cp .env.example .env
pnpm docker:up        # Khởi động MySQL (:3306) và Redis (:6379)
pnpm prisma:generate  # Sinh Prisma Client
pnpm build            # Build các shared packages (@vexeviet/config, common, database)
pnpm dev:services     # Chạy đồng thời Gateway (:3000) và 4 Services (:3001..3004)
```

## Truy vết lỗi (Debugging & Correlation)

- Mọi request đi qua `api-gateway` đều được gắn header `X-Request-Id` (và trả lại cho client qua response header lẫn trường `requestId` khi lỗi).
- Tất cả services trả về duy nhất một chuẩn lỗi JSON:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Thông báo lỗi chi tiết",
      "details": []
    },
    "requestId": "9f82a1c0-..."
  }
  ```
