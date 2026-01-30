import { sleep } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const defaultOptions = {
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export const healthCheckOptions = {
  vus: 100,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export const authFlowOptions = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export const searchRoutesOptions = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>1000'],
  },
};

export const bookingFlowOptions = {
  vus: 30,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export const headers = {
  'Content-Type': 'application/json',
};

export function authHeaders(token) {
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export function randomEmail() {
  return `user_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}

export function randomPhone() {
  return `09${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export function thinkTime(min = 1, max = 3) {
  sleep(min + Math.random() * (max - min));
}
