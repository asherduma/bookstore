import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [{ duration: '1m', target: 50 }, { duration: '2m', target: 50 }, { duration: '30s', target: 0 }],
  thresholds: { 'http_req_duration': ['p(95)<250'] },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5173';
// Ensure this matches a valid UUID from your database
const VALID_BOOK_ID = '3d615819-2a0a-4e30-9ea7-381136e69789'; 

export default function () {
  let res = http.get(`${BASE_URL}/books/${VALID_BOOK_ID}`, { tags: { name: 'BookDetailsJoin' } });
  check(res, { 'Status is 200': (r) => r.status === 200 });
  sleep(1);
}