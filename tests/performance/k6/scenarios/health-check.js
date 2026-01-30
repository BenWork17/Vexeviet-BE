import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, healthCheckOptions, headers } from '../config.js';

export const options = healthCheckOptions;

const healthCheckDuration = new Trend('health_check_duration');
const healthCheckErrors = new Rate('health_check_errors');

const endpoints = [
  { name: 'API Gateway Health', url: `${BASE_URL}/health` },
  { name: 'User Service Health', url: 'http://localhost:3001/health' },
  { name: 'Route Service Health', url: 'http://localhost:3002/health' },
  { name: 'Booking Service Health', url: 'http://localhost:3003/health' },
];

export default function () {
  endpoints.forEach((endpoint) => {
    group(endpoint.name, () => {
      const res = http.get(endpoint.url, { headers });

      if (res.status !== 200) {
        console.log(`❌ Error: ${endpoint.name} (${endpoint.url}) returned status ${res.status}`);
      }

      const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 100ms': (r) => r.timings.duration < 100,
        'has status field': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.status !== undefined;
          } catch {
            return false;
          }
        },
      });

      healthCheckDuration.add(res.timings.duration);
      healthCheckErrors.add(!success);
    });
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/performance/k6/reports/health-check-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  return `
=== Health Check Performance Summary ===

HTTP Requests:
  Total: ${metrics.http_reqs?.values?.count || 0}
  Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s

Response Times:
  Avg: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
  Min: ${(metrics.http_req_duration?.values?.min || 0).toFixed(2)}ms
  Max: ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms
  P95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

Errors:
  Failed: ${(metrics.http_req_failed?.values?.rate || 0) * 100}%

Health Check Specific:
  Avg Duration: ${(metrics.health_check_duration?.values?.avg || 0).toFixed(2)}ms
  Error Rate: ${((metrics.health_check_errors?.values?.rate || 0) * 100).toFixed(2)}%
`;
}
