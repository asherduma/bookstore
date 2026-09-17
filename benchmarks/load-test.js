import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metric tracking for formal thesis documentation
const ColdStartTrend = new Trend('latency_cold_start');
const DBQueryDelayTrend = new Trend('delay_server_side');

// Configuration environment variable defaults
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5173'; //5173

export const options = {
  // 10-Minute Academic Testing Profile to capture sustained system performance
  stages: [
    { duration: '1m', target: 50 },  // 1. Ramp-up: 0 to 50 users (System Warm-up)
    { duration: '8m', target: 50 },  // 2. Steady-State: Sustained high-stress load
    { duration: '1m', target: 0 },   // 3. Ramp-down: Symmetrical cool-down phase
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'], // System stability constraint: Errors must be under 1%
    'http_req_duration{endpoint_name:LandingPage}': ['p(95)<400'],
    'http_req_duration{endpoint_name:PublicCatalog}': ['p(95)<600'],
    'http_req_duration{endpoint_name:BookDetails}': ['p(95)<800'],
  },
};

// 1. Isolation Phase: Capture Cold Start Performance Baseline
export function setup() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/`, { tags: { endpoint_name: 'ColdStartPing' } });
  const duration = Date.now() - start;

  console.log(`[COLD START] Isolated initialization latency: ${duration}ms`);
  return { coldStartDuration: duration };
}

// 2. Main High-Throughput Load Simulation Execution Loop
export default function (data) {
  // Capture cold start metric only on the absolute first iteration of VU 0
  if (__ITER === 0 && __VU === 1) {
    ColdStartTrend.add(data.coldStartDuration);
  }

  // --- Scenario A: Browse Homepage (Aggregated Metric View) ---
  const homeRes = http.get(`${BASE_URL}/`, { 
    tags: { endpoint_name: 'LandingPage' } 
  });
  check(homeRes, { 'Homepage rendering status is 200': (r) => r.status === 200 });
  sleep(1);

  // --- Scenario B: Heavy Read Scan (Catalog Pagination) ---
  const randomPage = Math.floor(Math.random() * 5) + 1;
  const catalogRes = http.get(`${BASE_URL}/books?page=${randomPage}&limit=20`, {
    tags: { endpoint_name: 'PublicCatalog' },
  });
  check(catalogRes, { 'Catalog pagination status is 200': (r) => r.status === 200 });
  
  // Extract custom internal telemetry headers if exposed by the loader
  const serverTiming = catalogRes.headers['Server-Timing'];
  if (serverTiming) {
    const dbMatch = serverTiming.match(/db;dur=([\d.]+)/);
    if (dbMatch) DBQueryDelayTrend.add(parseFloat(dbMatch[1]));
  }
  sleep(2);

  // --- Scenario C: Relational Read Target (Primary Key B-Tree Lookup) ---
  // A pool of valid seeded book IDs to prevent memory page contention
  const sampleBookIds = [
    'd9ee4560-ee75-49c7-a670-26f0c4b3247d',
    '5232753e-3dc1-4bb5-b881-85e28ff3ebbe',
    '82da1400-a14f-486e-bf83-4e9c99a3aef9',
    '4ac8e0e1-db4f-4b25-83a1-d7d7721dc4f0',
    'bdaee93a-fee2-4e71-8902-f4250e64d554'
  ];
  const selectedId = sampleBookIds[Math.floor(Math.random() * sampleBookIds.length)];

  const itemRes = http.get(`${BASE_URL}/books/${selectedId}`, {
    tags: { endpoint_name: 'BookDetails' },
  });
  check(itemRes, { 'Target book detail status is 200': (r) => r.status === 200 });
  sleep(3); 
}