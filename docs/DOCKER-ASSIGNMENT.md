# DOCKER ASSIGNMENT - Dockerfile, Docker Compose & docker-entrypoint

> Bài nộp môn học: tìm hiểu và thực hành Dockerfile, Docker Compose, docker-entrypoint.
> File này giải thích cách hoạt động, các lệnh đã sử dụng và lý do sử dụng.

---

## 1. Bảng đối chiếu yêu cầu

| # | Yêu cầu | Trạng thái | Vị trí trong project |
|---|---------|-----------|----------------------|
| 1 | Dùng ít nhất 1 base image phù hợp | ✅ | `node:18-alpine` - `services/user-service/Dockerfile:5,32` và `services/payment-service/Dockerfile:5,32` |
| 2 | Dockerfile có ≥3 lệnh `RUN` với 3 mục đích khác nhau | ✅ | 6 lệnh `RUN` (3 mục đích trở lên) - xem mục 2.2 |
| 3 | Giải thích sự khác nhau `RUN` / `CMD` / `ENTRYPOINT` | ✅ | Mục 2.3 + có `ENTRYPOINT` thật trong cả 2 Dockerfile |
| 4 | Tạo `docker-entrypoint.sh`, dùng khi container khởi động | ✅ | `docker-entrypoint.sh` (repo root) + `ENTRYPOINT` ở cuối 2 Dockerfile |
| 5 | Phân quyền user (không chạy root): `USER`, `chown`, `chmod` | ✅ | User `app` + `chown` + `chmod 555` - xem mục 3 |
| 6 | `docker-compose.yml` để **build và chạy** container (env/volume/port) | ✅ | `docker-compose.yml` - có `build:` cho `user-service`, `payment-service`; có environment, volume, port, network, healthcheck, depends_on |
| 7 | Cơm thêm: security + cách deploy CI/CD an toàn | ✅ | Mục 5 + `.github/workflows/ci.yml` |
| 8 | File mô tả ngắn giải thích cách hoạt động | ✅ | File này - `docs/DOCKER-ASSIGNMENT.md` |

**Cách build & chạy:**

```bash
# Build + chạy cả app lẫn hạ tầng
docker compose up --build

# Chạy chỉ app
docker compose up --build user-service payment-service

# Kiểm tra user không phải root
docker compose exec user-service id
# -> uid=100(app) gid=100(app) groups=100(app)   ✅ KHÔNG PHẢI root

# Kiểm tra entrypoint chạy trước CMD
docker compose logs user-service | Select-String "entrypoint"
```

---

## 2. Dockerfile

Có 2 Dockerfile giống nhau về cấu trúc (chỉ khác service/port):
`services/user-service/Dockerfile` (port 3001) và `services/payment-service/Dockerfile` (port 3003).

### 2.1. Base image

```dockerfile
FROM node:18-alpine AS builder   # stage build
...
FROM node:18-alpine              # stage production
```

- **`node:18-alpine`**: image chính thức của Node.js 18 trên nền Alpine Linux.
- **Lý do chọn**: project dùng Node 18 + pnpm; bản `alpine` chỉ ~180MB (bản `node:18` full ~1GB),
  attack surface nhỏ hơn (ít package hơn = ít lỗ hổng CVE hơn).
- **Multi-stage build**: stage 1 (`builder`) chứa tool build (pnpm, typescript, devDependencies);
  stage 2 (production) chỉ chứa code đã build + dependencies chạy runtime → image cuối nhẹ hơn, an toàn hơn.

### 2.2. Các lệnh `RUN` và mục đích (yêu cầu ≥3 RUN, 3 mục đích khác nhau)

| # | Lệnh | Mục đích | Stage |
|---|------|----------|-------|
| 1 | `RUN npm install -g pnpm@8.12.0` | **Cài package/tool** (pnpm) | builder |
| 2 | `RUN pnpm install --frozen-lockfile` | **Cài dependency** (node_modules từ lockfile) | builder |
| 3 | `RUN pnpm build` | **Build** (tsc → `dist/`) | builder |
| 4 | `RUN addgroup -S app && adduser -S -G app app && mkdir -p /app/logs && chown -R app:app /app/logs` | **Chuẩn bị môi trường + phân quyền** (tạo user không-privileged, thư mục ghi, chown) | production |
| 5 | `RUN npm install -g pnpm@8.12.0 && pnpm install --prod --frozen-lockfile` | **Cài dependency production** (chỉ deps chạy được, không có devDeps) | production |
| 6 | `RUN sed -i 's/\r$//' ... && chmod 555 ...` | **Cấu hình permission** cho entrypoint script | production |

