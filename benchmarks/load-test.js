import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics tracking for your thesis documentation
const ColdStartTrend = new Trend('latency_cold_start');
const CheckoutTransactionTrend = new Trend('transaction_checkout_duration');
const DBQueryDelayTrend = new Trend('delay_server_side');

// Define target host from environment variable (passed during execution)
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export const options = {
  // Defining execution stages to test throughput scalability limits
  stages: [
    { duration: '1m', target: 20 },  // Ramp-up from 0 to 20 users (Warm-up)
    { duration: '3m', target: 100 }, // Ramp-up to 100 users (High stress load)
    { duration: '1m', target: 0 },   // Ramp-down back to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // General stability constraint: Errors must be under 1%
    'http_req_duration{name:PublicCatalog}': ['p95<250'], // Reads should be snappy
    'http_req_duration{name:CheckoutTransaction}': ['p95<800'], // Transactions can take slightly longer
  },
};

// 1. Cold Start Latency Isolation Phase
export function setup() {
  const start = Date.now();
  
  // Hit the landing target completely fresh
  const res = http.get(`${BASE_URL}/`, { tags: { name: 'ColdStartPing' } });
  
  const duration = Date.now() - start;
  
  console.log(`[COLD START TELEMETRY] Initial provisioning wake-up latency: ${duration}ms`);
  return { coldStartDuration: duration };
}

// 2. Main High-Throughput Load Simulation Loop
export default function (data) {
  // If this is the very first virtual user loop iteration, log the cold start trend data
  if (__ITER === 0) {
    ColdStartTrend.add(data.coldStartDuration);
  }

  // --- Scenario A: Browse Landing Page (Light Read / Initial Delay) ---
  let homeRes = http.get(`${BASE_URL}/`, { tags: { name: 'LandingPage' } });
  check(homeRes, { 'Home page status is 200': (r) => r.status === 200 });
  sleep(1);

  // --- Scenario B: Heavy Read Scan (Pagination & Indexes) ---
  // Pick a random page between 1 and 5 to stress database scanning
  const randomPage = Math.floor(Math.random() * 5) + 1;
  let catalogRes = http.get(`${BASE_URL}/books?page=${randomPage}`, {
    tags: { name: 'PublicCatalog' },
  });
  check(catalogRes, { 'Catalog page status is 200': (r) => r.status === 200 });
  
  // Extract custom Server-Timing headers if injected by the runtime environment
  const serverTiming = catalogRes.headers['Server-Timing'];
  if (serverTiming) {
    // If you implemented Server-Timing helpers, we parse out the DB duration here
    const dbMatch = serverTiming.match(/db;dur=([\d.]+)/);
    if (dbMatch) DBQueryDelayTrend.add(parseFloat(dbMatch[1]));
  }
  sleep(2);

  // --- Scenario C: Target Relational Read (Key-Value Join Lookup) ---
  // We'll target a hardcoded slice of our seeded items (e.g., book ID suffix increments)
  const bookIdOffset = Math.floor(Math.random() * 20) + 1;
  // Note: Replace this with valid seeded UUID strings or an array mapping in a real test run
  let itemRes = http.get(`${BASE_URL}/books/sample-id-${bookIdOffset}`, {
    tags: { name: 'BookDetailsJoin' },
  });
  sleep(1);

  // --- Scenario D: Heavy Write ACID Transaction (Checkout Stress Test) ---
  // Note: To bypass login cookies for pure API infrastructure load testing, 
  // you can either submit a pre-baked session cookie via headers or hit a custom test trigger.
  const params = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    tags: { name: 'CheckoutTransaction' },
  };

  const startTime = Date.now();
  let checkoutRes = http.post(`${BASE_URL}/cart/checkout`, {}, params);
  
  if (checkoutRes.status === 200 || checkoutRes.status === 302) {
    CheckoutTransactionTrend.add(Date.now() - startTime);
  }
  
  check(checkoutRes, {
    'Transaction successfully handled': (r) => r.status === 200 || r.status === 302,
  });

  sleep(3); // Simulates standard user think-time delay before repeating cycle
}