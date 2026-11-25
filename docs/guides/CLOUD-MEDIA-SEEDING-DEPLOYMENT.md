# Lưu trữ hình ảnh Cloudinary, sinh dữ liệu quy mô 5.000 người dùng và deploy Cloud

Tài liệu này mô tả kiến trúc xử lý hình ảnh qua Cloudinary CDN, quy trình thu thập tài nguyên ảnh nhà xe kết hợp sinh dữ liệu quy mô 5.000 người dùng, cùng quy trình deploy toàn bộ hệ thống VeXeViet (`vexeviet-be` và `vexeviet-fe`) lên hạ tầng Cloud miễn phí (Vercel, Render, TiDB Cloud, Upstash Redis và Cloudinary).

---

## 1. Kiến trúc lưu trữ và phân phối hình ảnh qua Cloudinary

Hệ thống quản lý toàn bộ tác vụ tải lên, tối ưu và xoá hình ảnh tại `services/user-service/src/utils/image-upload.ts`, đồng thời hỗ trợ song song hai chế độ lưu trữ (`cloudinary` và `local`) mà không cần thay đổi giao diện hay hợp đồng API phía Frontend.

```mermaid
flowchart LR
  Client["Web / Admin Client"] -->|"Multipart POST/PUT (<= 5 MB)"| GW["API Gateway (:3000)"]
  GW --> US["user-service (:3001)"]
  US -->|"1. Kiểm tra magic bytes"| Validator["detectImageType()"]
  Validator -->|"2. Signed POST SHA-1"| CloudAPI["Cloudinary Upload API"]
  CloudAPI -->|"3. Trả secure_url"| Transform["Chèn f_auto,q_auto,c_limit"]
  Transform -->|"4. Lưu URL HTTPS"| DB[("MySQL / TiDB")]
  Client -->|"5. Tải ảnh AVIF/WebP"| CDN["res.cloudinary.com CDN"]
```

### Cơ chế chọn driver lưu trữ

Hàm `resolveStorageDriver()` quyết định nơi lưu trữ dựa trên biến môi trường tại thời điểm chạy:

| Biến `IMAGE_STORAGE` | Biến xác thực Cloudinary | Môi trường (`NODE_ENV`) | Hành vi thực thi |
| :--- | :--- | :--- | :--- |
| `cloudinary` | Đã cấu hình | Mọi môi trường | Lưu và xoá trực tiếp trên Cloudinary. |
| `cloudinary` | Thiếu cấu hình | Mọi môi trường | Ném lỗi `ImageUploadError` (HTTP `500`). |
| Không đặt | Đã cấu hình | Mọi môi trường | Tự động chọn chế độ `cloudinary`. |
| Không đặt | Thiếu cấu hình | `production` | Chặn bằng lỗi HTTP `500` để ngăn mất dữ liệu trên ổ đĩa tạm của container. |
| Không đặt | Thiếu cấu hình | `development` / `test` | Tự động `fallback` về thư mục cục bộ `UPLOAD_DIR` (`<cwd>/uploads`). |
| `local` | Bất kỳ | Mọi môi trường | Lưu trên ổ đĩa cục bộ (chỉ dùng cho server có gắn persistent volume). |

Hệ thống chấp nhận cấu hình Cloudinary qua bộ ba biến rời (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) hoặc qua một chuỗi kết nối gộp `CLOUDINARY_URL` theo cú pháp `cloudinary://<api_key>:<api_secret>@<cloud_name>`.

### Kiểm tra an toàn tệp đầu vào

Trước khi gửi dữ liệu lên Cloud, mọi request đi qua hai lớp kiểm soát trong `image-upload.ts`:
1. **Giới hạn kích thước ở tầng `middleware`**: `singleImageUpload` dùng `multer.memoryStorage()` với trần `MAX_IMAGE_BYTES = 5 * 1024 * 1024` (5 MB, tối đa 1 tệp mỗi request tại trường `file`). Tệp vượt quá 5 MB bị từ chối ngay với mã HTTP `413`.
2. **Xác thực nội dung nhị phân (`detectImageType`)**: Hệ thống không tin trường `mimetype` do trình duyệt khai báo mà đối chiếu trực tiếp các byte đầu tiên của `Buffer`:
   - `JPEG`: `FF D8 FF`
   - `PNG`: `89 50 4E 47 0D 0A 1A 0A`
   - `WebP`: `RIFF....WEBP`
   Các định dạng khác (bao gồm `SVG` có nguy cơ chứa mã thực thi XSS) đều bị từ chối với mã HTTP `415`.