Đủ 3 nhóm mục đích theo đề bài: *cài package/dependency* (1,2,5), *tạo thư mục/chuẩn bị môi trường* (4), *cấu hình permission/build* (3,4,6).

### 2.3. Sự khác nhau RUN / CMD / ENTRYPOINT

| | `RUN` | `CMD` | `ENTRYPOINT` |
|---|-------|-------|--------------|
| **Chạy khi nào** | Lúc **build image** (tạo layer mới) | Lúc **container khởi động** | Lúc **container khởi động** |
| **Kết quả** | Thay đổi filesystem của image | Là lệnh chính của container | Là process cố định của container |
| **Ghi đè?** | Không áp dụng | `docker run <image> <cmd>` ghi đè được CMD | `docker run <image> <cmd>` **không** ghi đè, mà truyền làm **tham số** cho ENTRYPOINT |
| **Số lượng** | Nhiều (mỗi lệnh 1 layer) | 1 (lần cuối cùng wins) | 1 |
| **Ở project này** | 6 lệnh, ví dụ cài pnpm, build, chown | `CMD ["node", "dist/index.js"]` | `ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]` |

**Cách 2 cái phối hợp ở đây:**

```
docker compose up
   └─ ENTRYPOINT: /usr/local/bin/docker-entrypoint.sh
         1. In thông tin khởi động (không in secret)
         2. Chờ MySQL/Redis sẵn sàng (retry tối đa 60s)
         3. Tùy chọn: chạy migration (RUN_MIGRATIONS=true)
         4. exec node dist/index.js     ← CMD, được truyền vào làm "$@"
```

- Muốn đổi lệnh (vd debug): `docker compose run --rm user-service sh`
  → entrypoint vẫn chạy (chờ DB xong) rồi `exec sh` thay vì `node`.
- `exec "$@"` trong entrypoint: nhường quyền **PID 1** cho `node` để node nhận
  trực tiếp tín hiệu `SIGTERM` (docker stop) → process đóng sạch, không bị kill cứng.

---

## 3. docker-entrypoint.sh

**File:** `docker-entrypoint.sh` (đặt ở repo root vì build context là root).

### 3.1. Vì sao cần?

Container có thể khởi động **trước** MySQL/Redis (không phụ thuộc thứ tự `up`).
Nếu app kết nối ngay → crash. Entrypoint giải quyết việc này **ngoài app**
(app chỉ lo việc của nó, không nhồi logic "chờ" vào code).

### 3.2. Các bước

1. **Chào hỏi**: in `NODE_ENV`, user, uid (không in secret).
2. **Chờ hạ tầng**:
   - Trích `host:port` từ `DATABASE_URL` (hoặc `DB_HOST`/`DB_PORT` nếu set trực tiếp).
   - `wait_for_tcp()` dùng `node -e` + module `net` có sẵn (không cài `curl`/`nc` → giảm image size).
   - Retry 30 lần × 2s = tối đa 60s, hết mà chưa sẵn sàng → **thoát mã lỗi** (fail fast).
3. **Migration tùy chọn** (`RUN_MIGRATIONS=true`): chạy `prisma migrate deploy` nếu có CLI.
   Lưu ý: `prisma` là devDependency nên **không có trong production image** → script tự
   phát hiện và bỏ qua có cảnh báo (cách production chuẩn: migrate bằng job/CI riêng).
4. **`exec "$@"`**: truyền quyền PID 1 cho lệnh chính.

### 3.3. Biến môi trường điều khiển (đặt trong docker-compose.yml)

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `WAIT_FOR_DB` | `true` | Có chờ MySQL không |
| `WAIT_FOR_REDIS` | `true` | Có chờ Redis không |
| `WAIT_FOR_DB_TIMEOUT` | `30` (lần) | Số lần retry |
| `RUN_MIGRATIONS` | `false` | Có chạy migrate khi khởi động không |

---

## 4. Phân quyền user trong container (yêu cầu bắt buộc)

### 4.1. Vì sao KHÔNG được chạy app bằng root?

- Container mặc định chạy bằng **root**. Nếu attacker khai thác được lỗ hổng app
  (RCE/SSRF/dependency vuln) → chúng có **quyền root trong container**.
