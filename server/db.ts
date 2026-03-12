import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
  if (err.message.includes("terminating connection")) {
    console.log("[DB] Connection terminated by server, pool will auto-reconnect");
  }
});

export const db = drizzle(pool, { schema });
export { pool };

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
