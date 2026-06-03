import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [{ duration: '1m', target: 50 }, { duration: '2m', target: 50 }, { duration: '30s', target: 0 }],
  thresholds: { 'http_req_duration': ['p(95)<800'] },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5173';

export default function () {
  const params = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    tags: { name: 'CheckoutTransaction' },
  };

  let res = http.post(`${BASE_URL}/cart/checkout`, {}, params);
  
  check(res, {
    'Status is 200': (r) => r.status === 200,
    'Transaction Committed': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.transaction === "COMMITTED";
      } catch (e) {
        return false;
      }
    }
  });
  sleep(1);
}