### Quy trình tải lên có chữ ký và tối ưu đường dẫn CDN

Khi lưu ảnh qua `saveImage(file, folder)`, `user-service` sinh định danh ngẫu nhiên `public_id = randomUUID()`, đặt thư mục đích `${CLOUDINARY_FOLDER}/${folder}` (mặc định tiền tố là `vexeviet`, gồm 4 phân vùng `avatars`, `operator-avatars`, `interior`, `exterior`) và tạo chữ ký `SHA-1` trên chuỗi tham số đã sắp xếp theo thứ tự bảng chữ cái trước khi gọi `POST https://api.cloudinary.com/v1_1/<cloud_name>/image/upload` (giới hạn `timeout` 30 giây).

Ngay khi nhận `secure_url` từ Cloudinary, hàm `injectCloudinaryTransformation()` chèn chuỗi biến đổi trực tiếp vào đường dẫn trước khi ghi xuống cơ sở dữ liệu:
- **Ảnh đại diện cá nhân và logo nhà xe (`avatars`, `operator-avatars`)**: `f_auto,q_auto,c_limit,w_512,h_512` (giữ nguyên tỷ lệ gốc và nền trong suốt của logo ngang, thu gọn trong khung 512x512, tự động chuyển sang AVIF/WebP tuỳ trình duyệt và loại bỏ metadata EXIF/GPS).
- **Ảnh nội thất và ngoại thất xe (`interior`, `exterior`)**: `f_auto,q_auto,c_limit,w_1600,h_1200` (giới hạn độ phân giải tối đa 1600x1200, giảm dung lượng tải trang khoảng 75%-85% so với ảnh gốc từ điện thoại).

### Quy trình xoá tài nguyên cũ và dọn bộ nhớ đệm CDN

Khi người dùng đổi ảnh đại diện hoặc nhà xe xoá ảnh khỏi thư viện, `deleteImageByUrl(url)` xử lý theo dạng `best-effort` (ghi log nếu lỗi mạng nhưng không làm hỏng giao dịch chính của người dùng):
- **Với đường dẫn Cloudinary**: Hàm `extractCloudinaryPublicId()` kiểm tra nghiêm ngặt tên miền `res.cloudinary.com`, đối chiếu đúng `cloudName` hiện hành và yêu cầu `public_id` phải bắt đầu bằng `${CLOUDINARY_FOLDER}/` (không chứa `..`). Nếu hợp lệ, hệ thống ký yêu cầu `POST .../image/destroy` kèm `invalidate=true` để xoá cả bản gốc lẫn bản lưu trong cache CDN. Ảnh từ miền ngoài hoặc từ tài khoản Cloudinary khác tự động bị bỏ qua.
- **Với đường dẫn cục bộ cũ (`/api/v1/uploads/...`)**: Hệ thống giữ nguyên nhánh kiểm tra chống leo thang thư mục (`path traversal`) và xoá tệp trên đĩa nhằm tương thích với dữ liệu cũ trong quá trình chuyển đổi.

### Đồng bộ hiển thị phía Backend và Frontend

