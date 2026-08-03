/**
 * The disclosure engine: nothing generic, nothing contradictory, nothing shared.
 *
 * WHAT THIS SUITE IS ACTUALLY GUARDING. A disclaimer block is the easiest thing
 * in a codebase to let rot, because it always renders and never throws. The
 * failure is silent and it is expensive: a homeowner told that permits are
 * excluded on a job where we priced the permit has been given a false statement
 * in writing, and a homeowner shown fifteen irrelevant exclusions stops reading
 * the one that mattered.
 *
 * So this asserts the properties that keep it honest:
 *   1. Every line carries evidence. No evidence, no display.
 *   2. Nothing is both included and excluded.
 *   3. An item that WAS priced is never listed as excluded.
 *   4. Two different projects do not get the same disclosure.
 *   5. The remodel tool and the RE-10 tool share no sentences.
 *   6. Warnings only fire on a real trigger.
 *   7. Thin information widens the range; good information never narrows it
 *      below the floor.
 *   8. Nothing customer-facing leaks internal vocabulary.
 *
 *   npm run verify:disclosure
 */
import { buildRemodelDisclosure } from "../shared/estimate/remodelDisclosure";
import { buildRe10Disclosure } from "../shared/estimate/re10Disclosure";
import { disclosureText, MAX_BAND_PENALTY, type Disclosure } from "../shared/estimate/disclosure";
import { buildInternalEstimate, RULES_BY_PROJECT, type ScopeSelections } from "../shared/costs";
import { LEAD_FORBIDDEN_PHRASES } from "../shared/costs/outputs";
import { estimateRe10, type RepairItemInput } from "../shared/costs/re10Repairs";
import type { ProjectType } from "../shared/estimateEngine";

let checks = 0;
let failures = 0;
const fail = (m: string) => {
  failures++;
  if (failures <= 30) console.log("  FAIL: " + m);
};
const check = (c: boolean, m: string) => {
  checks++;
  if (!c) fail(m);
};

function remodel(project: ProjectType, selections: Partial<ScopeSelections>, extra = {}) {
  const sel = { quality: "mid-range", sqft: 250, ...selections } as ScopeSelections;
  const estimate = buildInternalEstimate(RULES_BY_PROJECT[project], sel, project);
  return buildRemodelDisclosure({ project, selections: sel, estimate, ...extra });
}

/* =============================================== 1. universal properties */

console.log("UNIVERSAL PROPERTIES\n");

function assertWellFormed(d: Disclosure, label: string) {
  for (const a of d.assumptions) {
    check(a.evidence.trim().length > 0, `${label}: assumption "${a.id}" has no evidence`);
    check(a.text.trim().length > 0, `${label}: assumption "${a.id}" has no text`);
  }
  for (const i of d.items) {
    check(i.evidence.trim().length > 0, `${label}: item "${i.id}" has no evidence`);
    check(i.detail.trim().length > 0, `${label}: item "${i.id}" has no detail`);
  }
  for (const w of d.warnings) {
    check(w.trigger.trim().length > 0, `${label}: warning "${w.id}" has no trigger`);
  }
  for (const m of d.missing) {
    check(m.what.trim().length > 0 && m.effect.trim().length > 0, `${label}: gap "${m.id}" says nothing useful`);
    check(m.remedy.trim().length > 0, `${label}: gap "${m.id}" tells the customer nothing they can do`);
  }
  // An id must not appear twice with different verdicts. The builder throws on
  // this, so reaching here at all means it held.
  const seen = new Map<string, string>();
  for (const i of d.items) {
    const prior = seen.get(i.id);
    check(prior === undefined || prior === i.status, `${label}: "${i.id}" is both ${prior} and ${i.status}`);
    seen.set(i.id, i.status);
  }
  check(d.bandPenalty >= 0, `${label}: band penalty went negative, which would narrow the range`);
  check(d.bandPenalty <= MAX_BAND_PENALTY, `${label}: band penalty ${d.bandPenalty} exceeds the cap`);
  // No internal vocabulary anywhere a customer can read.
  const text = disclosureText(d).toLowerCase();
  for (const phrase of LEAD_FORBIDDEN_PHRASES) {
    check(!text.includes(phrase.toLowerCase()), `${label}: leaks the forbidden phrase "${phrase}"`);
  }
}

