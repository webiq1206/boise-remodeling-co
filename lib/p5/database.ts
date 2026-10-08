import { sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import { boundedStatement } from "./databaseTimeout.ts";
type Query = (statement:string,values?:unknown[])=>Promise<Record<string,any>[]>;
type SiteDatabase = NonNullable<typeof import("../db").db>;
type InjectedPool = {query:(statement:string,values:unknown[])=>Promise<{rows:Record<string,any>[]}>};
const scopedReads = new AsyncLocalStorage<Query>();
// The shared estimator tests isolate persistence by installing a query-compatible pool on
// globalThis.__p5Pool (an in-process PGlite), the same seam the parent site's driver honors.
const injectedPool = () => (globalThis as {__p5Pool?:InjectedPool}).__p5Pool;
// The site's driver and its path aliases load on first use, so an isolated test harness that
// injects its own query never resolves them.
let site: Promise<SiteDatabase|null> | null = null;
const database = () => (site ??= import("../db").then(module => module.db as SiteDatabase|null));
/** Shared by runtime queries and isolated adapter regressions so placeholder
 * serialization is tested through the same Drizzle boundary used in production. */
export async function queryWithExecutor(executor:any,statement:string,values:unknown[]=[]):Promise<Record<string,any>[]> {
  const parts = statement.split(/\$(\d+)/g);
  const chunks = parts.map((part, index) => index % 2 ? sql`${values[Number(part)-1]}` : sql.raw(part));
  const result = await boundedStatement(()=>executor.execute(sql.join(chunks,sql.raw(""))),statement);
  return Array.isArray(result) ? result : (result as {rows:Record<string,any>[]}).rows;
}
/** Uses this site's existing database driver with parameterized values. */
export async function query(statement: string, values: unknown[] = []): Promise<Record<string, any>[]> {
  const scoped = scopedReads.getStore();
  if (scoped) return scoped(statement, values);
  const injected = injectedPool();
  if (injected) return (await boundedStatement(()=>injected.query(statement,values),statement)).rows;
  const db = await database();
  if (!db) throw new Error("persistence-unconfigured");
  return queryWithExecutor(db,statement,values);
}
/** Keep multi-statement safety decisions on one database connection. */
export async function transaction<T>(run:(query:Query)=>Promise<T>):Promise<T>{
  if (injectedPool()) return run(query);
  const db = await database();
  if(!db)throw new Error("persistence-unconfigured");
  return db.transaction(async tx=>run((statement,values=[])=>queryWithExecutor(tx,statement,values)));
}
/** A short QA write fence shares one connection with its existing store calls.
 * Ordinary transactions retain their original behavior. Never wrap network I/O. */
export async function scopedTransaction<T>(run:(read:Query)=>Promise<T>):Promise<T>{
  if(scopedReads.getStore()||injectedPool())return run(query);
  const db = await database();
  if(!db)throw new Error("persistence-unconfigured");
  return db.transaction(async tx=>scopedReads.run((statement,values=[])=>queryWithExecutor(tx,statement,values),()=>run(query)));
}
