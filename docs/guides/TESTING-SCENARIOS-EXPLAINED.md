# Testing Scenarios - Giải thích chi tiết

> **Mục đích:** Hướng dẫn test các tính năng hoàn chỉnh (end-to-end workflows)

---

## 🤔 Testing Scenarios là gì?

**Testing Scenarios** = Các kịch bản test **end-to-end (E2E)** mô phỏng hành vi người dùng thực tế.

### Khác biệt giữa Unit Test vs E2E Test

| Unit Test | E2E Test (Testing Scenarios) |
|-----------|------------------------------|
| Test 1 API riêng lẻ | Test cả flow từ đầu đến cuối |
| Ví dụ: Test POST `/auth/login` | Ví dụ: Đăng ký → Login → Tìm xe → Đặt vé |
| Dev tự viết code test | QA/Frontend dev test thủ công hoặc tự động |
| Chạy nhanh | Chạy chậm hơn |

---

## 🎯 Tại sao cần Testing Scenarios?

### 1. **Cho Frontend Developer**

```javascript
// Frontend dev đọc Scenario 1 sẽ hiểu:
// Bước 1: Gọi POST /auth/register
const registerResponse = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email: '...', password: '...' })
});
const { accessToken } = registerResponse.data;

// Bước 2: Gọi POST /search/routes với token (nếu cần)
const searchResponse = await fetch('http://localhost:3000/api/v1/search/routes', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: JSON.stringify({ origin: 'HCM', destination: 'Da Lat' })
});

// Bước 3: Gọi GET /routes/:id
// ...
```

→ **Frontend dev biết chính xác phải làm gì theo thứ tự nào**

---

### 2. **Cho QA/Tester**

**Thay vì test từng API riêng lẻ:**
```
✓ Test POST /auth/register → OK
✓ Test POST /search/routes → OK
✓ Test POST /bookings → OK
```

**QA test cả flow:**
```
Scenario: Khách hàng đặt vé xe đi Đà Lạt
1. Đăng ký tài khoản mới
2. Tìm tuyến HCM → Đà Lạt
3. Xem chi tiết tuyến xe
4. Đặt 2 ghế A1, A2
5. Thanh toán
6. Nhận vé qua email

→ Nếu bước nào lỗi → Biết luôn vấn đề ở đâu
```

---

### 3. **Cho Backend Developer**

- **Debug business logic:** Nếu khách hàng report lỗi "đặt vé không được", backend dev chạy lại Scenario 1 để reproduce lỗi
- **Regression testing:** Sau khi sửa code, chạy lại tất cả scenarios để đảm bảo không làm hỏng tính năng cũ

---

### 4. **Cho Product Manager/BA**

- **Kiểm tra requirements:** Có đúng flow mà PM mong muốn không?
- **Demo cho stakeholders:** Chạy scenarios để show tính năng hoàn chỉnh

---

## 📋 Ví dụ chi tiết: Scenario 2 - Operator quản lý tuyến xe

### Mục tiêu
Operator (nhà xe) muốn:
1. Tạo tài khoản operator
2. Thêm tuyến xe mới
3. Xem danh sách tuyến xe của mình
4. Sửa giá vé
5. Xóa tuyến xe không còn chạy

### Các bước test

**Bước 1: Đăng ký tài khoản Operator**
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
**Kiểm tra:**
- ✓ Response 201 Created
- ✓ Nhận được `accessToken` và `refreshToken`
- ✓ User có role = "OPERATOR"

---

**Bước 2: Login để lấy token**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "operator@buscompany.com",
  "password": "Operator@123"
}
```
**Kiểm tra:**
- ✓ Response 200 OK
- ✓ Lưu `accessToken` để dùng cho các bước sau

---

**Bước 3: Tạo tuyến xe mới**
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
**Kiểm tra:**
- ✓ Response 201 Created
- ✓ Route được tạo với `operatorId` = user ID của operator
- ✓ Lưu `routeId` để dùng cho bước sau

---

**Bước 4: Xem danh sách tuyến xe của mình**
```http
GET http://localhost:3000/api/v1/routes/my/routes
Authorization: Bearer {accessToken}
```
**Kiểm tra:**
- ✓ Response 200 OK
- ✓ Thấy tuyến xe vừa tạo trong danh sách
- ✓ Không thấy tuyến xe của operator khác

---

**Bước 5: Cập nhật giá vé**
```http
PUT http://localhost:3000/api/v1/routes/{routeId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "price": 150000,
  "availableSeats": 40
}
```
**Kiểm tra:**
- ✓ Response 200 OK
- ✓ Giá vé được cập nhật từ 120,000 → 150,000
- ✓ Số ghế còn lại = 40

---

**Bước 6: Xóa tuyến xe (soft delete)**
```http
DELETE http://localhost:3000/api/v1/routes/{routeId}
Authorization: Bearer {accessToken}
```
**Kiểm tra:**
- ✓ Response 200 OK
- ✓ Route có `status = DELETED`
- ✓ Route không hiển thị trong danh sách tìm kiếm công khai
- ✓ Operator vẫn thấy trong "my routes" với status DELETED

---

### Kết quả mong đợi

Sau khi chạy xong Scenario 2:
- ✅ Operator có thể tạo/xem/sửa/xóa tuyến xe của mình
- ✅ Operator không thể sửa/xóa tuyến xe của người khác
- ✅ Tất cả API hoạt động đúng theo business logic

---

## 🐛 Scenario 6: Error Handling - Tại sao quan trọng?

### Test 1: Đăng nhập sai mật khẩu

**Hành động:**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "WrongPassword123"
}
```

