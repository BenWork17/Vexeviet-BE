import { group } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

import healthCheck from './scenarios/health-check.js';
import authFlow from './scenarios/auth-flow.js';
import searchRoutes from './scenarios/search-routes.js';
import bookingFlow, { setup as bookingSetup } from './scenarios/booking-flow.js';

import { BASE_URL, defaultOptions } from './config.js';

export const options = {
  scenarios: {
    health_check: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      exec: 'runHealthCheck',
      startTime: '0s',
      tags: { scenario: 'health-check' },
    },
    auth_flow: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      exec: 'runAuthFlow',
      startTime: '35s',
      tags: { scenario: 'auth-flow' },
    },
    search_routes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'runSearchRoutes',
      startTime: '1m40s',
      tags: { scenario: 'search-routes' },
    },
    booking_flow: {
      executor: 'constant-vus',
      vus: 30,
      duration: '1m',
      exec: 'runBookingFlow',
      startTime: '3m50s',
      tags: { scenario: 'booking-flow' },
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'http_req_duration{scenario:health-check}': ['p(95)<100'],
    'http_req_duration{scenario:auth-flow}': ['p(95)<500'],
    'http_req_duration{scenario:search-routes}': ['p(95)<300'],
    'http_req_duration{scenario:booking-flow}': ['p(95)<500'],
  },
};

let bookingData = null;

export function setup() {
  console.log(`Running performance tests against: ${BASE_URL}`);
  console.log('='.repeat(50));

  bookingData = bookingSetup();

  return { bookingData };
}

export function runHealthCheck() {
  group('Health Check Scenario', () => {
    healthCheck();
  });
}

export function runAuthFlow() {
  group('Auth Flow Scenario', () => {
    authFlow();
  });
}

export function runSearchRoutes() {
  group('Search Routes Scenario', () => {
    searchRoutes();
  });
}

export function runBookingFlow(data) {
  group('Booking Flow Scenario', () => {
    bookingFlow(data.bookingData);
  });
}

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'stdout': summary,
    'tests/performance/k6/reports/full-summary.json': JSON.stringify(data, null, 2),
    'tests/performance/k6/reports/full-summary.txt': summary,
  };
}

function generateSummary(data) {
  const { metrics } = data;

  const scenarios = [
    {
      name: 'Health Check',
      tag: 'health-check',
      target: '100ms',
    },
    {
      name: 'Auth Flow',
      tag: 'auth-flow',
      target: '500ms',
    },
    {
      name: 'Search Routes',
      tag: 'search-routes',
      target: '300ms',
    },
    {
      name: 'Booking Flow',
      tag: 'booking-flow',
      target: '500ms',
    },
  ];

  let output = `
╔══════════════════════════════════════════════════════════════════╗
║           VeXeViet Performance Baseline Test Results             ║
╚══════════════════════════════════════════════════════════════════╝

📊 Overall Metrics
──────────────────────────────────────────────────────────────────
  Total HTTP Requests: ${metrics.http_reqs?.values?.count || 0}
  Request Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s
  Failed Requests: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
  
  Response Time (All):
    Average: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
    P95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
    P99: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms
    Max: ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms

📈 Scenario Results
──────────────────────────────────────────────────────────────────
`;

  scenarios.forEach((scenario) => {
    const metricKey = `http_req_duration{scenario:${scenario.tag}}`;
    const metric = metrics[metricKey];
    
    if (metric) {
      const p95 = metric.values?.['p(95)'] || 0;
      const targetMs = parseInt(scenario.target);
      const passed = p95 < targetMs;
      const status = passed ? '✅ PASS' : '❌ FAIL';

      output += `
  ${scenario.name} [${status}]
    Target: P95 < ${scenario.target}
    Actual: P95 = ${p95.toFixed(2)}ms
    Avg: ${(metric.values?.avg || 0).toFixed(2)}ms
`;
    }
  });

  output += `
📋 Baseline Targets vs Actual
──────────────────────────────────────────────────────────────────
  │ Metric              │ Target    │ Actual    │ Status │
  ├─────────────────────┼───────────┼───────────┼────────┤
  │ API P95             │ < 500ms   │ ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0).padStart(6)}ms │ ${(metrics.http_req_duration?.values?.['p(95)'] || 0) < 500 ? '  ✅  ' : '  ❌  '} │
  │ Error Rate          │ < 1%      │ ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2).padStart(6)}% │ ${(metrics.http_req_failed?.values?.rate || 0) < 0.01 ? '  ✅  ' : '  ❌  '} │
  │ Health Check P95    │ < 100ms   │ ${(metrics['http_req_duration{scenario:health-check}']?.values?.['p(95)'] || 0).toFixed(0).padStart(6)}ms │ ${(metrics['http_req_duration{scenario:health-check}']?.values?.['p(95)'] || 0) < 100 ? '  ✅  ' : '  ❌  '} │
  │ Search P95          │ < 300ms   │ ${(metrics['http_req_duration{scenario:search-routes}']?.values?.['p(95)'] || 0).toFixed(0).padStart(6)}ms │ ${(metrics['http_req_duration{scenario:search-routes}']?.values?.['p(95)'] || 0) < 300 ? '  ✅  ' : '  ❌  '} │

🔗 Test Configuration
──────────────────────────────────────────────────────────────────
  Base URL: ${BASE_URL}
  Test Duration: ~5 minutes
  VUs: Health(100), Auth(50), Search(100 ramping), Booking(30)

📁 Reports saved to: tests/performance/k6/reports/
`;

  return output;
}
