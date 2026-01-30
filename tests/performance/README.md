# Performance Testing with k6

This directory contains k6 load testing scripts for establishing performance baselines for VeXeViet API endpoints.

## Prerequisites

### Install k6

**Windows (Chocolatey):**
```bash
choco install k6
```

**Windows (winget):**
```bash
winget install k6 --source winget
```

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Quick Start

### Start services first
```bash
# From project root
pnpm docker:up
pnpm dev:services
```

### Run all performance tests
```bash
pnpm test:perf
# or
k6 run tests/performance/k6/run-all.js
```

### Run individual scenarios
```bash
# Health check tests
pnpm test:perf:health
# or
k6 run tests/performance/k6/scenarios/health-check.js

# Search tests
pnpm test:perf:search
# or
k6 run tests/performance/k6/scenarios/search-routes.js

# Auth flow tests
k6 run tests/performance/k6/scenarios/auth-flow.js

# Booking flow tests
k6 run tests/performance/k6/scenarios/booking-flow.js
```

## Test Scenarios

### 1. Health Check (`health-check.js`)
- **Purpose:** Verify all services are responsive
- **VUs:** 100
- **Duration:** 30 seconds
- **Target:** P95 < 100ms
- **Endpoints tested:**
  - `/health` (API Gateway)
  - `/api/v1/users/health`
  - `/api/v1/routes/health`
  - `/api/v1/bookings/health`

### 2. Auth Flow (`auth-flow.js`)
- **Purpose:** Test authentication endpoints under load
- **VUs:** 50
- **Duration:** 1 minute
- **Target:** P95 < 500ms
- **Flow:**
  1. Register new user
  2. Login
  3. Refresh token
  4. Get profile

### 3. Search Routes (`search-routes.js`)
- **Purpose:** Test search performance with high concurrency
- **VUs:** Ramping 0 → 100 → 0
- **Duration:** 2 minutes
- **Target:** P95 < 300ms, 1000 req/s throughput
- **Operations:**
  - Basic route search
  - Filtered search (bus type, price range)
  - Route details

### 4. Booking Flow (`booking-flow.js`)
- **Purpose:** Test complete booking process with concurrency handling
- **VUs:** 30
- **Duration:** 1 minute
- **Target:** P95 < 500ms
- **Flow:**
  1. Check seat availability
  2. Hold seats
  3. Create booking
- **Note:** Tests concurrency conflicts (409 responses)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |

**Example:**
```bash
k6 run -e BASE_URL=http://staging.vexeviet.com tests/performance/k6/run-all.js
```

### Thresholds (from AGENTS.md)

| Metric | Target | Description |
|--------|--------|-------------|
| P95 Response Time | < 500ms | 95th percentile latency |
| Error Rate | < 1% | HTTP failures |
| Health Check P95 | < 100ms | Health endpoint latency |
| Search P95 | < 300ms | Search endpoint latency |
| Throughput | 1000 req/s | Concurrent users |

## Running with Docker

```bash
# Basic run
docker run --rm -i grafana/k6 run - <tests/performance/k6/run-all.js

# With network access to local services
docker run --rm -i --network host \
  grafana/k6 run -e BASE_URL=http://localhost:3000 - <tests/performance/k6/scenarios/health-check.js

# Mount test files
docker run --rm -i \
  -v $(pwd)/tests/performance/k6:/scripts \
  --network host \
  grafana/k6 run /scripts/run-all.js
```

## Reports

Test results are saved to `tests/performance/k6/reports/`:

- `full-summary.json` - Complete metrics data
- `full-summary.txt` - Human-readable summary
- `health-check-summary.json` - Health check results
- `auth-flow-summary.json` - Auth flow results
- `search-routes-summary.json` - Search results
- `booking-flow-summary.json` - Booking results

### Sample Output

```
╔══════════════════════════════════════════════════════════════════╗
║           VeXeViet Performance Baseline Test Results             ║
╚══════════════════════════════════════════════════════════════════╝

📊 Overall Metrics
──────────────────────────────────────────────────────────────────
  Total HTTP Requests: 45,230
  Request Rate: 150.77 req/s
  Failed Requests: 0.12%
  
  Response Time (All):
    Average: 45.23ms
    P95: 125.67ms
    P99: 245.89ms
    Max: 892.34ms

📈 Scenario Results
──────────────────────────────────────────────────────────────────

  Health Check [✅ PASS]
    Target: P95 < 100ms
    Actual: P95 = 23.45ms
    
  Auth Flow [✅ PASS]
    Target: P95 < 500ms
    Actual: P95 = 234.56ms
    
  Search Routes [✅ PASS]
    Target: P95 < 300ms
    Actual: P95 = 156.78ms
    
  Booking Flow [✅ PASS]
    Target: P95 < 500ms
    Actual: P95 = 345.67ms
```

## Interpreting Results

### Pass Criteria
- ✅ **PASS:** P95 response time below target, error rate < 1%
- ❌ **FAIL:** P95 exceeds target or error rate > 1%

### Common Issues

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| High P95 latency | Database slow queries | Add indexes, optimize queries |
| High error rate | Connection pool exhausted | Increase pool size |
| 409 conflicts in booking | Expected concurrency | Normal behavior |
| Timeouts | Service overloaded | Scale horizontally |

### Performance Bottlenecks

1. **Database:** Check slow query logs
2. **Redis:** Monitor cache hit rate
3. **Network:** Check connection counts
4. **Memory:** Monitor heap usage

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Performance Tests
  run: |
    curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
    ./k6-v0.47.0-linux-amd64/k6 run tests/performance/k6/run-all.js
```

### Performance Regression Check

```yaml
- name: Check Performance Baseline
  run: |
    k6 run tests/performance/k6/run-all.js --out json=results.json
    # Parse results and fail if thresholds exceeded
```

## Extending Tests

### Adding New Scenarios

1. Create file in `tests/performance/k6/scenarios/`
2. Import config from `../config.js`
3. Export `options` and `default function`
4. Add to `run-all.js` scenarios

### Custom Metrics

```javascript
import { Trend, Rate, Counter } from 'k6/metrics';

const myTrend = new Trend('my_custom_duration');
const myRate = new Rate('my_custom_errors');
const myCounter = new Counter('my_custom_count');

export default function() {
  // Use in tests
  myTrend.add(response.timings.duration);
  myRate.add(response.status !== 200);
  myCounter.add(1);
}
```

## Grafana Dashboard

For long-running tests, export to InfluxDB and visualize with Grafana:

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/k6/run-all.js
```

## Troubleshooting

### Services not responding
```bash
# Check if services are running
docker ps
pnpm dev:services
```

### Permission denied
```bash
# Windows: Run as Administrator
# Linux/Mac: chmod +x scripts
```

### Memory issues with high VUs
```bash
# Reduce VU count for local testing
k6 run --vus 10 --duration 30s tests/performance/k6/scenarios/health-check.js
```

## File Structure

```
tests/performance/k6/
├── config.js              # Shared configuration
├── run-all.js             # Master script
├── scenarios/
│   ├── health-check.js    # Health endpoint tests
│   ├── auth-flow.js       # Authentication tests
│   ├── search-routes.js   # Search tests
│   └── booking-flow.js    # Booking tests
├── reports/               # Generated reports
│   ├── full-summary.json
│   └── full-summary.txt
└── README.md              # This file
```
