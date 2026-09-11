import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/shared/schema";

const connectionString = process.env.DATABASE_URL;

// The deployment SQL proxy represents confirmed empty results with null arrays.
// Normalize only successful zero-row results. Preserve errors and nonempty data.
const databaseFetch = neonConfig.fetchFunction || fetch;
neonConfig.fetchFunction = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const response = await databaseFetch(input, {...init, cache: 'no-store'});
  if (!response.ok) return response;
  let body: any;
  try { body = await response.clone().json(); } catch { return response; }
  let changed = false;
  const normalize = (result: any) => {
    if (result && result.rowCount === 0 && (result.rows === null || Array.isArray(result.rows) && result.rows.length === 0)) {
      if (result.rows === null) { result.rows = []; changed = true; }
      if (result.fields === null) { result.fields = []; changed = true; }
    }
  };
  if (Array.isArray(body?.results)) body.results.forEach(normalize); else normalize(body);
  if (!changed) return response;
  const headers = new Headers(response.headers); headers.delete('content-length'); headers.delete('content-encoding');
  return new Response(JSON.stringify(body), {status: response.status, statusText: response.statusText, headers});
};

const sql = connectionString ? neon(connectionString, { fetchOptions: { cache: "no-store" } }) : null;

export const db = sql
  ? drizzle(sql, { schema })
  : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
