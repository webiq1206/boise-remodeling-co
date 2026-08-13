/**
 * Does the document pipeline actually hold up on a big set?
 *
 * NOT IN PREBUILD: it costs real money and needs the network. This is the
 * check you run after touching the extraction pipeline, and it is the only
 * one that proves the thing the offline suites can only assert around - that
 * a hundred-page plan set and a sixty-item repair list come back COMPLETE.
 *
 *   npm run check:large-documents            (both)
 *   npm run check:large-documents -- re10    (just the repair list)
 *   npm run check:large-documents -- plans   (just the plan set)
 */
import { buildSyntheticPlanSet, buildLargeRe10 } from "./lib/syntheticPlanSet";
import { extractRepairs } from "../server/services/re10Extract";
import { extractPlans } from "../server/services/planExtract";
import { summarizeInventory, describeCoverage } from "../shared/documents/pageInventory";
import { renderAuditTrail, conflicts } from "../shared/documents/auditTrail";

const RE10_ITEMS = 62;
const PLAN_SHEETS = 104;

function heading(text: string): void {
  console.log(`\n${"=".repeat(72)}\n${text}\n${"=".repeat(72)}`);
}

let problems = 0;
function flag(message: string): void {
  problems++;
  console.log(`  PROBLEM: ${message}`);
}

async function checkRe10(): Promise<void> {
  heading(`RE-10 with ${RE10_ITEMS} repair items`);
  const pdf = buildLargeRe10(RE10_ITEMS);
  console.log(`Built a ${(pdf.byteLength / 1024).toFixed(0)}KB PDF. Sending...\n`);

  const started = Date.now();
  const outcome = await extractRepairs([
    { filename: "large-re10.pdf", mimeType: "application/pdf", data: pdf },
  ]);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (!outcome.ok) {
    flag(`extraction failed after ${seconds}s: ${outcome.reason} - ${outcome.message}`);
    return;
  }

  const coverage = summarizeInventory(outcome.inventory);
  console.log(`Read in ${seconds}s.`);
  console.log(`Coverage: ${describeCoverage(outcome.inventory)}`);
  console.log(`Repairs found: ${outcome.result.repairs.length}`);
  console.log(`Unmapped: ${outcome.result.unmapped.length}`);
  console.log(`Suspected duplicates: ${outcome.duplicates.length}`);
  console.log(`Quantity conflicts: ${outcome.quantityConflicts.length}`);
  console.log(`Tokens: ${outcome.usage.inputTokens} in / ${outcome.usage.outputTokens} out`);

  if (!coverage.everyPageRead) flag(`${coverage.failed} page(s) went unread`);
  if (coverage.deepRead < coverage.totalPages) {
    console.log(`  note: ${coverage.deepRead} of ${coverage.totalPages} pages had a detailed read`);
  }

  /* The whole point. The old single-request extractor truncated silently, so
     a sixty-item document came back as a short list that looked complete. */
  const captured = outcome.result.repairs.length + outcome.result.unmapped.length;
  if (captured < RE10_ITEMS * 0.9) {
    flag(
      `only ${captured} of ~${RE10_ITEMS} requests were captured. This is the silent-truncation failure.`,
    );
  } else {
    console.log(`  OK: ${captured} of ~${RE10_ITEMS} requests captured.`);
  }

  const foundation = outcome.result.repairs.find((r) => /foundation/i.test(r.verbatim));
  if (!foundation) {
    flag("the foundation crack was not captured at all");
  } else if (!foundation.needsReview) {
    flag("the foundation crack was captured but NOT routed to review");
  } else {
    console.log(`  OK: foundation crack routed to review (${foundation.needsReview}).`);
  }

  if (outcome.duplicates.length === 0) {
    flag('the restated "running toilet (see item 3)" was not flagged as a possible duplicate');
  } else {
    for (const d of outcome.duplicates.slice(0, 3)) {
      console.log(`  duplicate candidate: "${outcome.result.repairs[d.a]?.verbatim?.slice(0, 60)}"`);
      console.log(`                   vs: "${outcome.result.repairs[d.b]?.verbatim?.slice(0, 60)}"`);
    }
  }
}

async function checkPlans(): Promise<void> {
  heading(`Plan set with ${PLAN_SHEETS} sheets`);
  const pdf = buildSyntheticPlanSet(PLAN_SHEETS);
  console.log(`Built a ${(pdf.byteLength / 1024).toFixed(0)}KB, ${PLAN_SHEETS}-sheet PDF. Sending...\n`);

  const started = Date.now();
  const outcome = await extractPlans([
    { filename: "large-plan-set.pdf", mimeType: "application/pdf", data: pdf },
  ]);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (!outcome.ok) {
    flag(`extraction failed after ${seconds}s: ${outcome.reason} - ${outcome.message}`);
    return;
  }

  const coverage = summarizeInventory(outcome.inventory);
  console.log(`Read in ${seconds}s.`);
  console.log(`Coverage: ${describeCoverage(outcome.inventory)}`);
  console.log(`Rooms: ${outcome.result.rooms.length}`);
  console.log(`Scope items: ${outcome.result.scopeItems.length}`);
  console.log(`Conflicts: ${conflicts(outcome.trail).length}`);
  console.log(`Tokens: ${outcome.usage.inputTokens} in / ${outcome.usage.outputTokens} out`);

  if (!coverage.everyPageRead) {
    flag(`${coverage.failed} of ${coverage.totalPages} page(s) went unread`);
  } else {
    console.log(`  OK: all ${coverage.totalPages} pages accounted for.`);
  }

  // The fixture tags the kitchen at 303 SF on A2.1 and 268 SF on the
  // superseded A2.1a. A pipeline that silently picks one is guessing.
  const kitchenConflict = conflicts(outcome.trail).find((c) => /kitchen/i.test(c.label));
  if (!kitchenConflict) {
    flag("the deliberate kitchen area conflict (303 SF vs 268 SF) was NOT detected");
  } else {
    console.log(`  OK: kitchen conflict detected - ${kitchenConflict.derivation}`);
  }

  const byOthers = outcome.result.scopeItems.filter((s) => !s.inContract);
  if (byOthers.length === 0) {
    flag('nothing was marked out of contract, but the set carries "BY OTHERS" and "NIC" work');
  } else {
    console.log(`  OK: ${byOthers.length} item(s) correctly marked out of contract.`);
  }

  if (process.env.SHOW_TRAIL === "1") {
    console.log("\n" + renderAuditTrail(outcome.trail));
  }
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY is not set. Add it to .env.local (gitignored).");
    process.exit(1);
  }
  const which = process.argv[2];
  if (!which || which === "re10") await checkRe10();
  if (!which || which === "plans") await checkPlans();

  console.log();
  if (problems > 0) {
    console.log(`check:large-documents: ${problems} PROBLEM(S) found.`);
    process.exit(1);
  }
  console.log("check:large-documents: OK - large sets come back complete.");
}

main().catch((err) => {
  console.error("check:large-documents crashed:", err);
  process.exit(1);
});