const SCENARIOS: Array<[string, Disclosure]> = [
  ["kitchen/cosmetic", remodel("kitchen", { layoutChanges: "none", plumbingElectrical: "cosmetic" })],
  ["kitchen/gut", remodel("kitchen", { layoutChanges: "major", plumbingElectrical: "full" })],
  ["bathroom/x2", remodel("bathroom", { bathroomCount: 2, layoutChanges: "moderate" })],
  /* THE BEST CASE THE SYSTEM CAN PRODUCE: measured drawings that cleared every
     gate, and both scope questions answered. Nothing is missing, so nothing
     widens, and it must sit exactly on the floor. If this ever drifts above
     zero, some rule is charging uncertainty to a project that has none. */
  ["whole-home/measured", remodel(
    "whole-home",
    { sqft: 1714, layoutChanges: "moderate", plumbingElectrical: "partial" },
    {
      documentsProvided: true,
      planQuality: { areasAgree: true, trustedAreaShare: 1, measuredRoomCoverage: 0.9, canTightenPrice: true, blockers: [] },
      measurements: { sqft: 1714, measuredRooms: 9, interiorPerimeterFt: 490, ceilingHeight: 9, bathroomCount: 2, suggestedProject: "whole-home", layoutChanges: "moderate", plumbingElectrical: "partial", kitchenIncluded: true, scopeItems: [], excludedScope: [], notes: [] },
    },
  )],
  ["addition/1950s", remodel("addition", { sqft: 400, layoutChanges: "major" }, { yearBuilt: 1952 })],
  ["basement/bare", remodel("basement", { sqft: 800 })],
];

for (const [label, d] of SCENARIOS) assertWellFormed(d, label);
console.log(`  ${checks} well-formedness checks across ${SCENARIOS.length} remodel scenarios\n`);

/* ============================================ 2. included never excluded */

console.log("INCLUDED IS NEVER ALSO EXCLUDED\n");

for (const [label, d] of SCENARIOS) {
  const included = new Set(d.items.filter((i) => i.status === "included").map((i) => i.id));
  const excluded = d.items.filter((i) => i.status === "excluded").map((i) => i.id);
  for (const id of excluded) {
    check(!included.has(id), `${label}: "${id}" is listed as both included and excluded`);
  }
}

/* THE SPEC'S SHARPEST RULE, TESTED AGAINST THE TAKEOFF ITSELF. If the permit
   line is in the calculation the customer must be told permits are included,
   and must NOT be shown a permit exclusion. Checked both directions on every
   scenario, against the real line items rather than against an expectation. */
for (const [label, sel, project] of [
  ["kitchen", { layoutChanges: "major" }, "kitchen"],
  ["addition", { sqft: 400 }, "addition"],
  ["basement", { sqft: 800 }, "basement"],
] as Array<[string, Partial<ScopeSelections>, ProjectType]>) {
  const s = { quality: "mid-range", sqft: 250, ...sel } as ScopeSelections;
  const est = buildInternalEstimate(RULES_BY_PROJECT[project], s, project);
  const d = buildRemodelDisclosure({ project, selections: s, estimate: est });
  const permitPriced = est.lines.some((l) => l.code.startsWith("03-01-01"));
  const permitItem = d.items.find((i) => i.id === "permits");
  check(permitItem !== undefined, `${label}: permits are never mentioned either way`);
  check(
    permitPriced ? permitItem?.status === "included" : permitItem?.status === "excluded",
    `${label}: permit line ${permitPriced ? "IS" : "is NOT"} in the takeoff but the customer is told "${permitItem?.status}"`,
  );

  const demoPriced = est.lines.some((l) => l.code.startsWith("03-03-04"));
  const demoItem = d.items.find((i) => i.id === "demolition");
  check(
    demoPriced === (demoItem?.status === "included"),
    `${label}: demolition priced=${demoPriced} but shown as ${demoItem?.status ?? "absent"}`,
  );
}
console.log("  ok   permits and demolition always match the calculation\n");

/* ================================================ 3. nothing is generic */

console.log("TWO PROJECTS DO NOT GET THE SAME DISCLOSURE\n");

for (let i = 0; i < SCENARIOS.length; i++) {
  for (let j = i + 1; j < SCENARIOS.length; j++) {
    const [la, a] = SCENARIOS[i];
    const [lb, bb] = SCENARIOS[j];
    check(
      disclosureText(a) !== disclosureText(bb),
      `${la} and ${lb} produced identical disclosure text, which means it is a template`,
    );
    // Assumptions in particular must differ: they are the part that claims to
    // describe THIS project.
    check(
      a.assumptions.map((x) => x.text).join("|") !== bb.assumptions.map((x) => x.text).join("|"),
      `${la} and ${lb} share an identical assumption list`,
    );
  }
}
console.log(`  ok   all ${(SCENARIOS.length * (SCENARIOS.length - 1)) / 2} scenario pairs differ\n`);

