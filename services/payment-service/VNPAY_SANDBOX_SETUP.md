# Hướng dẫn lấy VNPay Sandbox Credentials

## ⚠️ QUAN TRỌNG

**KHÔNG CÓ** TMN Code và Hash Secret "công khai" nào mà ai cũng dùng được.  
Bạn **PHẢI** đăng ký tài khoản sandbox riêng của mình trên VNPay.

## 🔐 Cách lấy Sandbox Credentials

### Bước 1: Đăng ký tài khoản Sandbox

**Option A: Đăng ký thông qua VNPay (Khuyến nghị)**

1. Truy cập: **https://sandbox.vnpayment.vn/merchantv2/**
2. Click **"Đăng ký"** (Register) ở góc phải
3. Điền thông tin:
   - Email (dùng email thật để nhận xác thực)
   - Tên doanh nghiệp (có thể điền tên test)
   - Số điện thoại
   - Mật khẩu
4. Xác thực email
5. Đăng nhập vào merchant portal
6. Vào **Cài đặt → Thông tin tài khoản** để lấy:
   - **Website Code** (vnp_TmnCode) - Dạng: `XXXXXXXX`
   - **Secret Key** (vnp_HashSecret) - Dạng: chuỗi 32-64 ký tự

**Option B: Dùng Demo Account (Tạm thời)**

VNPay có cung cấp demo account nhưng **có giới hạn**:
- Truy cập: https://sandbox.vnpayment.vn/apis/vnpay-demo/
- Trang này có thể có form để lấy test credentials
- Hoặc liên hệ support@vnpay.vn để xin demo credentials

### Bước 2: Cấu hình vào .env

Sau khi có credentials, thêm vào file `.env`:

```env
# VNPay Sandbox Credentials (Thay bằng giá trị thực tế)
VNPAY_TMN_CODE=2QXUI4B4          # ← Thay bằng Website Code từ VNPay
VNPAY_HASH_SECRET=ABCD1234...    # ← Thay bằng Secret Key từ VNPay
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/result
```

### Bước 3: Cấu hình ngân hàng hỗ trợ

Sau khi đăng ký sandbox, bạn cần **kích hoạt** ngân hàng:

1. Đăng nhập vào merchant portal: https://sandbox.vnpayment.vn/merchantv2/
2. Vào **Cài đặt → Phương thức thanh toán**
3. Tick chọn các ngân hàng muốn dùng (ít nhất chọn **NCB**)
4. Lưu thay đổi

**Lưu ý:** Nếu không kích hoạt ngân hàng, sẽ bị lỗi:
```
❌ Ngân hàng thanh toán không được hỗ trợ
```

### Bước 4: Test thanh toán

Khi test trên sandbox, dùng **Bank Code: NCB**:

```json
{
  "bookingId": "...",
  "amount": 100000,
  "method": "VNPAY",
  "returnUrl": "http://localhost:3000/payment/result",
  "bankCode": "NCB"
}
```

Hoặc **không gửi bankCode** để VNPay hiển thị trang chọn ngân hàng.

### Bước 5: Test OTP trên Sandbox

VNPay sandbox **KHÔNG** kết nối ngân hàng thật. Bạn cần dùng test OTP:

**Thông tin test cho sandbox NCB:**
- Số thẻ: `9704198526191432198`
- Tên chủ thẻ: `NGUYEN VAN A`
- Ngày phát hành: `07/15`
- Mã OTP: `123456` (OTP cố định cho sandbox)

## 🔍 Debug khi bị lỗi

### Lỗi: "Ngân hàng thanh toán không được hỗ trợ"

**Nguyên nhân:**
1. **TMN Code sai** hoặc không tồn tại trên sandbox
2. **Merchant chưa kích hoạt** ngân hàng trong merchant portal
3. **Bank Code** gửi không đúng format hoặc không được hỗ trợ

**Cách fix:**
1. Kiểm tra TMN Code trong `.env` có đúng với giá trị VNPay cấp
2. Đăng nhập merchant portal → kích hoạt ngân hàng
3. Test với `bankCode: "NCB"` hoặc không gửi bankCode

### Lỗi: "Invalid Signature" (97)

**Nguyên nhân:**
- Hash Secret sai
- Encoding URL không khớp

**Cách fix:**
- Copy chính xác Hash Secret từ VNPay (không thêm/bớt ký tự)
- Kiểm tra code đã dùng URLSearchParams (✅ đã fix trong code mới)

### Xem debug log

Khi tạo payment, console sẽ hiện:

```
=== VNPay Debug ===
TMN Code: 2QXUI4B4
Hash Secret (first 8 chars): ABCD1234...
Bank Code: NCB
Amount (VND): 100000 → VNPay Amount: 10000000
Payment URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...
===================
```

Kiểm tra:
- TMN Code **KHÔNG** phải `VEXEVIET` hoặc rỗng
- Hash Secret **KHÔNG** phải `VNPAY_SANDBOX_SECRET_KEY_FOR_TESTING`
- Amount × 100 phải đúng

## 📝 Supported Bank Codes (Sandbox)

Các ngân hàng **có thể** hỗ trợ trên sandbox (tùy merchant config):

| Bank Code | Tên Ngân Hàng |
|-----------|---------------|
| NCB | Ngân hàng Quốc Dân |
| VIETCOMBANK | Ngân hàng Ngoại Thương |
| VIETINBANK | Ngân hàng Công Thương |
| BIDV | Ngân hàng Đầu tư và Phát triển |
| TECHCOMBANK | Ngân hàng Kỹ Thương |
| AGRIBANK | Ngân hàng Nông nghiệp |
| MBBANK | Ngân hàng Quân Đội |
| ACB | Ngân hàng Á Châu |
| VPBANK | Ngân hàng Việt Nam Thịnh Vượng |
| SACOMBANK | Ngân hàng Sài Gòn Thương Tín |

**Khuyến nghị:** Dùng **NCB** khi test trên sandbox.

## 🆘 Liên hệ Support

Nếu gặp vấn đề khi đăng ký sandbox:

- **Email:** support@vnpay.vn
- **Hotline:** 1900 55 55 77
- **Website:** https://vnpay.vn/ho-tro

---

**Lưu ý:** Credentials sandbox **KHÔNG** dùng được cho production. Production cần đăng ký chính thức và ký hợp đồng với VNPay.
