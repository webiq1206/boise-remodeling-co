/**
 * Route-executing tests for the two lead-writing estimate endpoints.
 *
 * Every other suite tests engines and builders directly; until this file,
 * literally nothing executed app/api/re10/estimate or app/api/estimate-lead.
 * The bugs that motivated it all lived in the route layer itself: zod
 * stripping `upgradeScope` so the server silently repriced full-scope, a
 * traversal-crafted document URL attaching server files to the admin email,
 * a past repair deadline skipping the rush uplift, and out-of-bounds sqft
 * inserting estimate-less leads while returning success.
 *
 * SIDE-EFFECT SAFETY: prebuild runs where production secrets can exist, and
 * an accepted request normally writes a CRM row and sends two emails. The env
 * scrub below runs BEFORE route modules load. Estimate-lead acceptance uses an
 * explicitly installed in-memory test adapter, while the CRM and email layers
 * see no credentials. Separate checks uninstall or fail that adapter to prove
 * persistence failure cannot return conversion eligibility. No database row,
 * email, CRM request, ad event or staff notification can leave this process.
 */
import { randomUUID } from "node:crypto";

for (const key of [
  "DATABASE_URL",
  "RESEND_API_KEY",
  "REPLIT_CONNECTORS_HOSTNAME",
  "REPL_IDENTITY",
  "WEB_REPL_RENEWAL",
  "LEAD_DASHBOARD_KEY",
]) {
  delete process.env[key];
}
process.env.LEAD_ROUTE_ISOLATED_TEST = "1";

let checks = 0;
let failures = 0;

