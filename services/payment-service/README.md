# Payment Service

Payment microservice for VeXeViet platform - handles payment processing, VNPay integration, and refunds.

## Features (PI 2 - Iteration 2-1)

- ✅ VNPay sandbox integration
- ✅ Payment webhook handling (IPN)
- ✅ Idempotency mechanism (Redis-based)
- ✅ Payment CRUD operations
- ✅ Refund processing
- 🔜 Momo integration (Iteration 2-2)
- 🔜 ZaloPay integration (Iteration 2-2)

## API Endpoints

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments` | Create a new payment |
| GET | `/api/v1/payments/:paymentId` | Get payment by ID |
| GET | `/api/v1/payments/booking/:bookingId` | Get payments for a booking |
| POST | `/api/v1/payments/:paymentId/cancel` | Cancel a pending payment |
| POST | `/api/v1/payments/refund` | Process a refund |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks/vnpay/return` | VNPay return URL handler |
| GET | `/api/v1/webhooks/vnpay/ipn` | VNPay IPN webhook |
| POST | `/api/v1/webhooks/momo` | Momo webhook (not implemented) |
| POST | `/api/v1/webhooks/zalopay` | ZaloPay webhook (not implemented) |

## Create Payment Request

```json
{
  "bookingId": "uuid",
  "amount": 350000,
  "method": "VNPAY",
  "returnUrl": "https://yoursite.com/payment/result",
  "orderInfo": "Thanh toan ve xe VXV123456",
  "locale": "vn"
}
```

### Headers
- `Idempotency-Key`: Unique key to prevent duplicate payments (optional but recommended)

## Response

```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "transactionId": "VXV1706616123456ABCD",
    "expiredAt": "2026-01-30T10:30:00.000Z"
  }
}
```

## Environment Variables

```bash
PAYMENT_SERVICE_PORT=3003
REDIS_HOST=localhost
REDIS_PORT=6379

# VNPay (Sandbox)
# ⚠️ THESE ARE EXAMPLE VALUES - REPLACE WITH YOUR ACTUAL CREDENTIALS
# Get real credentials from: https://sandbox.vnpayment.vn/merchantv2/
# See VNPAY_SANDBOX_SETUP.md for detailed instructions
VNPAY_TMN_CODE=your_tmn_code_here
VNPAY_HASH_SECRET=your_hash_secret_here
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/result
```

## Development

```bash
# Install dependencies
pnpm install

# Run migrations (from root)
cd packages/database && pnpm prisma migrate dev

# Start development server
pnpm dev

# Build
pnpm build

# Type check
pnpm type-check
```

## VNPay Sandbox Testing

### Test Cards

| Card Type | Card Number | Date | OTP |
|-----------|------------|------|-----|
| NCB | 9704198526191432198 | 07/15 | 123456 |

### Response Codes

| Code | Description |
|------|-------------|
| 00 | Giao dịch thành công |
| 07 | Giao dịch bị nghi ngờ |
| 09 | Chưa đăng ký InternetBanking |
| 10 | Xác thực sai quá 3 lần |
| 11 | Hết hạn chờ thanh toán |
| 12 | Thẻ/Tài khoản bị khóa |
| 24 | Khách hàng hủy giao dịch |
| 51 | Không đủ số dư |
| 65 | Vượt hạn mức giao dịch |

## Architecture

```
src/
├── config/           # Configuration
├── controllers/      # Request handlers
│   ├── payment.controller.ts
│   └── webhook.controller.ts
├── middlewares/      # Error handling
├── repositories/     # Database access
├── routes/           # API routes
├── services/         # Business logic
│   ├── payment.service.ts
│   └── vnpay.service.ts
├── types/            # TypeScript types
├── utils/            # Utilities
│   ├── signature.ts  # VNPay signature
│   └── idempotency.ts
├── validators/       # Request validation
└── index.ts          # Entry point
```

## Port

- Default: `3003`
- Health check: `http://localhost:3003/health`
