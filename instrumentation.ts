export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const {ensureSchema}=await import('./lib/p5/store');
    const {startEstimatorWorker}=await import('./lib/p5/backgroundJobs');
    if(process.env.DATABASE_URL){
      try{await ensureSchema();startEstimatorWorker();}
      catch{console.error('[p5-worker] Startup database unavailable. The next estimator request will retry initialization.');}
    }
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;

    const GARY_USER_ID = "55074230";

    const UNRESOLVED_PURCHASES = [
      { leadId: "d934a12c-2d73-470c-a7f2-481b991a9b69", price: "30.00", label: "Jeff L Johnson bathroom-remodel Boise $30" },
      { leadId: "2c924537-de65-47a1-bb5c-d5f8bb748111", price: "5.00", label: "Hannah kitchen-remodel Boise $5" },
      { leadId: "2a8eb4b6-dfb5-4f3f-a8f2-09962889a897", price: "10.00", label: "Hannah Turner kitchen-remodel Boise $10" },
    ];

    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(dbUrl);

      for (const entry of UNRESOLVED_PURCHASES) {
        const leadRows = await sql`SELECT id, status FROM leads WHERE id = ${entry.leadId}`;
        if (leadRows.length > 0 && leadRows[0].status !== "purchased") {
          const existingRows = await sql`SELECT id FROM lead_purchases WHERE lead_id = ${entry.leadId}`;
          if (existingRows.length === 0) {
            await sql`
              INSERT INTO lead_purchases (lead_id, user_id, purchase_price, stripe_payment_intent_id, created_at)
              VALUES (${entry.leadId}, ${GARY_USER_ID}, ${entry.price}, ${'pi_admin_resolved_' + Date.now()}, NOW())
            `;
            await sql`
              UPDATE leads SET
                status = 'purchased',
                purchased_by = ${GARY_USER_ID},
                purchased_at = NOW(),
                purchase_price = ${entry.price}
              WHERE id = ${entry.leadId}
            `;
            console.log("[startup] Resolved purchase: " + entry.label);
          }
        }
      }

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
