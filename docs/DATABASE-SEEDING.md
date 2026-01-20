# Database Seeding Guide

## 🌱 Overview

Seeding tạo dữ liệu mẫu cho database, bao gồm:
- Admin account (từ .env)
- Sample operator account
- Sample routes (HCM-Đà Lạt, HCM-Nha Trang, Hà Nội-Hạ Long)

---

## 🔐 Setup Admin Account

### 1. Configure Environment Variables

Tạo file `.env` trong root (nếu chưa có):

```bash
# Copy từ .env.example
cp .env.example .env
```

### 2. Edit Admin Credentials

Mở `.env` và chỉnh sửa:

```bash
# Admin Account (for seeding)
ADMIN_EMAIL="admin@vexeviet.com"
ADMIN_PASSWORD="Admin@123456"
```

**⚠️ Lưu ý:**
- Email phải unique trong database
- Password tối thiểu 8 ký tự, có chữ hoa, số, ký tự đặc biệt
- File `.env` đã được gitignore, an toàn để lưu password

---

## 🚀 Run Seeding

### Option 1: Using pnpm script

```bash
# Seed database
pnpm --filter @vexeviet/database prisma:seed

# Or directly
cd packages/database
pnpm prisma:seed
```

### Option 2: Using Prisma CLI

```bash
cd packages/database
npx prisma db seed
```

---

## ✅ Seeding Results

Sau khi chạy, bạn sẽ có:

### 1. Admin Account
```
Email: admin@vexeviet.com (hoặc từ .env)
Password: Admin1234 (hoặc từ .env)
Role: ADMIN
Status: ACTIVE
```

### 2. Sample Operator
```
Email: operator@vexeviet.com
Password: Operator@123456
Role: OPERATOR
Status: ACTIVE
```

### 3. Sample Routes
- **HCM - Đà Lạt Express** (Limousine, 350k)
- **HCM - Nha Trang Sleeper** (Giường nằm, 280k)
- **Hanoi - Hạ Long** (VIP, 150k)

---

## 🧪 Test Admin Login

### Using cURL

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vexeviet.com",
    "password": "Admin@123456"
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@vexeviet.com",
      "firstName": "Admin",
      "lastName": "VeXeViet",
      "role": "ADMIN"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 🔄 Re-seed Database

Nếu muốn reset và seed lại:

```bash
# 1. Reset database
cd packages/database
npx prisma migrate reset

# 2. Seed sẽ tự động chạy sau reset
# Hoặc chạy thủ công
pnpm prisma:seed
```

---

## 🛠️ Customize Seeding

Edit file `packages/database/prisma/seed.ts`:

```typescript
// Thêm admin khác
const admin2 = await prisma.user.create({
  data: {
    email: 'admin2@vexeviet.com',
    password: await bcrypt.hash('SecurePass123', 12),
    firstName: 'Admin 2',
    lastName: 'Support',
    role: 'ADMIN',
    isEmailVerified: true,
    status: 'ACTIVE',
  }
});

// Thêm routes
const route = await prisma.route.create({
  data: {
    name: 'Hanoi - Sapa',
    origin: 'Hanoi',
    destination: 'Sapa',
    // ... other fields
    operatorId: operator.id,
  }
});
```

---

## 📊 View Seeded Data

### Option 1: Prisma Studio (GUI)

```bash
cd packages/database
pnpm prisma:studio
# Opens http://localhost:5555
```

### Option 2: MySQL Client

```bash
docker exec -it vexeviet-mysql mysql -uroot -proot vexeviet

mysql> SELECT id, email, role, status FROM users;
mysql> SELECT id, name, origin, destination, price FROM routes;
```

---

## 🔒 Production Seeding

**⚠️ IMPORTANT:** Không bao giờ commit file `.env` với production credentials!

### Production Setup

1. **Set environment variables trên server:**

```bash
# Server environment
export ADMIN_EMAIL="admin@production-domain.com"
export ADMIN_PASSWORD="VerySecureProductionPassword!123"
export DATABASE_URL="mysql://..."
```

2. **Run seed trên production:**

```bash
# SSH vào server
ssh user@production-server

# Run seed
cd /app/packages/database
npm run prisma:seed
```

3. **Verify:**

```bash
# Test login với production admin
curl -X POST https://api.vexeviet.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@production-domain.com",
    "password": "VerySecureProductionPassword!123"
  }'
```

---

## 🐛 Troubleshooting

### Error: "Unique constraint failed on the fields: (`email`)"

**Solution:** Admin email đã tồn tại. Reset hoặc đổi email trong `.env`

```bash
# Option 1: Reset database
npx prisma migrate reset

# Option 2: Change email in .env
ADMIN_EMAIL="admin2@vexeviet.com"
```

### Error: "Environment variable not found: DATABASE_URL"

**Solution:** Chưa có file `.env` hoặc DATABASE_URL chưa set

```bash
# Copy .env.example
cp .env.example .env

# Or set manually
export DATABASE_URL="mysql://root:root@localhost:3306/vexeviet"
```

### Error: "Cannot find module 'bcryptjs'"

**Solution:** Install dependencies

```bash
cd packages/database
pnpm install
```

---

## 📝 Seed Script Breakdown

```typescript
// 1. Hash password với bcrypt (cost factor: 12)
const password = await bcrypt.hash('Admin@123456', 12);

// 2. Upsert (create or skip nếu đã tồn tại)
const admin = await prisma.user.upsert({
  where: { email: 'admin@vexeviet.com' },
  update: {}, // Không update nếu tồn tại
  create: { /* data */ }
});

// 3. Create routes với operator relationship
const route = await prisma.route.create({
  data: {
    operatorId: operator.id, // Foreign key
    // ... other fields
  }
});
```

---

**Last Updated:** 2026-01-20  
**Version:** 1.0