- **Truy vấn thông tin nhà xe trong `booking-service`**: `BookingRepository` (`findById`, `findByCode`, `findMany`, `findByUserId`), `BookingService.createBooking` và `formatBookingResponse` tại `services/booking-service` trả đầy đủ trường `route.operator.operatorAvatarUrl`, `duration` và `licensePlate`.
- **Giải phân giải đường dẫn (`resolveMediaUrl`)**: Gói dùng chung `@vexeviet/api-client` (`packages/api-client/src/media.ts`) giữ nguyên các URL bắt đầu bằng `https://`, `http://`, `data:`, `blob:` và chỉ ghép `NEXT_PUBLIC_API_URL` cho đường dẫn tương đối `/api/...`. Các trang tra cứu vé (`apps/web/src/app/(marketing)/booking/lookup/page.tsx`) và lịch sử đặt vé (`apps/web/src/app/(marketing)/profile/bookings/page.tsx`) đều đi qua bộ giải phân giải này để tránh lỗi 404 khi Frontend và Backend đặt ở hai tên miền khác nhau.
- **Cấu hình Next.js, CSP và PWA (`vexeviet-fe`)**:
  - Cả `apps/web/next.config.js` và `apps/admin/next.config.js` đều khai báo `res.cloudinary.com` trong `images.remotePatterns`.
  - Header `Content-Security-Policy` của `apps/web` cho phép tường minh `https://res.cloudinary.com`, `https://images.unsplash.com`, `https://upload.wikimedia.org`, `https://placehold.co` và giao thức `https:` (chỉ mở thêm `http:` khi chạy `development`).
  - Service Worker PWA (`@ducanh2912/next-pwa`) bổ sung vùng đệm `cloudinary-images` theo chiến lược `CacheFirst` (tối đa 200 ảnh, thời hạn 30 ngày, lưu các phản hồi mã `0` và `200`).

---

## 2. Pipeline thu thập ảnh nhà xe thực tế (`media:harvest`)

Tập lệnh `scripts/harvest-operator-images.mjs` xây dựng kho ảnh thật trên Cloudinary cho 25 hãng xe liên tỉnh tại Việt Nam và xuất danh mục cố định ra tệp `packages/database/prisma/operator-media-manifest.json`.

### Quy trình thu thập 3 bước

1. **Sinh bộ biểu trưng thương hiệu cho 25 nhà xe**: Tập lệnh dựng trực tiếp ảnh PNG `256x256` RGBA bằng mô-đun nén `node:zlib` tích hợp sẵn (không phụ thuộc thư viện đồ hoạ native như `canvas`), áp dụng đúng bảng màu nhận diện và mã viết tắt của từng hãng (ví dụ: cam `#EA580C` cho Phương Trang FUTA, xanh lá `#15803D` cho Thành Bưởi, xanh ngọc `#059669` cho Mai Linh Express, đỏ `#DC2626` cho Kumho Samco, xanh dương `#1D4ED8` cho Hoàng Long Asia), sau đó tải lên `vexeviet/seed/operator-avatars/<slug>`.
2. **Thu thập ảnh ngoại thất và nội thất thực tế**: Tập lệnh gọi MediaWiki API của Wikimedia Commons (`action=query&generator=search&gsrnamespace=6&prop=imageinfo`) với các truy vấn chuyên biệt về xe khách Việt Nam, xe giường nằm, Hyundai Universe, Thaco Mobihome và khoang ghế limousine, kết hợp bộ ảnh dự phòng chất lượng cao:
   - Bộ lọc loại bỏ các tệp không phải ảnh chụp phương tiện dựa trên tiêu đề (bản đồ, sơ đồ tuyến, vé xe, biển báo, tai nạn), chỉ giữ ảnh ngang (`width >= height`, tối thiểu `640x400`), dung lượng nằm trong khoảng `15 KB - 5 MB` và vượt qua kiểm tra magic bytes nhị phân.
   - Hệ thống tải 26 ảnh ngoại thất lên `vexeviet/seed/exterior/*` và 18 ảnh nội thất lên `vexeviet/seed/interior/*` (tổng cộng **69 tài nguyên ảnh riêng biệt** trên Cloudinary, tiêu thụ chưa tới 0,5% hạn mức 25 credits/tháng của gói Cloudinary Free).
3. **Phân phối vào tệp `manifest`**: Mỗi nhà xe trong 25 hãng được gán cố định 1 `operatorAvatarUrl`, 5 `exteriorImages` và 5 `interiorImages`.

### Cách chạy tập lệnh thu thập ảnh

Chạy tại thư mục gốc `vexeviet-be`:

```bash
# Bỏ qua tải lại nếu operator-media-manifest.json đã khớp tài khoản Cloudinary hiện hành
pnpm media:harvest

# Buộc thu thập và ghi đè lại toàn bộ tài nguyên trên Cloudinary
FORCE_HARVEST=true pnpm media:harvest
```

---

