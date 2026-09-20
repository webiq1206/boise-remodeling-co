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

// pg-pool emits 'error' on the POOL when a connection sitting idle in it dies,
// which is what happens whenever Neon autosuspends the database. Node treats an
// unhandled 'error' event as an uncaught exception, so without this listener a
// routine idle drop takes the whole server down. The pool discards the dead
// client itself; this only has to keep the process alive.
pool?.on("error", (err) => {
  console.error("[db] idle connection error (pool recovers, request retried):", err.message);
});

export const db = pool
  ? drizzle(pool, { schema })
  : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
