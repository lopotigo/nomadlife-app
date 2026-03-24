import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

pool.on("connect", () => {
  console.log("[DB] New connection established");
});

export const db = drizzle(pool, { schema });
export { pool };

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err.message?.includes("timeout") || err.message?.includes("terminated") || err.message?.includes("ECONNRESET") || err.message?.includes("connection");
      if (isRetryable && attempt < retries) {
        console.warn(`[DB] Retry ${attempt}/${retries} after error: ${err.message}`);
        await new Promise((res) => setTimeout(res, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export async function ensureTablesExist() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_ai_preferences (
        id serial PRIMARY KEY,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        travel_style text,
        budget_level text,
        accommodation_type text,
        interests text[],
        dietary_needs text,
        preferred_climate text,
        work_style text,
        languages_spoken text[],
        notes text,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
  } catch (err) {
    console.log("Table migration check completed");
  }
}