## 3. Bộ sinh dữ liệu quy mô 5.000 người dùng (`db:seed:5k`)

Tập lệnh `packages/database/prisma/seed-scale-5k.ts` khởi tạo tập dữ liệu vận hành hoàn chỉnh ở quy mô 5.000 người dùng, bao phủ cả dữ liệu lịch sử để vẽ biểu đồ quản trị lẫn dữ liệu tương lai để đặt vé trực tiếp.

### Định lượng bản ghi theo từng bảng

| Bảng dữ liệu | Số lượng bản ghi | Chi tiết phân bổ dữ liệu |
| :--- | :--- | :--- |
| `users` | **5.000** | `2` tài khoản `ADMIN`, `25` tài khoản `OPERATOR` (gắn ảnh từ `operator-media-manifest.json`), `4.973` tài khoản `CUSTOMER` (tên Việt Nam, SĐT 10 số không trùng lặp, ~89% `ACTIVE`, ~8% `PENDING_VERIFICATION`, ~3% `SUSPENDED`). |
| `bus_templates` | **7** | Khớp chính xác 7 giao diện sơ đồ ghế của Frontend (`SLEEPER_42`, `SLEEPER_34`, `LIMOUSINE_20`, `LIMOUSINE_22`, `LIMOUSINE_34`, `VIP_29`, `STANDARD_45`). |
| `seats` | **226** | Đúng số ghế thực tế của từng sơ đồ (ví dụ: `SLEEPER_34` có 18 giường tầng dưới + 16 giường tầng trên; `VIP_29` có 7 hàng 4 ghế + 1 ghế cuối). |
| `buses` | **250** | Mỗi nhà xe sở hữu 10 đầu xe với biển kiểm soát theo đúng mã tỉnh đặt trụ sở (`51B`, `29B`, `43B`, `15B`, `37B`, `65B`, `72B`, `79B`...). |
| `routes` | **~3.800 - 4.200** | Trải trên 60 chiều tuyến liên tỉnh (30 cặp khứ hồi Bắc - Trung - Nam) trong cửa sổ từ `-30` ngày trước đến `+21` ngày tới, đính kèm điểm đón/trả tại các bến xe thực tế và ảnh xe từ Cloudinary. |
| `bookings` | **~9.500 - 10.500** | Phân phối theo hàm luỹ thừa để tạo nhóm khách đi thường xuyên; bao gồm đầy đủ trạng thái `COMPLETED`, `CONFIRMED`, `PENDING`, `CANCELLED`, `EXPIRED`. |
| `booking_seats` | **~15.000 - 17.500** | Chỉ khoá ghế cho các đơn `CONFIRMED`, `COMPLETED`, `PENDING`; các chuyến sắp khởi hành có độ lấp đầy tự nhiên từ 15%-65% giúp sơ đồ chọn ghế hiển thị trực quan. |
| `booking_passengers` | **~18.000 - 20.000** | Thông tin hành khách kèm số CCCD và mã ghế tương ứng với từng đơn. |
| `payments` & `transactions` | **~9.000 / ~9.500** | Phân bổ qua `VNPAY`, `MOMO`, `BANK_TRANSFER`, `ZALOPAY`, `CASH`; tự động tạo thêm giao dịch `REFUND` (hoàn 85%) cho các đơn huỷ đã thanh toán. |
| `operator_reviews` | **~2.000 - 2.400** | Gắn 1-1 với các chuyến quá khứ đã hoàn thành, điểm trung bình phân hoá từ `4.1` đến `4.9` sao tuỳ nhà xe, khoảng 68% đánh giá có câu phản hồi từ nhà xe. |
| `audit_logs` | **240** | Nhật ký vận hành của Admin và Nhà xe trong 30 ngày gần nhất phục vụ màn hình tra cứu Audit Logs. |

### Thiết kế tối ưu tốc độ nạp qua mạng Cloud TLS

