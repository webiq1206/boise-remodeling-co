import { db } from "../db";
import { sql } from "drizzle-orm";
/** Uses this site's existing database driver with parameterized values. */
export async function query(statement: string, values: unknown[] = []): Promise<Record<string, any>[]> {
  if (!db) throw new Error("persistence-unconfigured");
  const parts = statement.split(/\$(\d+)/g);
  const chunks = parts.map((part, index) => index % 2 ? sql`${values[Number(part)-1]}` : sql.raw(part));
  const result = await db.execute(sql.join(chunks,sql.raw("")));
  return Array.isArray(result) ? result : (result as {rows:Record<string,any>[]}).rows;
}