function check(cond: boolean, message: string): void {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${message}`);
  }
}

type RouteHandler = (request: Request) => Promise<Response>;

interface RouteCall {
  status: number;
  json: any;
  headers: Headers;
  /** Every `[pricing-alert] <kind>` line the request logged. */
  alerts: string[];
}

let ipCounter = 0;

/**
 * Executes a handler with console muffled (route calls log delivery failures
 * by design once the env is scrubbed) while capturing pricing alerts, which
 * several assertions below are ABOUT. Each call gets a fresh client IP so the
 * in-process rate limiter never couples unrelated tests; the rate-limit test
 * passes its own fixed IP.
 */
async function callRoute(
  handler: RouteHandler,
  body: unknown,
  opts: { ip?: string; rawBody?: string } = {},
): Promise<RouteCall> {
  const ip = opts.ip ?? `10.99.${Math.floor(ipCounter / 200)}.${(ipCounter++ % 200) + 1}`;
  const request = new Request("http://localhost/api/under-test", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: opts.rawBody ?? JSON.stringify(body),
  });

  const alerts: string[] = [];
  const original = { error: console.error, warn: console.warn, info: console.info, log: console.log };
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[pricing-alert]")) {
      alerts.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    }
  };
  console.warn = () => {};
  console.info = () => {};
  console.log = () => {};
  try {
    const response = await handler(request);
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      /* non-JSON response bodies stay null */
    }
    return { status: response.status, json, headers: response.headers, alerts };
  } finally {
    console.error = original.error;
    console.warn = original.warn;
    console.info = original.info;
    console.log = original.log;
  }
}

async function main(): Promise<void> {
  const { POST: re10Post } = await import("../app/api/re10/estimate/route");
  const { POST: leadPost } = await import("../app/api/estimate-lead/route");
  const { installInquiryAcceptanceTestAdapter } = await import("../server/services/inquiryAcceptance");
  const { RECIPES } = await import("../shared/costs/re10Repairs");
  const { EXTRACTABLE_KINDS, EXTRACTION_REVIEW_REASONS } = await import("../shared/re10/extraction");
  const {
    EMPTY_REFINEMENTS,
    calculateEstimate,
    countVisibleUserRefinements,
    getProjectSizeConfig,
    getSetRefinementKeys,
  } = await import("../shared/estimateEngine");
  const { resolveQuotedRange } = await import("../shared/costs/resolve");
  const { IMPLAUSIBLE_QUOTE_CEILING } = await import("../server/services/pricingAlerts");

  const kinds = EXTRACTABLE_KINDS as string[];
  const linearKind = kinds.find((k) => RECIPES[k as keyof typeof RECIPES]?.unit === "LF" || RECIPES[k as keyof typeof RECIPES]?.unit === "SF");
  const eachKind = kinds.find((k) => RECIPES[k as keyof typeof RECIPES]?.unit === "EA");
  if (!linearKind || !eachKind) throw new Error("Could not find an LF/SF and an EA repair kind to test with.");

  const repair = (overrides: Record<string, unknown> = {}) => ({
    id: "r1",
    description: "Repair the thing the inspector flagged",
    kind: eachKind,
    ...overrides,
  });

  const re10Body = (overrides: Record<string, unknown> = {}) => ({
    repairs: [repair()],
    name: "Route Test",
    email: "route-test@example.com",
    preferredContact: "email",
    role: "buyer-agent",
    propertyAddress: "123 Test Street, Boise, ID",
    ...overrides,
  });

  console.log("verify-estimate-routes: /api/re10/estimate");

  {
    const ok = await callRoute(re10Post, re10Body());
    check(ok.status === 200, `valid minimal body should be 200, got ${ok.status}`);
    check(typeof ok.json?.price === "number" && ok.json.price > 0, "accepted request must return a positive price");
    check(ok.json?.price < IMPLAUSIBLE_QUOTE_CEILING, "a one-item quote must be nowhere near the implausibility ceiling");
    check(Array.isArray(ok.json?.categories) && ok.json.categories.length > 0, "customerView categories must be assembled");
    check(ok.json?.emailed === false, "with delivery env scrubbed, emailed must be reported false, never claimed true");
    check(ok.json?.disclosure && Array.isArray(ok.json.disclosure.assumptions), "disclosure block must be present");
    const flat = JSON.stringify(ok.json);
    check(!/"cost"|"margin"|internalCost|sellingPrice/.test(flat), "customer response must carry no cost/margin field names");
  }

  for (const quantity of [0, -3, 1_000_000_000]) {
    const bad = await callRoute(re10Post, re10Body({ repairs: [repair({ quantity })] }));
    check(bad.status === 400, `quantity ${quantity} must be rejected with 400, got ${bad.status}`);
  }

  {
    const frac = await callRoute(re10Post, re10Body({ repairs: [repair({ kind: linearKind, quantity: 12.5 })] }));
    check(frac.status === 200, `fractional quantity should be accepted, got ${frac.status}`);
    const item = frac.json?.categories?.[0]?.items?.[0];
    check(item?.quantity === 12.5, `fractional quantity must survive to the customer view (the wizard once turned 12.5 into 125), got ${item?.quantity}`);
  }

  {
    const huge = await callRoute(re10Post, re10Body({ repairs: [repair({ quantity: 99_000 })] }));
    check(huge.status === 200, `schema-legal absurd quantity should be accepted then clamped, got ${huge.status}`);
    const item = huge.json?.categories?.[0]?.items?.[0];
    check(typeof item?.quantity === "number" && item.quantity < 99_000, `absurd EA quantity must be clamped, got ${item?.quantity}`);
    check(item?.quantityAssumed === true, "a clamped quantity must be flagged quantityAssumed so the customer sees it is not their number");
    check(huge.json?.price < IMPLAUSIBLE_QUOTE_CEILING, `clamped quote must stay plausible, got ${huge.json?.price}`);
    check(
      huge.alerts.some((a) => a.includes("quantity-clamped")),
      "clamping a quantity must fire a quantity-clamped pricing alert",
    );
  }

  {
    const traversal = await callRoute(
      re10Post,
      re10Body({ documents: [{ filename: "re10.pdf", url: "/api/documents/local/..%2F..%2F.env.local" }] }),
    );
    check(traversal.status === 400, `traversal document URL must be rejected with 400, got ${traversal.status}`);
    const js = await callRoute(
      re10Post,
      re10Body({ documents: [{ filename: "re10.pdf", url: "javascript:alert(1)" }] }),
    );
    check(js.status === 400, `javascript: document URL must be rejected with 400, got ${js.status}`);
    const stored = await callRoute(
      re10Post,
      re10Body({ documents: [{ filename: "re10.pdf", url: "/api/documents/local/re10%2F1722-abc%2Ffile.pdf" }] }),
    );
    check(stored.status === 200, `genuine stored-document URL must be accepted, got ${stored.status}`);
  }

  {
    const today = new Date().toISOString().slice(0, 10);
    const base = { repairs: [repair(), repair({ id: "r2", kind: linearKind, description: "Second trade item" })] };
    const none = await callRoute(re10Post, re10Body(base));
    const past = await callRoute(re10Post, re10Body({ ...base, repairDeadline: "2020-01-01" }));
    const now = await callRoute(re10Post, re10Body({ ...base, repairDeadline: today }));
    check(past.status === 200 && now.status === 200 && none.status === 200, "deadline variants must all be accepted");
    check(
      past.json?.price === now.json?.price,
      `a deadline already in the past must price as maximum urgency (same as today), got past=${past.json?.price} today=${now.json?.price}`,
    );
    check(
      past.json?.price >= none.json?.price,
      `a past deadline must never price below no deadline, got past=${past.json?.price} none=${none.json?.price}`,
    );
  }

  {
    const merged = await callRoute(
      re10Post,
      re10Body({
        repairs: [
          repair(),
          repair({ id: "r2", description: "Needs eyes on it", needsReview: EXTRACTION_REVIEW_REASONS[0] }),
        ],
        unmapped: [{ verbatim: "Chimney crown repair per inspection" }],
      }),
    );
    check(merged.status === 200, `review+unmapped body should be accepted, got ${merged.status}`);
    const onsite = JSON.stringify(merged.json?.needsOnsite ?? []);
    check(onsite.includes("Chimney crown repair"), "unmapped requests must appear in needsOnsite, not vanish");
    check(merged.json?.unpriced === (merged.json?.needsOnsite ?? []).length, "unpriced count must equal the merged needsOnsite list");
  }

  {
    const excluded = await callRoute(
      re10Post,
      re10Body({ excluded: [{ description: "Repaint the back deck" }], attachedOnly: ["photos.heic"] }),
    );
    check(excluded.status === 200, `excluded/attachedOnly body should be accepted, got ${excluded.status}`);
    const disclosure = JSON.stringify(excluded.json?.disclosure ?? {});
    check(disclosure.includes("Repaint the back deck"), "customer-removed repairs must be named in the disclosure, not dropped");
    check(disclosure.includes("photos.heic"), "attached-but-unreadable files must be named in the disclosure");
  }

  {
    const noEmail = await callRoute(re10Post, re10Body({ email: "", preferredContact: "email" }));
    check(noEmail.status === 400, `preferredContact email without an email must be 400, got ${noEmail.status}`);
    const phoneOnly = await callRoute(re10Post, re10Body({ email: "", phone: "208-555-0100", preferredContact: "phone" }));
    check(phoneOnly.status === 200, `phone-preferred contact with only a phone must be accepted, got ${phoneOnly.status}`);
    const badJson = await callRoute(re10Post, null, { rawBody: "{not json" });
    check(badJson.status === 400, `malformed JSON must be 400, got ${badJson.status}`);
  }

  {
    // 12 requests inside the window are allowed; the 13th must be turned away.
    // Parsing happens after the limiter, so cheap invalid bodies exercise it.
    const ip = "203.0.113.77";
    let last: RouteCall | null = null;
    for (let i = 0; i < 13; i++) last = await callRoute(re10Post, {}, { ip });
    check(last?.status === 429, `13th request from one client inside the window must be 429, got ${last?.status}`);
    check(Number(last?.headers.get("Retry-After")) > 0, "429 must carry a positive Retry-After header");
  }

  console.log("verify-estimate-routes: /api/estimate-lead");

  const sizeConfig = getProjectSizeConfig("kitchen");
  const priceKitchen = (refinements: Record<string, unknown>) => {
    const merged = { ...EMPTY_REFINEMENTS, ...refinements } as any;
    const detailCount = countVisibleUserRefinements("kitchen", getSetRefinementKeys(merged));
    const guide = calculateEstimate(
      { project: "kitchen", finish: "mid-range", sqft: sizeConfig.baselineSqft, refinements: merged },
      detailCount,
    );
    const range = resolveQuotedRange("kitchen", "mid-range", sizeConfig.baselineSqft, merged);
    return { ...guide, ...(range ?? {}) };
  };

  let leadSequence = 0;
  const leadBody = (estimate: Record<string, unknown>) => {
    leadSequence++;
    return {
      inquiryId: randomUUID(),
      formStartedAt: Date.now() - 2_000,
      website: "",
      name: "Route Test",
      email: `route-test-${leadSequence}@example.com`,
      phone: "208-555-0100",
      address: `${100 + leadSequence} Test Street, Boise, ID 83702`,
      projectType: "kitchen",
      estimate: {
        project: "kitchen",
        finish: "mid-range",
        sqft: sizeConfig.baselineSqft,
        roi: 0,
        ...estimate,
      },
    };
  };

  const checkAcceptedLead = (call: RouteCall, label: string) => {
    check(call.status === 200, `${label} should return 200, got ${call.status}`);
    check(call.json?.accepted === true, `${label} must report accepted=true`);
    check(call.json?.conversionEligible === true, `${label} must be conversion eligible after a new durable write`);
    check(call.json?.duplicate === false, `${label} must report a new, non-duplicate inquiry`);
    check(call.json?.delivery === "pending_retry", `${label} must report pending_retry with delivery credentials scrubbed`);
  };

  const partial = priceKitchen({ upgradeScope: ["lighting"] });
  const full = priceKitchen({});
  check(
    partial.priceLow !== full.priceLow || partial.priceHigh !== full.priceHigh,
    "precondition: lighting-only kitchen must price differently from full scope, or the survival test proves nothing",
  );

  const uninstallSuccessfulPersistence = installInquiryAcceptanceTestAdapter();
  try {
    // The client posts the partial-scope price it showed. If zod stripped
    // upgradeScope (the original bug), the server would recompute full-scope
    // and fire a recompute-mismatch alert - so "no alert" IS the assertion
    // that the field survived validation all the way into the engine.
    const survived = await callRoute(
      leadPost,
      leadBody({
        priceLow: partial.priceLow,
        priceHigh: partial.priceHigh,
        refinements: { upgradeScope: ["lighting"] },
      }),
    );
    checkAcceptedLead(survived, "partial-scope lead");
    check(
      !survived.alerts.some((a) => a.includes("recompute-mismatch")),
      `upgradeScope must survive validation: server disagreed with a correctly-priced client (${survived.alerts.join("; ")})`,
    );

    // Negative control: a client posting the WRONG price must trip the alert,
    // proving the mismatch detector actually fires.
    const mismatch = await callRoute(
      leadPost,
      leadBody({
        priceLow: full.priceLow,
        priceHigh: full.priceHigh,
        refinements: { upgradeScope: ["lighting"] },
      }),
    );
    checkAcceptedLead(mismatch, "mismatched-price lead");
    check(
      mismatch.alerts.some((a) => a.includes("recompute-mismatch")),
      "a client price that disagrees with the server recompute must fire a recompute-mismatch alert",
    );

    const oob = await callRoute(
      leadPost,
      leadBody({ sqft: 999_999, priceLow: full.priceLow, priceHigh: full.priceHigh }),
    );
    checkAcceptedLead(oob, "out-of-bounds sqft lead");
    check(
      oob.alerts.some((a) => a.includes("estimate-unresolvable")),
      "out-of-bounds sqft must fire an estimate-unresolvable alert instead of silently clamping",
    );
  } finally {
    uninstallSuccessfulPersistence();
  }

  {
    const invalid = await callRoute(leadPost, { name: "x" });
    check(invalid.status === 400, `invalid lead body must be 400, got ${invalid.status}`);
  }

  {
    const unavailable = await callRoute(
      leadPost,
      leadBody({ priceLow: full.priceLow, priceHigh: full.priceHigh }),
    );
    check(unavailable.status === 503, `unavailable persistence must return 503, got ${unavailable.status}`);
    check(unavailable.json?.accepted === false, "unavailable persistence must report accepted=false");
    check(unavailable.json?.conversionEligible !== true, "unavailable persistence must never grant conversion eligibility");
  }

  {
    const uninstallFailedPersistence = installInquiryAcceptanceTestAdapter({ failWrites: true });
    try {
      const failed = await callRoute(
        leadPost,
        leadBody({ priceLow: full.priceLow, priceHigh: full.priceHigh }),
      );
      check(failed.status === 503, `failed persistence must return 503, got ${failed.status}`);
      check(failed.json?.accepted === false, "failed persistence must report accepted=false");
      check(failed.json?.conversionEligible !== true, "failed persistence must never grant conversion eligibility");
    } finally {
      uninstallFailedPersistence();
    }
  }

  if (failures > 0) {
    console.error(`\nverify-estimate-routes: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`All estimate-route checks passed (${checks} checks executing both POST handlers directly).`);
}

main().catch((err) => {
  console.error("verify-estimate-routes crashed:", err);
  process.exit(1);
});