Để nạp hơn 60.000 dòng qua kết nối mạng tới cơ sở dữ liệu từ xa (như TiDB Cloud) trong khoảng 20-40 giây thay vì hàng chục phút, `seed-scale-5k.ts` áp dụng 4 kỹ thuật:
- **Tiền băm mật khẩu một lần**: Chỉ gọi `bcrypt.hash` đúng 2 lần (1 cho Admin, 1 cho mật khẩu chuẩn của tài khoản mẫu) thay vì băm lại 5.000 lần.
- **Khởi tạo khoá ngoại trong bộ nhớ**: Sinh trước toàn bộ `UUID` cho mọi thực thể và kiểm tra các ràng buộc không trùng lặp (`email`, `phone`, `licensePlate`, mã vé song ánh 10 ký tự `VXV...`, tổ hợp `[routeId, departureDate, seatNumber]`) ngay trong RAM.
- **Chèn theo lô (`batch`) 500 bản ghi**: Toàn bộ các bảng đều ghi bằng `prisma.<model>.createMany({ data: slice })` với kích thước lô 500 dòng để không vượt giới hạn kích thước gói tin SQL.
- **Bộ sinh số giả ngẫu nhiên tất định (Mulberry32)**: Đảm bảo tỷ lệ phân bổ dữ liệu ổn định giữa các lần chạy.

### Cách chạy nạp dữ liệu và tài khoản kiểm thử

```bash
# Chạy tại thư mục gốc vexeviet-be (nạp vào DATABASE_URL hiện có trong .env)
pnpm db:seed:5k
```

Các tài khoản tiêu biểu sau khi nạp dữ liệu:
- **Quản trị viên (`ADMIN`)**: Đọc từ `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `.env` (mặc định `admin@vexeviet.com` / `Admin@123456`).
- **Nhà xe (`OPERATOR`)**: `phuongtrang@vexeviet.com` / `Password@123` (hoặc bất kỳ email nào trong 25 nhà xe như `thanhbuoi@vexeviet.com`, `mailinh@vexeviet.com`, `hoanglong@vexeviet.com`).
- **Khách hàng (`CUSTOMER` có sẵn lịch sử chuyến đi)**: `customer@vexeviet.com` / `Password@123`.

---

## 4. Kiến trúc và quy trình deploy hệ thống lên Cloud miễn phí

### Cơ chế gom 1 tiến trình cho Backend trên Render Free

Trên các nền tảng container miễn phí giới hạn 512 MB RAM và 750 giờ chạy mỗi tháng như Render Free, việc tách rời 5 dịch vụ Node.js thành 5 container riêng biệt gây tràn hạn mức giờ miễn phí, vượt trần RAM (do khởi tạo 4 tiến trình Prisma Query Engine độc lập) và tạo lỗi `503 Service Unavailable` khi nhiều dịch vụ cùng thức dậy (`cold start`) nối tiếp nhau.

Để giải quyết triệt để mà vẫn giữ nguyên ranh giới mã nguồn microservices:
1. **Chia sẻ Prisma Client dùng chung (`packages/database/src/index.ts`)**: Lưu thực thể `prisma` vào `globalThis.prisma` trong mọi môi trường để cả 4 dịch vụ dùng chung một kết nối và một Rust Query Engine.
2. **Trình khởi chạy hợp nhất (`scripts/start-unified.js`)**: Nạp đồng thời `user-service` (`127.0.0.1:3001`), `route-service` (`127.0.0.1:3002`), `booking-service` (`127.0.0.1:3003`), `payment-service` (`127.0.0.1:3004`) và mở cổng công khai cho `api-gateway` (`0.0.0.0:$PORT`) bên trong **một tiến trình Node.js hợp nhất** (tiêu thụ khoảng 140-170 MB RAM, độ trễ nội bộ dưới 1 ms).
3. **Tự động migrate và nạp dữ liệu lần đầu (`docker-entrypoint.sh`)**: Khi bật `RUN_MIGRATIONS=true` và `SEED_IF_EMPTY=true` (đã cấu hình sẵn trong `render.yaml`), ngay ở lần khởi động đầu tiên khi bảng `users` có ít hơn 10 bản ghi, container tự chạy `prisma migrate deploy` rồi thực thi bản biên dịch `/app/packages/database/dist/seed-scale-5k.js` trước khi mở cổng đón lưu lượng. Ở mọi lần khởi động lại tiếp theo (`users >= 10`), bước nạp dữ liệu tự động được bỏ qua.
4. **Hỗ trợ Redis TLS (`packages/common/src/redis/index.ts`)**: `createRedisClient()` tự động nhận diện tiền tố `rediss://` trong biến `REDIS_URL` để bật cấu hình `tls: {}` khi kết nối tới Upstash Redis.

