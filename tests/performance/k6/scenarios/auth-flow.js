import http from 'k6/http';
import { check, group, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, authFlowOptions, headers, authHeaders, randomEmail, randomPhone, thinkTime } from '../config.js';

export const options = authFlowOptions;

const registerDuration = new Trend('register_duration');
const loginDuration = new Trend('login_duration');
const refreshDuration = new Trend('refresh_duration');
const authErrors = new Rate('auth_errors');
const successfulRegistrations = new Counter('successful_registrations');
const successfulLogins = new Counter('successful_logins');

export default function () {
  const email = randomEmail();
  const phone = randomPhone();
  const password = 'TestPass123!';
  let accessToken = null;
  let refreshToken = null;

  group('Register', () => {
    const payload = JSON.stringify({
      email,
      phone,
      password,
      fullName: 'Load Test User',
    });

    const res = http.post(`${BASE_URL}/api/v1/users/register`, payload, { headers });

    const success = check(res, {
      'register status is 201': (r) => r.status === 201,
      'register response time < 500ms': (r) => r.timings.duration < 500,
      'register returns user': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.user?.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    registerDuration.add(res.timings.duration);
    authErrors.add(!success);

    if (success) {
      successfulRegistrations.add(1);
    }
  });

  thinkTime(0.5, 1);

  group('Login', () => {
    const payload = JSON.stringify({ email, password });

    const res = http.post(`${BASE_URL}/api/v1/users/login`, payload, { headers });

    const success = check(res, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 500ms': (r) => r.timings.duration < 500,
      'login returns tokens': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.accessToken && body.data?.refreshToken;
        } catch {
          return false;
        }
      },
    });

    loginDuration.add(res.timings.duration);
    authErrors.add(!success);

    if (success) {
      successfulLogins.add(1);
      try {
        const body = JSON.parse(res.body);
        accessToken = body.data.accessToken;
        refreshToken = body.data.refreshToken;
      } catch {
        // ignore
      }
    }
  });

  thinkTime(0.5, 1);

  if (refreshToken) {
    group('Refresh Token', () => {
      const payload = JSON.stringify({ refreshToken });

      const res = http.post(`${BASE_URL}/api/v1/users/refresh-token`, payload, { headers });

      const success = check(res, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh response time < 500ms': (r) => r.timings.duration < 500,
        'refresh returns new tokens': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data?.accessToken && body.data?.refreshToken;
          } catch {
            return false;
          }
        },
      });

      refreshDuration.add(res.timings.duration);
      authErrors.add(!success);
    });
  }

  thinkTime(0.5, 1);

  if (accessToken) {
    group('Get Profile', () => {
      const res = http.get(`${BASE_URL}/api/v1/users/me`, {
        headers: authHeaders(accessToken),
      });

      check(res, {
        'profile status is 200': (r) => r.status === 200,
        'profile response time < 300ms': (r) => r.timings.duration < 300,
      });
    });
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'reports/auth-flow-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const { metrics } = data;
  return `
=== Auth Flow Performance Summary ===

Registrations:
  Total: ${metrics.successful_registrations?.values?.count || 0}
  Avg Duration: ${(metrics.register_duration?.values?.avg || 0).toFixed(2)}ms
  P95 Duration: ${(metrics.register_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

Logins:
  Total: ${metrics.successful_logins?.values?.count || 0}
  Avg Duration: ${(metrics.login_duration?.values?.avg || 0).toFixed(2)}ms
  P95 Duration: ${(metrics.login_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

Token Refresh:
  Avg Duration: ${(metrics.refresh_duration?.values?.avg || 0).toFixed(2)}ms
  P95 Duration: ${(metrics.refresh_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

Overall:
  Error Rate: ${((metrics.auth_errors?.values?.rate || 0) * 100).toFixed(2)}%
  P95 Response: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
`;
}
