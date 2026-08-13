/**
 * The document pipeline's contract, verified without a model.
 *
 * The expensive proof (a real 104-sheet set through the real API) lives in
 * `check:large-documents` and costs money. Everything that can be checked
 * without a network call is checked here, in prebuild, because the failures
 * this pipeline exists to prevent are silent ones: a page that was never read,
 * a room counted twice, two sheets disagreeing and one being picked at random.
 * None of those announce themselves at runtime, so they have to fail a build.
 */
import { PDFDocument } from "pdf-lib";
import {
  buildInventory,
  buildChunks,
  subdivideChunk,
  mapWithConcurrency,
  type SourceFile,
} from "../server/services/documentSplit";
import {
  summarizeInventory,
  describeCoverage,
  PRICING_RELEVANT_KINDS,
  type PageInventory,
} from "../shared/documents/pageInventory";
import {
  addFact,
  emptyTrail,
  normalizeKey,
  valuesAgree,
  conflicts,
  renderAuditTrail,
  AGREEMENT_TOLERANCE,
} from "../shared/documents/auditTrail";
import { assessReadiness, MIN_MEAN_LEGIBILITY } from "../shared/documents/readiness";
import { mergePlanReads, type ChunkedRead } from "../shared/plans/merge";
import { findDuplicatePairs, findQuantityConflicts, similarity, DUPLICATE_THRESHOLD } from "../shared/re10/duplicates";
import { buildSyntheticPlanSet, buildLargeRe10, buildSyntheticPlanSetPages, buildLargeRe10Pages } from "./lib/syntheticPlanSet";
import { PLAN_EXTRACTION_SCHEMA, type PlanExtractionResult, type PlanRoom } from "../shared/plans/extraction";
import { EXTRACTION_SCHEMA, type ExtractedRepair } from "../shared/re10/extraction";