### Tham chiếu biến môi trường Production

#### Backend (`vexeviet-be` trên Render)

| Biến môi trường | Bắt buộc | Giá trị mẫu / Mặc định | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Có | `production` | Bật kiểm tra bảo mật `JWT_SECRET`, `DATABASE_URL` và `Cloudinary`. |
| `PORT` | Tự động | `10000` (Render cấp) | Cổng lắng nghe công khai của `api-gateway`. |
| `TRUST_PROXY_HOPS` | Khuyên dùng | `1` | Số tầng reverse proxy phía trước để lấy đúng IP cho bộ giới hạn tốc độ (`rate limiter`). |
| `RUN_MIGRATIONS` | Khuyên dùng | `true` | Tự động chạy `prisma migrate deploy` khi container khởi động. |
| `SEED_IF_EMPTY` | Khuyên dùng | `true` | Tự động bơm bộ dữ liệu 5.000 người dùng nếu cơ sở dữ liệu đang trống (`users < 10`). |
| `DATABASE_URL` | Có | `mysql://...:4000/vexeviet?sslaccept=strict` | Chuỗi kết nối MySQL có bật TLS từ TiDB Cloud Starter. |
| `REDIS_URL` | Có | `rediss://default:...@....upstash.io:6379` | Chuỗi kết nối Redis có TLS từ Upstash. |
| `JWT_SECRET` | Có | Tối thiểu 32 ký tự | Khoá ký JWT (tự sinh trong `render.yaml`). |
| `BOOKING_SERVICE_INTERNAL_API_KEY` | Có | Chuỗi bí mật bất kỳ | Khoá xác thực gọi nội bộ từ `payment-service` sang `booking-service`. |
| `CLOUDINARY_CLOUD_NAME` | Có | `dyld9ju74` | Định danh tài khoản Cloudinary. |
| `CLOUDINARY_API_KEY` | Có | Chuỗi số | API Key của Cloudinary. |
| `CLOUDINARY_API_SECRET` | Có | Chuỗi bí mật | API Secret dùng để tạo chữ ký `SHA-1`. |
| `CLOUDINARY_FOLDER` | Không | `vexeviet` | Thư mục gốc lưu trữ ảnh trên Cloudinary. |
| `WEB_URL` | Có | `https://vexeviet-web.vercel.app` | Địa chỉ ứng dụng khách hàng dùng trong liên kết đặt lại mật khẩu qua email. |
| `FRONTEND_PAYMENT_RESULT_URL` | Có | `https://vexeviet-web.vercel.app/payment/result` | Trang nhận kết quả chuyển hướng sau khi thanh toán xong. |
| `VNPAY_TMN_CODE` | Tuỳ chọn | Mã định danh sandbox | Mã website đăng ký với cổng thanh toán VNPay. |
| `VNPAY_HASH_SECRET` | Tuỳ chọn | Chuỗi bí mật sandbox | Khoá kiểm tra chữ ký webhook VNPay. |
| `VNPAY_RETURN_URL` | Tuỳ chọn | `https://<api>.onrender.com/api/v1/webhooks/vnpay/return` | Endpoint Backend nhận callback trả về từ VNPay. |

#### Frontend (`vexeviet-fe` trên Vercel)

| Ứng dụng | Root Directory | Biến môi trường | Giá trị cần đặt |
| :--- | :--- | :--- | :--- |
| Customer Web | `apps/web` | `NEXT_PUBLIC_API_URL` | `https://<ten-service-render>.onrender.com` (không có dấu `/` hay `/api/v1` ở cuối). |
| Customer Web | `apps/web` | `GEMINI_API_KEY` | Khoá API Google Gemini phục vụ route `/api/analyze-trip`. |
| Admin Console | `apps/admin` | `NEXT_PUBLIC_API_URL` | `https://<ten-service-render>.onrender.com`. |

### Quy trình thực thi deploy từ đầu đến cuối

