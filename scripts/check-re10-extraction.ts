/**
 * Does RE-10 extraction actually work on this environment?
 *
 * WHY THIS EXISTS. `isExtractionConfigured()` only checks that a key is
 * present. A present key can still be revoked, out of credit, scoped to the
 * wrong workspace, or pasted with a trailing newline - and every one of those
 * fails at the moment a real agent uploads a real RE-10, which is the worst
 * possible time to find out. This runs the whole chain against a synthetic
 * RE-10 and prices the result, so "the key is in" and "the feature works" stop
 * being the same claim.
 *
 * NOT IN PREBUILD, ON PURPOSE. It costs money and needs the network. A build
 * that fails because Anthropic had a bad minute would be a worse problem than
 * the one it catches. Run it by hand after setting the key, and after changing
 * the prompt or the schema.
 *
 *   npm run check:re10-extraction
 */
import { extractRepairs, isExtractionConfigured } from "../server/services/re10Extract";
import { estimateRe10, RECIPES, TRADE_LABELS, type RepairItemInput } from "../shared/costs/re10Repairs";
import { EXTRACTABLE_KINDS } from "../shared/re10/extraction";
import { buildPdf, SYNTHETIC_RE10 } from "./lib/syntheticRe10Pdf";

async function main() {
  if (!isExtractionConfigured()) {
    console.log("ANTHROPIC_API_KEY is not set on this environment.\n");
    console.log("  Local:      add ANTHROPIC_API_KEY=sk-ant-... to .env.local (gitignored)");
    console.log("  Production: Replit > Secrets > ANTHROPIC_API_KEY, then redeploy\n");
    console.log("Get a key at https://console.anthropic.com > API keys.");
    console.log("Until then /api/re10/analyze answers 503 and the wizard offers the manual path.");
    process.exit(1);
  }

  console.log("Sending a synthetic RE-10 to the extractor...\n");
  const started = Date.now();
  const outcome = await extractRepairs([
    { filename: "synthetic-re10.pdf", mimeType: "application/pdf", data: buildPdf(SYNTHETIC_RE10) },
  ]);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (!outcome.ok) {
    console.log(`FAILED after ${seconds}s - ${outcome.reason}`);
    console.log(outcome.message);
    // An auth failure here is the whole point of the script: the key is
    // present and does not work, which no amount of presence-checking finds.
    process.exit(1);
  }

  const { repairs, unmapped, looksLikeRe10 } = outcome.result;
  console.log(`Read in ${seconds}s. looksLikeRe10=${looksLikeRe10}\n`);

  let problems = 0;
  const flag = (m: string) => {
    problems++;
    console.log("  PROBLEM: " + m);
  };

  console.log(`REPAIRS FOUND (${repairs.length})`);
  for (const r of repairs) {
    const quantity = r.quantity == null ? "no quantity" : `${r.quantity}`;
    const review = r.needsReview ? `  [review: ${r.needsReview}]` : "";
    console.log(`  ${r.kind}  (${quantity})${review}`);
    console.log(`     "${r.verbatim}"`);
    if (!EXTRACTABLE_KINDS.includes(r.kind)) flag(`"${r.kind}" is not a kind the estimator can price`);
    if (!RECIPES[r.kind]) flag(`"${r.kind}" has no recipe`);
  }
  if (unmapped.length > 0)
    console.log(
      `\nUNMAPPED (${unmapped.length})\n  ${unmapped
        .map((u) => `${u.verbatim}${u.reason ? ` - ${u.reason}` : ""}`)
        .join("\n  ")}`,
    );

  /* What a correct read of this fixture looks like. Not an exact-match test -
     several of these map to more than one defensible kind - but the specific
     traps are worth failing on. */
  console.log("");
  if (!looksLikeRe10) flag("a document headed RE-10 INSPECTION RESPONSE did not read as an RE-10");
  if (repairs.length < 5) flag(`only ${repairs.length} repairs found; the fixture asks for six`);

  const foundation = repairs.find((r) => /foundation/i.test(r.verbatim));
  if (!foundation) flag("the foundation crack was not picked up at all");
  else if (!foundation.needsReview) {
    flag("the foundation crack was returned as priceable - it must be flagged for an onsite look");
  }

  const drywall = repairs.find((r) => /drywall|garage/i.test(r.verbatim));
  if (drywall && drywall.quantity !== 40) {
    flag(`the drywall quantity should be 40 from "approximately 40 square feet", got ${drywall.quantity}`);
  }

  const invented = repairs.filter((r) => r.quantity != null && !/\d/.test(r.verbatim));
  for (const r of invented) flag(`a quantity was invented for "${r.verbatim}" - the text states none`);

  if (repairs.some((r) => /manual|warranty documentation/i.test(r.verbatim))) {
    flag("the appliance-manuals line was read as a repair; it is a paperwork term");
  }

  /* Price it, so the whole chain is exercised rather than just the read. */
  const items: RepairItemInput[] = repairs.map((r, i) => ({
    id: `x${i}`,
    description: r.verbatim,
    kind: r.kind,
    location: r.location,
    quantity: r.quantity ?? null,
    needsReview: r.needsReview,
  }));
  const estimate = estimateRe10(items, {
    occupancy: "occupied",
    access: "standard",
    daysToDeadline: 14,
    hasInspectionReport: true,
  });

  const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
  console.log(`RANGE  ${usd(estimate.low)} to ${usd(estimate.high)}  (${estimate.confidence} confidence)`);
  for (const t of estimate.trades) {
    console.log(`  ${TRADE_LABELS[t.trade]}: ${t.repairs.length} item(s)`);
  }
  if (estimate.review.length > 0) {
    console.log(`  Needs an onsite look: ${estimate.review.map((r) => r.input.description).join("; ")}`);
  }
  if (!estimate.worthwhile) console.log("  (below the worthwhile threshold)");

  console.log(
    problems === 0
      ? "\ncheck:re10-extraction: OK - the key works and the chain runs end to end."
      : `\ncheck:re10-extraction: ${problems} problem(s). The key works; the read needs attention.`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("check:re10-extraction threw:", err);
  process.exit(1);
});