**Kết quả mong đợi:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```
- ✓ Status code = 401 Unauthorized
- ✓ Không leak thông tin (không nói "email không tồn tại" hay "sai password")
- ✓ Error message rõ ràng cho frontend hiển thị

**Nếu không test scenario này:**
- ❌ Có thể trả về 500 Internal Server Error
- ❌ Có thể leak thông tin "User not found" → hacker biết email có tồn tại không
- ❌ Frontend không biết hiển thị lỗi như thế nào

---

### Test 3: Customer (khách hàng) cố gắng tạo tuyến xe

**Hành động:**
```http
POST http://localhost:3000/api/v1/routes
Authorization: Bearer {customer_accessToken}
Content-Type: application/json

{
  "name": "Fake Route",
  "origin": "HCM",
  "destination": "Da Lat",
  ...
}
```

**Kết quả mong đợi:**
```json
{
  "success": false,
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```
- ✓ Status code = 403 Forbidden
- ✓ Không cho phép customer tạo route (chỉ OPERATOR/ADMIN mới được)

**Nếu không test scenario này:**
- ❌ Có thể quên check role → khách hàng tạo được route giả
- ❌ Security hole nghiêm trọng

---

## 🔄 Khi nào chạy Testing Scenarios?

### 1. **Development (Manual)**
- Dev hoàn thành feature → Tự test bằng Postman theo scenarios
- Đảm bảo flow hoạt động đúng trước khi commit code

### 2. **QA Testing (Manual/Automated)**
- QA nhận feature mới → Chạy tất cả scenarios liên quan
- Phát hiện bug trước khi release

### 3. **CI/CD (Automated)**
```yaml
# .github/workflows/e2e-test.yml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Testing Scenarios
        run: npm run test:e2e
```
- Mỗi lần push code → Tự động chạy scenarios
- Nếu fail → Không cho merge PR

### 4. **Regression Testing**
- Sau khi fix bug hoặc thêm feature mới
- Chạy lại tất cả scenarios cũ để đảm bảo không làm hỏng tính năng cũ

---

## 🛠️ Tools để chạy Scenarios

### 1. **Postman (Manual)**
- Import Postman Collection từ `API-TESTING.md`
- Chạy từng scenario bằng tay
- Phù hợp cho: Dev, QA manual testing

### 2. **Newman (Automated - Postman CLI)**
```bash
# Cài đặt
npm install -g newman

# Chạy collection
newman run VeXeViet-API.postman_collection.json \
  --environment dev.postman_environment.json
```

### 3. **Playwright/Cypress (E2E Frontend + Backend)**
```javascript
// tests/e2e/customer-booking.spec.ts
test('Scenario 1: Customer books bus ticket', async ({ page }) => {
  // Step 1: Register
  await page.goto('http://localhost:3000/register');
  await page.fill('#email', 'customer@example.com');
  await page.fill('#password', 'Customer@123');
  await page.click('button[type=submit]');
  
  // Step 2: Search routes
  await page.goto('http://localhost:3000/search');
  await page.fill('#origin', 'Ho Chi Minh City');
  await page.fill('#destination', 'Da Lat');
  await page.click('button#search');
  
  // Step 3: Book ticket
  await page.click('button.book-now');
  // ...
});
```

### 4. **Supertest (API Testing trong Jest)**
```javascript
// tests/scenarios/operator-routes.test.ts
describe('Scenario 2: Operator manages routes', () => {
  let accessToken;
  let routeId;
  
  it('Step 1: Register as operator', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        method: 'email',
        email: 'operator@test.com',
        password: 'Operator@123',
        role: 'OPERATOR',
        agreeToTerms: true
      });
    
    expect(response.status).toBe(201);
    accessToken = response.body.data.accessToken;
  });
  
  it('Step 2: Create route', async () => {
    const response = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Route',
        origin: 'HCM',
        destination: 'Vung Tau',
        // ...
      });
    
    expect(response.status).toBe(201);
    routeId = response.body.data.id;
  });
  
  // ...
});
```

---

## 📊 Tóm tắt

| Khía cạnh | Chi tiết |
|-----------|----------|
| **Testing Scenarios là gì** | Kịch bản test E2E mô phỏng hành vi user thực tế |
| **Mục đích** | Hướng dẫn Frontend, QA, đảm bảo flow hoạt động đúng |
| **Khi nào dùng** | Development, QA testing, CI/CD, Regression testing |
| **Tools** | Postman, Newman, Playwright, Cypress, Supertest |
| **Lợi ích** | Phát hiện bug sớm, tài liệu rõ ràng, tự động hóa được |

---

**Kết luận:** Testing Scenarios giúp cả team (Frontend, Backend, QA, PM) hiểu rõ hệ thống hoạt động như thế nào và đảm bảo tính năng luôn work!
