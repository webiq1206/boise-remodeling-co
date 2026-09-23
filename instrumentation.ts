export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    void import('./lib/p5/backgroundJobs').then(m=>m.bootEstimatorWorker()).catch(()=>console.error('[p5-worker] Startup deferred; estimator requests can resume saved work.'));
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;

    // The one-off lead-purchase reconciliation that used to run here has been removed: it was a
    // spent, hard-coded data fix for three specific marketplace leads, and it re-queried the database
    // for them on every single boot (see Boise Cabinet Co, 2026-09-23, where boot-time database work
    // failed five deploys in a row).
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(dbUrl);

      await sql`
        UPDATE leads SET status = 'archived', updated_at = NOW()
        WHERE status = 'available' AND created_at < NOW() - INTERVAL '7 days'
      `;
      console.log("[startup] Auto-archived stale leads (7+ days old)");

      // ----------------------------------------------------------------
      // One-shot lead address cleanup. Idempotent: only rows whose stored
      // value differs from the cleaned form (or whose missing-house-number
      // flag is wrong) are touched, so re-runs become no-ops once production
      // is fully normalized.
      // ----------------------------------------------------------------
      try {
        const { normalizeStoredAddress, hasLeadingHouseNumber } = await import(
          "./shared/addressValidation"
        );
        const rows = (await sql`
          SELECT id, address, city, address_missing_house_number
          FROM leads
          WHERE address IS NOT NULL AND address <> '***'
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 500
        `) as Array<{
          id: string;
          address: string;
          city: string | null;
          address_missing_house_number: boolean | null;
        }>;
        let cleaned = 0;
        let flagged = 0;
        for (const row of rows) {
          const normalized = normalizeStoredAddress(row.address, row.city);
          const missing = !hasLeadingHouseNumber(normalized);
          const addressChanged = normalized && normalized !== row.address;
          const flagChanged = missing !== Boolean(row.address_missing_house_number);
          if (!addressChanged && !flagChanged) continue;
          if (addressChanged && flagChanged) {
            await sql`
              UPDATE leads
              SET address = ${normalized}, address_missing_house_number = ${missing}
              WHERE id = ${row.id}
            `;
          } else if (addressChanged) {
            await sql`
              UPDATE leads SET address = ${normalized} WHERE id = ${row.id}
            `;
          } else {
            await sql`
              UPDATE leads SET address_missing_house_number = ${missing} WHERE id = ${row.id}
            `;
          }
          if (addressChanged) cleaned++;
          if (missing) flagged++;
        }
        if (cleaned > 0 || flagged > 0) {
          console.log(
            `[startup] Address backfill: rewrote ${cleaned} address(es), flagged ${flagged} missing-house-number row(s)`
          );
        }
      } catch (addrErr) {
        console.error("[startup] Address backfill failed:", addrErr);
      }
    } catch (e) {
      console.error("[startup] Error during startup tasks:", e);
    }
  }
}
