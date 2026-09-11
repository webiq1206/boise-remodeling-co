import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/shared/schema";

const connectionString = process.env.DATABASE_URL;

// The deployment's SQL-over-HTTP proxy returns an empty result for DML
// statements with RETURNING, even when PostgreSQL changed a row. Use the
// PostgreSQL-compatible WebSocket driver so RETURNING rows are decoded by the
// serverless client itself (including JSON and boolean values).
neonConfig.webSocketConstructor = ws;

const pool = connectionString ? new Pool({ connectionString }) : null;

export const db = pool
  ? drizzle(pool, { schema })
  : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