/* ========================================= 4. warnings need real triggers */

console.log("WARNINGS ONLY WHEN RELEVANT\n");

/* THE EXPECTATION IS DERIVED FROM THE TAKEOFF, NOT HARDCODED. A first pass at
   this suite assumed a "cosmetic" kitchen disturbs nothing and asserted the
   warnings stay away. The takeoff disagreed: even a refresh carries 250 SF of
   demolition, because ripping out cabinets and flooring is demolition, and in a
   1952 house that is precisely when asbestos floor tile turns up. The code was
   right and the test was wrong, so the test now asks the calculation. */
function disturbs(project: ProjectType, sel: Partial<ScopeSelections>): boolean {
  const s = { quality: "mid-range", sqft: 250, ...sel } as ScopeSelections;
  const est = buildInternalEstimate(RULES_BY_PROJECT[project], s, project);
  return est.lines.some((l) => l.code.startsWith("03-03-04")) || (sel.layoutChanges ?? "none") !== "none";
}

const CONCEALED_CASES: Array<[string, ProjectType, Partial<ScopeSelections>]> = [
  ["kitchen refresh", "kitchen", { layoutChanges: "none", plumbingElectrical: "cosmetic" }],
  ["kitchen gut", "kitchen", { layoutChanges: "major", plumbingElectrical: "full" }],
  ["bathroom", "bathroom", { layoutChanges: "moderate" }],
  // An addition is new construction tied onto the house: the takeoff carries no
  // demolition line, so it is the one scope that genuinely disturbs nothing.
  ["addition", "addition", { sqft: 400, layoutChanges: "none" }],
];
for (const [label, project, sel] of CONCEALED_CASES) {
  const expected = disturbs(project, sel);
  const d = remodel(project, sel, { yearBuilt: 1952 });
  check(
    d.warnings.some((w) => w.id === "concealed") === expected,
    `${label}: concealed warning ${expected ? "missing" : "present"} but the takeoff says disturbs=${expected}`,
  );
  check(
    d.warnings.some((w) => w.id === "hazardous-materials") === expected,
    `${label}: 1952 house, asbestos warning does not track disturbs=${expected}`,
  );
}

/* THE YEAR IS THE DISCRIMINATOR, and it has to cut both ways. */
const gutted2020 = remodel("kitchen", { layoutChanges: "major", plumbingElectrical: "full" }, { yearBuilt: 2020 });
check(
  !gutted2020.warnings.some((w) => w.id === "hazardous-materials"),
  "a 2020 house got an asbestos warning, which is the generic-boilerplate failure",
);
/* AND SILENCE WHEN WE DO NOT KNOW. Guessing a warning is as wrong as guessing a
   number: it tells a customer their house may contain asbestos on no evidence
   at all. No year, no claim. */
const unknownAge = remodel("kitchen", { layoutChanges: "major", plumbingElectrical: "full" });
check(
  !unknownAge.warnings.some((w) => w.id === "hazardous-materials"),
  "a house of unknown age got an asbestos warning on no evidence",
);
check(
  !unknownAge.items.some((i) => i.id === "hazmat"),
  "a house of unknown age got a hazardous-material exclusion on no evidence",
);
console.log("  ok   concealed and hazardous warnings track the takeoff, the year, and silence when unknown\n");

/* ================================= 5. information quality moves the band */

console.log("INFORMATION QUALITY MOVES THE RANGE\n");

const wellDocumented = SCENARIOS.find(([l]) => l === "whole-home/measured")![1];
const noInfo = remodel("whole-home", { sqft: 1714 }, { documentsProvided: false });
check(
  wellDocumented.bandPenalty < noInfo.bandPenalty,
  `a measured project (${wellDocumented.bandPenalty}) should not be wider than an undocumented one (${noInfo.bandPenalty})`,
);
check(wellDocumented.bandPenalty === 0, "a fully measured project should sit at the floor, not above it");
check(wellDocumented.confidence === "high", "a fully measured project should read as high confidence");
check(noInfo.confidence !== "high", "a project with no drawings and no scope answers should not read as high confidence");
check(
  noInfo.missing.length > 0,
  "an undocumented project produced no missing-information entries, so the customer is not told why it is wide",
);
console.log(
  `  ok   measured penalty ${wellDocumented.bandPenalty} (${wellDocumented.confidence}) vs undocumented ${noInfo.bandPenalty} (${noInfo.confidence})\n`,
);

/* ====================================== 6. the RE-10 tool is a different tool */