let checks = 0;
let failures = 0;
function check(cond: boolean, message: string): void {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${message}`);
  }
}

function room(over: Partial<PlanRoom> = {}): PlanRoom {
  return {
    name: "Kitchen",
    areaSqFt: 303,
    areaSource: "printed",
    dimensionText: null,
    ceilingHeightFt: null,
    sheet: "A2.1",
    phase: "new",
    level: "Main",
    inScope: true,
    ...over,
  };
}

function planResult(over: Partial<PlanExtractionResult> = {}): PlanExtractionResult {
  return {
    looksLikePlans: true,
    projectType: "remodel",
    statedTotalSqFt: null,
    roomAreaTotalSqFt: null,
    rooms: [],
    counts: [],
    scopeItems: [],
    scopeFacts: {
      wallsRemovedOrAdded: null,
      plumbingFixturesRelocated: null,
      electricalServiceOrPanelWork: null,
      structuralWork: null,
      hvacWork: null,
      exteriorEnvelopeWork: null,
      kitchenInScope: null,
    },
    sheetsUsed: [],
    scopeNotes: [],
    warnings: [],
    ...over,
  };
}

function read(rooms: PlanRoom[], pageIndices: number[], over: Partial<PlanExtractionResult> = {}): ChunkedRead {
  return {
    result: planResult({ rooms, ...over }),
    pageIndices,
    filename: "plans.pdf",
    sheet: rooms[0]?.sheet ?? null,
  };
}

function repair(over: Partial<ExtractedRepair> = {}): ExtractedRepair {
  return { verbatim: "Repair the running toilet in the guest bathroom.", kind: "toilet-repair", confidence: "high", ...over } as ExtractedRepair;
}

async function main(): Promise<void> {
  console.log("verify-documents: pagination and chunking");
  {
    const pdf = buildSyntheticPlanSet(104);
    const files: SourceFile[] = [{ filename: "plans.pdf", mimeType: "application/pdf", data: pdf }];
    const inventory = await buildInventory(files);
    check(inventory.pages.length === 104, `a 104-sheet PDF must paginate to 104 pages, got ${inventory.pages.length}`);
    check(inventory.unpaginated.length === 0, "a well-formed PDF must not be reported unpaginated");
    check(
      inventory.pages.every((p, i) => p.index === i + 1),
      "page indices must be 1-based and contiguous across the whole upload",
    );
    check(
      inventory.pages.every((p) => p.status === "pending"),
      "a fresh inventory must start every page pending, so nothing defaults to read",
    );

    const chunks = await buildChunks(files, inventory, inventory.pages.map((p) => p.index), 8);
    check(chunks.length === 13, `104 pages at 8 per chunk must be 13 chunks, got ${chunks.length}`);
    const covered = new Set(chunks.flatMap((c) => c.pageIndices));
    check(covered.size === 104, `chunking must cover every page exactly once, covered ${covered.size}`);
    check(
      chunks.reduce((n, c) => n + c.pageIndices.length, 0) === 104,
      "chunking must not duplicate a page across chunks",
    );

    // Every emitted chunk must be a real, openable PDF with the right count.
    for (const chunk of chunks.slice(0, 3)) {
      const doc = await PDFDocument.load(chunk.data);
      check(
        doc.getPageCount() === chunk.pageIndices.length,
        `chunk "${chunk.label}" must contain ${chunk.pageIndices.length} pages, contains ${doc.getPageCount()}`,
      );
    }

    const halved = await subdivideChunk(files, inventory, chunks[0]);
    check(halved !== null && halved.length > 1, "an 8-page chunk must subdivide for the retry ladder");
    check(
      (halved ?? []).flatMap((c) => c.pageIndices).length === chunks[0].pageIndices.length,
      "subdividing must preserve every page of the original chunk",
    );
    const single = await buildChunks(files, inventory, [1], 1);
    check(await subdivideChunk(files, inventory, single[0]) === null, "a single-page chunk must be atomic");
  }

  {
    // A corrupt file must be reported, not thrown, and must not take the
    // readable files down with it.
    const files: SourceFile[] = [
      { filename: "good.pdf", mimeType: "application/pdf", data: buildLargeRe10(4) },
      { filename: "broken.pdf", mimeType: "application/pdf", data: Buffer.from("not a pdf at all") },
      { filename: "photo.jpg", mimeType: "image/jpeg", data: Buffer.from("fake") },
    ];
    // The corrupt file logs by design; muffle it so prebuild output stays clean.
    const realError = console.error;
    console.error = () => {};
    const inventory = await buildInventory(files);
    console.error = realError;
    check(inventory.unpaginated.length === 1, `one corrupt file must be reported, got ${inventory.unpaginated.length}`);
    check(inventory.unpaginated[0].filename === "broken.pdf", "the corrupt file must be named");
    check(
      inventory.pages.some((p) => p.filename === "good.pdf"),
      "a corrupt file must not prevent the readable ones from paginating",
    );
    check(
      inventory.pages.filter((p) => p.filename === "photo.jpg").length === 1,
      "an image must count as exactly one page",
    );
    check(
      !summarizeInventory(inventory).everyPageRead,
      "a file that could not be opened must count against completeness",
    );
  }

  console.log("verify-documents: coverage accounting");
  {
    const inventory: PageInventory = {
      pages: [
        { index: 1, filename: "a.pdf", pageInFile: 1, status: "read", kind: "floor-plan", medium: "vector", sheet: "A2.1", title: null, legibility: 0.9, pricingRelevant: true, deepRead: true },
        { index: 2, filename: "a.pdf", pageInFile: 2, status: "read", kind: "detail", medium: "vector", sheet: "D1.1", title: null, legibility: 0.9, pricingRelevant: false, deepRead: false },
        { index: 3, filename: "a.pdf", pageInFile: 3, status: "failed", kind: "unreadable", medium: "scanned", sheet: null, title: null, legibility: 0.1, pricingRelevant: false, deepRead: false, failureReason: "too faint" },
      ],
      unpaginated: [],
    };
    const s = summarizeInventory(inventory);
    check(s.totalPages === 3 && s.read === 2 && s.failed === 1, `summary must count 3/2/1, got ${s.totalPages}/${s.read}/${s.failed}`);
    check(!s.everyPageRead, "one failed page must make everyPageRead false");
    check(s.failedPages[0].reason === "too faint", "the failure reason must survive into the summary");
    check(describeCoverage(inventory).includes("could NOT be read"), "coverage prose must state the failure plainly");
    check(PRICING_RELEVANT_KINDS.includes("floor-plan"), "floor plans must be pricing-relevant");
    check(!PRICING_RELEVANT_KINDS.includes("detail"), "detail sheets must not force a deep read");
  }

  console.log("verify-documents: audit trail, dedup and conflicts");
  {
    check(valuesAgree(303, 302), "readings within tolerance must agree");
    check(!valuesAgree(303, 268), "a superseded 268 must NOT agree with 303");
    check(valuesAgree(null, null), "two absent values agree");
    check(!valuesAgree(303, null), "a value and an absence do not agree");
    check(valuesAgree(1000, 1000 * (1 + AGREEMENT_TOLERANCE)), "exactly at tolerance must still agree");

    const trail = emptyTrail();
    const base = { factType: "room-area", label: "Kitchen", unit: "SF", derivation: "printed", status: "confirmed" as const };
    addFact(trail, { ...base, key: "kitchen", value: 303, sources: [{ pageIndex: 4, filename: "p.pdf", sheet: "A2.1", quote: "303 SF" }] });
    check(trail.facts.length === 1, "the first fact is recorded");

    addFact(trail, { ...base, key: "kitchen", value: 303, sources: [{ pageIndex: 1, filename: "p.pdf", sheet: "G0.1", quote: "303 SF" }] });
    check(trail.facts.length === 1, "a restated fact must MERGE, not append - this is the double count");
    check(trail.facts[0].status === "deduplicated", "a restated fact must be marked deduplicated");
    check(trail.facts[0].sources.length === 2, "both sources must be kept for the audit trail");

    addFact(trail, { ...base, key: "kitchen", value: 268, sources: [{ pageIndex: 9, filename: "p.pdf", sheet: "A2.1a", quote: "268 SF" }] });
    check(trail.facts[0].status === "conflict", "a contradicting value must raise a conflict, never average or overwrite");
    check((trail.facts[0].competingValues ?? []).length >= 2, "both competing readings must be recorded");
    check(conflicts(trail).length === 1, "the conflict must be findable");

    // Once contradicted, more evidence must not silently resolve it.
    addFact(trail, { ...base, key: "kitchen", value: 303, sources: [{ pageIndex: 12, filename: "p.pdf", sheet: "A2.1", quote: "303 SF" }] });
    check(trail.facts[0].status === "conflict", "a conflict must stay a conflict until a human settles it");

    check(normalizeKey("KITCHEN ") === normalizeKey("kitchen"), "keys must normalise case and whitespace");
    check(normalizeKey("Bath 1", "new") !== normalizeKey("Bath 2", "new"), "different rooms must not collide");
    check(renderAuditTrail(trail).includes("CONFLICT"), "the rendered trail must show the conflict");
    check(renderAuditTrail(trail).includes("A2.1a"), "the rendered trail must name the sheet a value came from");
  }

  console.log("verify-documents: plan merge does not double count");
  {
    // The same room read from two chunks: one room, two sources, counted once.
    const merged = mergePlanReads([
      read([room({ areaSqFt: 303 })], [4]),
      read([room({ areaSqFt: 303, sheet: "G0.1" })], [1]),
    ]);
    check(merged.result.rooms.length === 1, `a room read twice must merge to one, got ${merged.result.rooms.length}`);
    check(merged.duplicateRoomsMerged === 1, "the merge count must be reported");
    check(merged.result.roomAreaTotalSqFt === 303, `total must be 303 counted once, got ${merged.result.roomAreaTotalSqFt}`);

    /* THE 3,056-FOR-1,714 BUG. The same floor drawn on an existing sheet and
       a new sheet is one floor. Summing both is what priced a 1,714 SF job at
       3,056 SF, and it must stay impossible. */
    const bothPhases = mergePlanReads([
      read([room({ areaSqFt: 303, phase: "new" }), room({ name: "Living", areaSqFt: 538, phase: "new" })], [4]),
      read([room({ areaSqFt: 303, phase: "existing" }), room({ name: "Living", areaSqFt: 538, phase: "existing" })], [3]),
    ]);
    check(
      bothPhases.result.roomAreaTotalSqFt === 841,
      `existing-phase rooms must be excluded from the measured total, got ${bothPhases.result.roomAreaTotalSqFt}`,
    );
    check(bothPhases.result.rooms.length === 4, "existing rooms are kept as evidence, just not summed");

    const contradicting = mergePlanReads([
      read([room({ areaSqFt: 303, sheet: "A2.1" })], [4]),
      read([room({ areaSqFt: 268, sheet: "A2.1a" })], [9]),
    ]);
    check(conflicts(contradicting.trail).length === 1, "two areas for one room must surface as a conflict");

    // Scope facts OR across the set: structure found on sheet 60 is structure.
    const facts = mergePlanReads([
      read([], [1], { scopeFacts: { ...planResult().scopeFacts, structuralWork: false } }),
      read([], [60], { scopeFacts: { ...planResult().scopeFacts, structuralWork: true } }),
    ]);
    check(facts.result.scopeFacts.structuralWork === true, "a later true must not be erased by an earlier false");
    const nulled = mergePlanReads([
      read([], [1], { scopeFacts: { ...planResult().scopeFacts, hvacWork: true } }),
      read([], [60], { scopeFacts: { ...planResult().scopeFacts, hvacWork: null } }),
    ]);
    check(nulled.result.scopeFacts.hvacWork === true, "a null from a later chunk must not erase an established true");

    // Out-of-contract work must be recorded as excluded, never priced.
    const nic = mergePlanReads([
      read([], [15], {
        scopeItems: [
          { category: "site", description: "Driveway widening BY OTHERS", sheet: "C1.1", inContract: false },
          { category: "structural", description: "New pad footings", sheet: "S1.1", inContract: true },
        ],
      }),
    ]);
    check(nic.result.scopeItems.length === 2, "both in and out of contract items are kept");
    check(
      nic.trail.facts.some((f) => f.factType === "out-of-contract" && f.status === "excluded"),
      "work marked BY OTHERS must be recorded as excluded in the trail",
    );

    // Merge order must not change the answer.
    const a = mergePlanReads([read([room()], [4]), read([room({ name: "Dining", areaSqFt: 214 })], [9])]);
    const b = mergePlanReads([read([room({ name: "Dining", areaSqFt: 214 })], [9]), read([room()], [4])]);
    check(a.result.roomAreaTotalSqFt === b.result.roomAreaTotalSqFt, "merge must be order-independent");
  }

  console.log("verify-documents: repair duplicate detection");
  {
    const restated = [
      repair({ verbatim: "Repair drywall damage in the powder room, approximately 7 square feet, and repaint." }),
      repair({ verbatim: "Repair drywall damage in the powder room, approximately 7 square feet, and repaint (see item 1 above)." }),
    ];
    const pairs = findDuplicatePairs(restated);
    check(pairs.length === 1, `a verbatim restatement must be flagged, got ${pairs.length}`);

    /* THE FALSE POSITIVE THAT MUST NOT HAPPEN. Two bedrooms are two jobs.
       Silently merging them is the same silent-vanish bug wearing a hat. */
    const twoRooms = [
      repair({ kind: "drywall-repaint-wall", verbatim: "Repair drywall damage in bedroom 1 and repaint.", location: "bedroom 1" }),
      repair({ kind: "drywall-repaint-wall", verbatim: "Repair drywall damage in bedroom 2 and repaint.", location: "bedroom 2" }),
    ];
    check(findDuplicatePairs(twoRooms).length === 0, "two different rooms must NOT be flagged as duplicates");

    const differentKinds = [
      repair({ kind: "toilet-repair", verbatim: "Repair the running toilet in the guest bathroom." }),
      repair({ kind: "gfci-install", verbatim: "Repair the running toilet in the guest bathroom." }),
    ];
    check(findDuplicatePairs(differentKinds).length === 0, "different repair kinds are different work whatever the wording");

    check(similarity("repair the running toilet", "repair the running toilet") === 1, "identical text scores 1");
    check(similarity("repair the running toilet", "install a new roof") < DUPLICATE_THRESHOLD, "unrelated text scores low");

    const conflicting = [
      repair({ kind: "drywall-repaint-wall", verbatim: "Repair drywall in the garage, 40 square feet.", quantity: 40 }),
      repair({ kind: "drywall-repaint-wall", verbatim: "Repair drywall in the garage, 60 square feet.", quantity: 60 }),
    ];
    const dupes = findDuplicatePairs(conflicting);
    check(findQuantityConflicts(conflicting, dupes).length === 1, "the same repair with two measurements must raise a quantity conflict");
    check(
      findQuantityConflicts(restated, pairs).length === 0,
      "a restatement with no stated quantities must not invent a conflict",
    );
  }

  console.log("verify-documents: readiness gate");
  {
    const clean: PageInventory = {
      pages: [
        { index: 1, filename: "a.pdf", pageInFile: 1, status: "read", kind: "floor-plan", medium: "vector", sheet: "A1", title: null, legibility: 0.95, pricingRelevant: true, deepRead: true },
      ],
      unpaginated: [],
    };
    const ok = assessReadiness({ inventory: clean, trail: emptyTrail(), hasPriceableContent: true });
    check(ok.canFinalize, "a fully-read, consistent, priceable set must be allowed to finalize");
    check(ok.confidence > 0.9, `confidence should be high on a clean read, got ${ok.confidence}`);

    const withFailure: PageInventory = {
      pages: [
        ...clean.pages,
        { index: 2, filename: "a.pdf", pageInFile: 2, status: "failed", kind: "unreadable", medium: "scanned", sheet: null, title: null, legibility: 0, pricingRelevant: false, deepRead: false, failureReason: "too faint" },
      ],
      unpaginated: [],
    };
    const blocked = assessReadiness({ inventory: withFailure, trail: emptyTrail(), hasPriceableContent: true });
    check(!blocked.canFinalize, "ANY unread page must block a tightened price");
    check(blocked.blockers.some((b) => b.kind === "pages-unread"), "the blocker must name the unread pages");
    check(blocked.blockers.every((b) => b.remedy.length > 10), "every blocker must carry an actionable remedy");
    check(
      blocked.blockers.some((b) => b.message.includes("a.pdf page 2")),
      "the customer must be told WHICH page failed, not just that one did",
    );

    const trail = emptyTrail();
    const base = { factType: "room-area", label: "Kitchen", unit: "SF", derivation: "d", status: "confirmed" as const };
    addFact(trail, { ...base, key: "k", value: 303, sources: [{ pageIndex: 4, filename: "p", sheet: "A2.1", quote: null }] });
    addFact(trail, { ...base, key: "k", value: 268, sources: [{ pageIndex: 9, filename: "p", sheet: "A2.1a", quote: null }] });
    const contradicted = assessReadiness({ inventory: clean, trail, hasPriceableContent: true });
    check(!contradicted.canFinalize, "an unresolved conflict must block a tightened price");
    check(contradicted.questions.length === 1, "a conflict must become exactly one question");
    check(contradicted.questions[0].answer === "choice", "a conflict question must offer the competing readings");
    check((contradicted.questions[0].options ?? []).length === 2, "both readings must be offered as options");

    const nothing = assessReadiness({ inventory: clean, trail: emptyTrail(), hasPriceableContent: false });
    check(!nothing.canFinalize, "a set with nothing priceable in it must not finalize");

    const empty = assessReadiness({ inventory: { pages: [], unpaginated: [] }, trail: emptyTrail(), hasPriceableContent: false });
    check(!empty.canFinalize && empty.confidence === 0, "an empty upload must be blocked at zero confidence");

    const missing = assessReadiness({
      inventory: clean,
      trail: emptyTrail(),
      hasPriceableContent: true,
      missingCriticalInputs: [{ label: "a stated total floor area", question: "What is the total square footage?", why: "because" }],
    });
    check(!missing.canFinalize, "a missing critical input must block");
    check(missing.questions.some((q) => q.answer === "number"), "a missing measurement must be asked for as a number");

    const faint: PageInventory = {
      pages: clean.pages.map((p) => ({ ...p, legibility: MIN_MEAN_LEGIBILITY - 0.1 })),
      unpaginated: [],
    };
    check(
      !assessReadiness({ inventory: faint, trail: emptyTrail(), hasPriceableContent: true }).canFinalize,
      "a set too faint to read confidently must block rather than guess at numbers",
    );
  }

  console.log("verify-documents: fixtures are shaped like the real traps");
  {
    const pages = buildSyntheticPlanSetPages(104);
    check(pages.length === 104, `the plan fixture must build 104 sheets, got ${pages.length}`);
    const flat = pages.flat().join("\n");
    check(/KITCHEN\s+303 SF/.test(flat) && /KITCHEN\s+268 SF/.test(flat), "the fixture must carry the deliberate area conflict");
    check(/BY OTHERS/.test(flat) && /NOT IN CONTRACT/.test(flat), "the fixture must carry out-of-contract work");
    check(/ALLOWANCE/.test(flat) && /ALTERNATE/.test(flat), "the fixture must carry an allowance and an alternate");
    check(/EXISTING CONDITIONS/.test(flat), "the fixture must draw the existing floor as well as the new one");

    const re10 = buildLargeRe10Pages(62);
    const items = re10.flat().filter((l) => /^\d+\./.test(l));
    const unique = new Set(items.map((l) => l.replace(/^\d+\.\s*/, "")));
    check(
      unique.size === items.length,
      `every generated RE-10 item must be distinct or the completeness check is meaningless: ${items.length} items, ${unique.size} distinct`,
    );
    check(items.length >= 62, `the RE-10 fixture must carry at least 62 items, got ${items.length}`);
    check(re10.flat().some((l) => /see item \d+ above/.test(l)), "the fixture must carry a restated item");
    check(re10.flat().some((l) => /foundation crack/i.test(l)), "the fixture must carry an item that needs review");
    // Text must fit inside the 612pt-tall MediaBox at 12pt leading from y=580.
    check(
      Math.max(...re10.map((p) => p.length)) <= Math.floor(580 / 12),
      "fixture pages must not overflow the page box, or items render invisibly",
    );
  }

  console.log("verify-documents: extraction schemas stay inside the API's union limit");
  {
    /* FOUND THE HARD WAY. Adding one nullable field to the plan schema took it
       from 16 union-typed parameters to 17, and the API rejected EVERY request
       with "Schemas contains too many parameters with union types". Nothing in
       the type system or the build catches that - it fails at runtime, on all
       traffic, the moment the change deploys. So it is a build gate now. */
    const UNION_LIMIT = 16;
    const countUnions = (node: unknown): number => {
      if (!node || typeof node !== "object") return 0;
      const n = node as Record<string, unknown>;
      let total = Array.isArray(n.type) || n.anyOf ? 1 : 0;
      for (const value of Object.values(n)) total += countUnions(value);
      return total;
    };
    const planUnions = countUnions(PLAN_EXTRACTION_SCHEMA);
    const re10Unions = countUnions(EXTRACTION_SCHEMA);
    check(
      planUnions <= UNION_LIMIT,
      `the plan schema has ${planUnions} union-typed parameters against a limit of ${UNION_LIMIT}. ` +
        `Make a field non-nullable (0 or "" as the absent value) before adding another.`,
    );
    check(
      re10Unions <= UNION_LIMIT,
      `the RE-10 schema has ${re10Unions} union-typed parameters against a limit of ${UNION_LIMIT}.`,
    );
  }

  console.log("verify-documents: allowances and alternates stay out of base scope");
  {
    const items = [
      { category: "structural" as const, description: "New pad footings", sheet: "S1.1", inContract: true, commercialStatus: "base" as const, statedAmount: null },
      { category: "plumbing" as const, description: "Plumbing fixtures allowance", sheet: "G0.2", inContract: true, commercialStatus: "allowance" as const, statedAmount: 14000 },
      { category: "envelope" as const, description: "Screened porch at rear", sheet: "G0.2", inContract: true, commercialStatus: "alternate" as const, statedAmount: null },
      { category: "site" as const, description: "Driveway widening BY OTHERS", sheet: "C1.1", inContract: false, commercialStatus: "base" as const, statedAmount: null },
    ];

    // The exact filters the estimate route applies at both call sites.
    const base = items.filter((i) => i.inContract && i.commercialStatus === "base");
    const allowances = items.filter((i) => i.inContract && i.commercialStatus === "allowance");
    const alternates = items.filter(
      (i) => i.inContract && (i.commercialStatus === "alternate" || i.commercialStatus === "optional"),
    );
    const excluded = items.filter((i) => !i.inContract);

    check(base.length === 1, `only ordinary work is base scope, got ${base.length}`);
    check(!base.some((i) => /allowance/i.test(i.description)), "an allowance must never be priced as base scope");
    check(!base.some((i) => /porch/i.test(i.description)), "an alternate must never be priced as base scope");
    check(allowances.length === 1 && allowances[0].statedAmount === 14000, "the allowance keeps its stated figure");
    check(alternates.length === 1, "the alternate is carried, not dropped");
    check(excluded.length === 1, "out-of-contract work stays excluded");
    /* Nothing may vanish: every item must land in exactly one bucket. */
    check(
      base.length + allowances.length + alternates.length + excluded.length === items.length,
      "every scope item must land in exactly one bucket - nothing silently dropped",
    );
  }

  console.log("verify-documents: bounded concurrency");
  {
    let running = 0;
    let peak = 0;
    const items = Array.from({ length: 25 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 4, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 1));
      running--;
      return n * 2;
    });
    check(peak <= 4, `concurrency cap must hold, peaked at ${peak}`);
    check(out.length === 25 && out[24] === 48, "every item must run and results must stay in order");
    check(
      (await mapWithConcurrency([], 4, async () => 1)).length === 0,
      "an empty work list must not hang",
    );
  }

  if (failures > 0) {
    console.error(`\nverify-documents: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`\nAll document-pipeline checks passed (${checks} checks: pagination, coverage, audit trail, merge, duplicates, readiness).`);
}

main().catch((err) => {
  console.error("verify-documents crashed:", err);
  process.exit(1);
});
