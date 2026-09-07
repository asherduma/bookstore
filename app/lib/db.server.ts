import pg from 'pg';
import dotenv from "dotenv";
dotenv.config()

// We use a global variable to prevent hot-reloading from creating 
// dozens of zombie connection pools during local development.
let pool: pg.Pool;

declare global {
  var __dbPool: pg.Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

if (process.env.NODE_ENV === "production") {
  pool = new pg.Pool({
    connectionString,
    // Optimal defaults for benchmarking. We can adjust 'max' later 
    // when comparing VMs to Managed Azure databases.
    max: 75, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} else {
  if (!global.__dbPool) {
    global.__dbPool = new pg.Pool({
      connectionString,
      max: 5,
    });
  }
  pool = global.__dbPool;
}

// Export a clean query helper that logs DB execution speed.
export async function query<T = any>(text: string, params?: any[]) {
  const start = performance.now();
  try {
    const res = await pool.query(text, params);
    const duration = performance.now() - start;
    
    // You can inspect database execution time during your k6 stress tests
    if (process.env.DEBUG_DB === "true") {
      console.log(`[DB Query] Duration: ${duration.toFixed(2)}ms | Query: ${text.slice(0, 50)}...`);
    }
    
    return res;
  } catch (error) {
    console.error("[DB Query Error]:", error);
    throw error;
  }
}

export { pool };