import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, searchRoutesOptions, headers, thinkTime } from '../config.js';

export const options = searchRoutesOptions;

const searchDuration = new Trend('search_duration');
const searchErrors = new Rate('search_errors');
const searchRequests = new Counter('search_requests');
const routesFound = new Counter('routes_found');

const cities = [
  { from: 'HCM', to: 'Hanoi' },
  { from: 'Hanoi', to: 'HCM' },
  { from: 'HCM', to: 'Da Nang' },
  { from: 'Da Nang', to: 'HCM' },
  { from: 'Hanoi', to: 'Da Nang' },
  { from: 'HCM', to: 'Nha Trang' },
  { from: 'HCM', to: 'Da Lat' },
  { from: 'HCM', to: 'Can Tho' },
  { from: 'Hanoi', to: 'Hai Phong' },
  { from: 'HCM', to: 'Vung Tau' },
];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomDate() {
  const today = new Date();
  const daysAhead = Math.floor(Math.random() * 30) + 1;
  today.setDate(today.getDate() + daysAhead);
  return today.toISOString().split('T')[0];
}

export default function () {
  const route = getRandomCity();
  const date = getRandomDate();

  group('Search Routes', () => {
    const url = `${BASE_URL}/api/v1/routes/search?fromCity=${encodeURIComponent(route.from)}&toCity=${encodeURIComponent(route.to)}&departureDate=${date}`;

    const res = http.get(url, { headers });

    const success = check(res, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 300ms': (r) => r.timings.duration < 300,
      'search returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.routes || body.data);
        } catch {
          return false;
        }
      },
    });

    searchDuration.add(res.timings.duration);
    searchErrors.add(!success);
    searchRequests.add(1);

    if (success) {
      try {
        const body = JSON.parse(res.body);
        const routes = body.data?.routes || body.data || [];
        routesFound.add(routes.length);
      } catch {
        // ignore
      }
    }
  });

  group('Search with Filters', () => {
    const url = `${BASE_URL}/api/v1/routes/search?fromCity=${encodeURIComponent(route.from)}&toCity=${encodeURIComponent(route.to)}&departureDate=${date}&busType=VIP&minPrice=100000&maxPrice=500000`;

    const res = http.get(url, { headers });

    const success = check(res, {
      'filtered search status is 200': (r) => r.status === 200,
      'filtered search response time < 300ms': (r) => r.timings.duration < 300,
    });

    searchDuration.add(res.timings.duration);
    searchErrors.add(!success);
    searchRequests.add(1);
  });

  group('Get Route Details', () => {
    const res = http.get(`${BASE_URL}/api/v1/routes`, { headers });

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const routes = body.data?.routes || body.data || [];
        if (routes.length > 0) {
          const randomRoute = routes[Math.floor(Math.random() * routes.length)];
          const detailRes = http.get(`${BASE_URL}/api/v1/routes/${randomRoute.id}`, { headers });

          check(detailRes, {
            'route detail status is 200': (r) => r.status === 200,
            'route detail response time < 200ms': (r) => r.timings.duration < 200,
          });

          searchDuration.add(detailRes.timings.duration);
        }
      } catch {
        // ignore
      }
    }
  });

  thinkTime(0.1, 0.3);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'reports/search-routes-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const { metrics } = data;
  return `
=== Search Routes Performance Summary ===

Search Metrics:
  Total Requests: ${metrics.search_requests?.values?.count || 0}
  Routes Found: ${metrics.routes_found?.values?.count || 0}

Throughput:
  Requests/sec: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}
  Target: 1000 req/s

Response Times:
  Avg: ${(metrics.search_duration?.values?.avg || 0).toFixed(2)}ms
  Min: ${(metrics.search_duration?.values?.min || 0).toFixed(2)}ms
  Max: ${(metrics.search_duration?.values?.max || 0).toFixed(2)}ms
  P95: ${(metrics.search_duration?.values?.['p(95)'] || 0).toFixed(2)}ms (Target: <300ms)

Errors:
  Error Rate: ${((metrics.search_errors?.values?.rate || 0) * 100).toFixed(2)}%
`;
}