console.log("THE TWO TOOLS SHARE NO LANGUAGE\n");

const REPAIRS: RepairItemInput[] = [
  { id: "1", kind: "drywall-repaint-wall", description: "Repair drywall in garage and repaint", quantity: 40 },
  { id: "2", kind: "gfci-install", description: "GFCI at kitchen counter", quantity: 2 },
  { id: "3", kind: "toilet-repair", description: "Running toilet, guest bath" },
  { id: "4", kind: "general-minor-repair", description: "Foundation crack in crawlspace", needsReview: "foundation" },
];
const re10Estimate = estimateRe10(REPAIRS, {
  occupancy: "occupied",
  access: "standard",
  daysToDeadline: 14,
  hasInspectionReport: true,
});
const re10 = buildRe10Disclosure({
  estimate: re10Estimate,
  unmapped: [{ verbatim: "Service the chimney", reason: "No category matches a chimney service." }],
  documentNotes: ["Page 3 is a photograph of a printed page and several lines are cut off."],
  repairDeadline: "2026-09-01",
  occupancy: "occupied",
});
assertWellFormed(re10, "re10");

/* NO SENTENCE MAY APPEAR IN BOTH TOOLS. This is the explicit instruction: do
   not copy the same disclaimer into both. Compared sentence by sentence rather
   than blob to blob, because a shared paragraph is exactly what would slip. */
const sentences = (d: Disclosure) =>
  new Set(
    disclosureText(d)
      .split(/[\n.]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 25),
  );
for (const [label, d] of SCENARIOS) {
  const shared = [...sentences(d)].filter((s) => sentences(re10).has(s));
  check(
    shared.length === 0,
    `${label} and the RE-10 tool share ${shared.length} sentence(s), starting: "${shared[0] ?? ""}"`,
  );
}
console.log("  ok   no sentence is shared between the remodel tool and the RE-10 tool\n");

/* The RE-10 must say the RE-10 specific things, and the remodel must not. */
const re10Text = disclosureText(re10).toLowerCase();
check(re10Text.includes("could not be read") || re10Text.includes("cut off"), "the RE-10 never mentions what it could not read");
check(re10Text.includes("concealed") || re10Text.includes("behind walls"), "the RE-10 never mentions concealed damage");
check(re10Text.includes("crawlspace") || re10Text.includes("foundation"), "the RE-10 does not name the repair it flagged");
for (const [label, d] of SCENARIOS) {
  const t = disclosureText(d).toLowerCase();
  check(!t.includes("re-10"), `${label} mentions the RE-10, which is the other tool`);
  check(!t.includes("uploaded document"), `${label} uses RE-10 document language`);
}

/* Every flagged repair reaches the customer, by name. A repair the estimator
   set aside and nobody was told about is the RE-10 version of a vanished item. */
for (const r of re10Estimate.review) {
  check(
    re10.items.some((i) => i.label === r.input.description),
    `the RE-10 dropped a flagged repair from the customer's list: "${r.input.description}"`,
  );
}
check(
  re10.items.some((i) => i.id.startsWith("unmapped-")),
  "an unmapped request never reached the customer's list",
);
check(
  re10.missing.some((m) => m.id.startsWith("doc-note-")),
  "a note about what we could not read never reached the customer",
);
console.log("  ok   every flagged, unmapped and unreadable item is named to the customer\n");

/* A clean read must NOT get the extraction-failure language. */
const cleanRe10 = buildRe10Disclosure({
  estimate: estimateRe10(REPAIRS.slice(0, 2), {
    occupancy: "vacant",
    access: "standard",
    daysToDeadline: null,
    hasInspectionReport: true,
  }),
});
check(
  cleanRe10.missing.length === 0,
  "a clean RE-10 read still reported missing information, which is boilerplate",
);
check(
  cleanRe10.bandPenalty < re10.bandPenalty,
  `a clean read (${cleanRe10.bandPenalty}) should be tighter than one with unreadable pages (${re10.bandPenalty})`,
);
check(
  disclosureText(cleanRe10) !== disclosureText(re10),
  "two different RE-10 documents produced identical disclosure",
);
console.log(`  ok   clean read penalty ${cleanRe10.bandPenalty} vs damaged-document read ${re10.bandPenalty}\n`);

console.log(
  failures === 0
    ? `verify:disclosure: OK (${checks} checks; nothing generic, nothing contradictory, nothing shared)`
    : `verify:disclosure: FAILED with ${failures} problem(s) across ${checks} checks`,
);
process.exit(failures === 0 ? 0 : 1);