- Root trong container → dễ lợi dụng để **container escape** (qua kernel bug,
  mount `/proc`, docker socket...) để chiếm **host** - ảnh hưởng toàn bộ máy,
  các container khác.
- Nguyên tắc **least privilege**: process chỉ được cấp đúng quyền nó cần.

### 4.2. Các lệnh đã dùng

```dockerfile
# (4) Tạo user không-privileged + thư mục ghi + chown
RUN addgroup -S app && adduser -S -G app app && \
    mkdir -p /app/logs && \
    chown -R app:app /app/logs

# Copy file với owner là app (COPY --chown)
COPY --chown=app:app package.json ... ./packages ./...

# (6) chmod cho entrypoint: 555 = mọi user được đọc+chạy, KHÔNG ai được ghi
RUN chmod 555 /usr/local/bin/docker-entrypoint.sh

# Hạ quyền - mọi lệnh phía dưới chạy bằng user `app`
USER app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
```

### 4.3. Giải thích từng cơ chế

| Cơ chế | Lệnh | Mục đích |
|--------|------|----------|
| **Tạo user** | `addgroup -S app && adduser -S -G app app` | Tạo user hệ thống `app` (non-login, không mật khẩu) thay vì dùng root |
| **chown** | `chown -R app:app /app/logs` + `COPY --chown=app:app` | App **ghi được** vào thư mục log; file app **thuộc app** |
| **Giữ root-owned** | `node_modules` cài bằng root (RUN 5) | App runtime **không thể sửa dependency** (anti-tampering) - `node_modules` chỉ cần quyền *đọc* |
| **chmod** | `chmod 555 docker-entrypoint.sh` | `r-xr-xr-x`: mọi user chạy được, kể cả owner cũng không ghi được → không sửa script khởi động |
| **USER** | `USER app` (dòng cuối Dockerfile) | Toàn bộ process (ENTRYPOINT → CMD → node) chạy với uid của `app`, không phải root |
| **cap_drop / no-new-privileges** | docker-compose.yml | `cap_drop: ALL` bỏ mọi kernel capability thừa; `no-new-privileges` chặn `setuid` escalation |

**Kết quả khi kiểm tra:** `docker compose exec user-service id` → `uid=100(app)` ✅

---

## 5. docker-compose.yml

### 5.1. Các service

| Service | Loại | Image | Port |
|---------|------|-------|------|
| `mysql` | hạ tầng | `mysql:8.0.44-debian` | 3306 |
| `redis` | hạ tầng | `redis:7-alpine` | 6379 |
| `rabbitmq` | hạ tầng | `rabbitmq:3.13-management-alpine` | 5672, 15672 |
| `ngrok` | hạ tầng | `ngrok/ngrok:latest` | 4040 |
| **`user-service`** | **app (build từ Dockerfile)** | `vexeviet/user-service` | **3001** |
| **`payment-service`** | **app (build từ Dockerfile)** | `vexeviet/payment-service` | **3003** |

### 5.2. Các thành phần theo yêu cầu

- **`build:`** - yêu cầu "để build và chạy container":

  ```yaml
  user-service:
    build:
      context: .
      dockerfile: services/user-service/Dockerfile
  ```

- **`environment:`** - cấu hình runtime: `DATABASE_URL` trỏ tới service `mysql`
  (tên DNS nội bộ compose, không phải `localhost`), `REDIS_HOST: redis`,
  `JWT_SECRET`, biến điều khiển entrypoint...
- **`volume:`** - `mysql_data`, `redis_data` (dữ liệu sống qua restart),
  `user_service_logs`/`payment_service_logs` (log ghi bởi user `app`).
- **`port:`** - map cổng container ra host: `"3001:3001"`, `"3003:3003"`.
- **`depends_on` + `healthcheck`** - app chỉ start khi mysql/redis **healthy**
  (điều kiện `service_healthy`), kết hợp với entrypoint chờ thêm lần nữa (giữa 2 lớp).
- **`network:`** - `vexeviet-network` (bridge) cô lập traffic giữa các container.
- **Security options** - `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`.

### 5.3. Fix liên quan - MySQL user cho app

Thêm vào service `mysql` (trước đây chỉ có root):

```yaml
MYSQL_USER: ${MYSQL_USER:-vexeviet_user}
MYSQL_PASSWORD: ${MYSQL_PASSWORD:-securepassword}
```

