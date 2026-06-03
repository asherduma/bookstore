import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [{ duration: '1m', target: 50 }, { duration: '2m', target: 50 }, { duration: '30s', target: 0 }],
  thresholds: { 'http_req_duration': ['p(95)<250'] },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5173';

export default function () {
  let res = http.get(`${BASE_URL}/`, { tags: { name: 'LandingPage' } });
  check(res, { 'Status is 200': (r) => r.status === 200 });
  sleep(1);
}