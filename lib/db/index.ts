import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/shared/schema";

const connectionString = process.env.DATABASE_URL;

const sql = connectionString ? neon(connectionString, { fetchOptions: { cache: "no-store" } }) : null;

export const db = sql
  ? drizzle(sql, { schema })
  : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