→ App kết nối DB bằng user thường (chỉ được quyền trên DB `vexeviet`),
không dùng `root` cho application. (Least privilege ở tầng database.)

---

## 6. Security & CI/CD (cơm thêm)

### 6.1. Các lớp bảo mật đã áp dụng

| Lớp | Biện pháp | Vị trí |
|-----|-----------|--------|
| Image | Base `alpine` nhỏ, multi-stage (không lẫn build tool) | Dockerfile |
| Image | Không commit secret: `.env` bị loại khỏi build context | `.dockerignore` |
| Runtime | Chạy bằng user `app` không phải root | `USER app` |
| Runtime | `node_modules` root-owned → app không sửa được dependency | Dockerfile RUN 5 |
| Runtime | Entrypoint `chmod 555` → không sửa được script khởi động | Dockerfile RUN 6 |
| Runtime | `cap_drop: ALL` + `no-new-privileges` | docker-compose.yml |
| DB | User DB riêng cho app (không dùng root) | docker-compose.yml |
| Line endings | `.gitattributes` + `sed` bỏ CRLF → tránh lỗi shebang | `.gitattributes`, Dockerfile |
| CI | Scan secret, lint Dockerfile, quét CVE trước khi push image | `.github/workflows/ci.yml` |

### 6.2. CI/CD pipeline dự kiến (`.github/workflows/ci.yml`)

```
Push/PR vào main
   │
   ├─ Job 1: quality      → pnpm install --frozen-lockfile → lint → type-check → test
   │
   ├─ Job 2: security
   │     ├─ Gitleaks      → quét secret/credential trong toàn bộ lịch sử git
   │     ├─ Hadolint      → lint Dockerfile (best practice & security)
   │     └─ Trivy         → quét CVE trong image + dependency (fail nếu CRITICAL/HIGH)
   │
   └─ Job 3: publish (chỉ khi push vào main, sau khi 2 job trên pass)
         ├─ Login GHCR bằng GITHUB_TOKEN  ← token NGẮN HẠN, tự rotatable
         ├─ Build + push image (tag theo git SHA + latest)  ← truy xuất được nguồn
         └─ (Ghi chú) deploy bằng OIDC id-token → không cần long-lived key
```

**Nguyên tắc an toàn khi deploy:**

1. **Không lưu secret trong repo/image** - dùng `.env` (gitignored), GitHub
   *Secrets*, hoặc secret manager (AWS Secrets Manager / Vault).
2. **Token ngắn hạn thay key cố định** - `GITHUB_TOKEN` tự hết hạn;
   deploy lên cloud dùng **OIDC** (`id-token: write`) xin token tạm, không
   commit Access Key.
3. **Không push image nếu fail quality/security** - `needs: [quality, security]`.
4. **Immutable image** - tag theo `git SHA` để roll-back chính xác; `latest` chỉ để tiện gọi.
5. **Quyền tối thiểu** - mỗi job chỉ xin đúng `permissions` cần
   (`contents: read` mặc định; `packages: write` chỉ ở job publish).
6. **Secrets scanning** - Gitleaks chặn commit chứa key trước khi lên remote.
7. **Image scanning** - Trivy chặn image có CVE CRITICAL/HIGH lên registry.
8. **Prod secret qua biến runtime** - `JWT_SECRET`, `VNPAY_HASH_SECRET` truyền
   qua environment khi deploy, không hardcode trong Dockerfile/compose.

---

## 7. Danh sách file nộp

| File | Vai trò |
|------|---------|
| `services/user-service/Dockerfile` | Build image user-service (6 RUN, ENTRYPOINT, USER) |
| `services/payment-service/Dockerfile` | Build image payment-service (6 RUN, ENTRYPOINT, USER) |
| `docker-entrypoint.sh` | Script khởi động container (chờ DB/Redis → migrate → exec CMD) |
| `docker-compose.yml` | Build + chạy app và hạ tầng (env, volume, port, network, security) |
| `.github/workflows/ci.yml` | CI/CD pipeline + security scan (cơm thêm) |
| `docs/DOCKER-ASSIGNMENT.md` | File giải thích này |

**Tiêu đề email đề xuất:**

```
[Bài tập Docker] - Lê Văn A - Dockerfile, Docker Compose & docker-entrypoint
```

*(thay `Lê Văn A` bằng họ tên thật của bạn)*