1. **Khởi tạo cơ sở dữ liệu trên TiDB Cloud**:
   - Tạo cụm **Starter (Free)** tại vùng `Singapore (ap-southeast-1)` trên TiDB Cloud.
   - Mở cửa sổ **SQL Editor** trên TiDB Cloud, chạy câu lệnh `CREATE DATABASE IF NOT EXISTS vexeviet;`.
   - Mở mục **Connect**, chọn công cụ **Prisma**, tạo mật khẩu và sao chép chuỗi `DATABASE_URL` có hậu tố `?sslaccept=strict`.
2. **Khởi tạo bộ nhớ đệm trên Upstash Redis**:
   - Tạo cơ sở dữ liệu Redis miễn phí tại vùng `Singapore` trên Upstash.
   - Mở mục **Connect -> Node (ioredis)** và sao chép chuỗi kết nối bắt đầu bằng `rediss://`.
3. **Triển khai Backend bằng Render Blueprint**:
   - Đăng nhập Render Dashboard, chọn **New -> Blueprint** và kết nối tới kho mã nguồn `BenWork17/vexeviet-be`.
   - Render đọc tệp `render.yaml` và hiển thị biểu mẫu nhập các biến `sync: false`: điền `DATABASE_URL`, `REDIS_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   - Bấm **Apply**: container tự động build image, chạy `prisma migrate deploy`, nạp trọn bộ 5.000 người dùng vào TiDB Cloud (khi DB trống) và mở cổng tại `https://<ten-service>.onrender.com`.
   - Kiểm tra hoạt động qua đường dẫn `https://<ten-service>.onrender.com/health` và `https://<ten-service>.onrender.com/api/v1/routes`.
   - Để giữ container không chuyển sang trạng thái ngủ sau 15 phút vắng truy cập, tạo lịch gọi `GET` mỗi 14 phút tới `/health` trên dịch vụ miễn phí `cron-job.org`.
4. **Triển khai hai ứng dụng Frontend trên Vercel**:
   - Trên Vercel Dashboard, chọn **Add New Project**, chọn kho mã nguồn `BenWork17/vexeviet-fe`, đặt **Root Directory** là `apps/web`, khai báo `NEXT_PUBLIC_API_URL` cùng `GEMINI_API_KEY`, sau đó bấm **Deploy**.
   - Tiếp tục chọn **Add New Project** lần thứ hai từ cùng kho `BenWork17/vexeviet-fe`, đặt **Root Directory** là `apps/admin`, khai báo `NEXT_PUBLIC_API_URL`, sau đó bấm **Deploy**.
   - Quay lại mục **Environment** của dịch vụ trên Render, cập nhật `WEB_URL` và `FRONTEND_PAYMENT_RESULT_URL` theo tên miền chính thức của dự án `apps/web` vừa được Vercel cấp.

---

## 5. Xử lý sự cố thường gặp

- **Lỗi HTTP `500` kèm thông báo thiếu thông tin Cloudinary khi tải ảnh**: Môi trường `production` đang chạy mà chưa khai báo đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (hoặc `CLOUDINARY_URL`). Cần bổ sung đủ 3 biến này và khởi động lại dịch vụ.
- **Lỗi kết nối TLS tới TiDB Cloud trong container**: Chuỗi `DATABASE_URL` thiếu tham số `?sslaccept=strict` ở cuối, hoặc tên cơ sở dữ liệu `vexeviet` chưa được tạo trước bằng lệnh `CREATE DATABASE`.
- **Lỗi `413 Request Entity Too Large` khi tự triển khai sau Nginx riêng**: Mặc định Nginx chặn thân gói tin ở mức 1 MB trong khi hệ thống cho phép ảnh tối đa 5 MB. Cần thêm cấu hình `client_max_body_size 10M;` vào khối `server` của Nginx.
- **Ảnh logo nhà xe không tải được trên trang tra cứu vé**: Kiểm tra biến `NEXT_PUBLIC_API_URL` trên Vercel đã trỏ đúng về gốc tên miền HTTPS của Backend (không có `/api/v1` ở cuối) rồi thực hiện `Redeploy` lại gói Frontend vì các biến `NEXT_PUBLIC_*` được nhúng tĩnh vào mã JavaScript lúc build.
