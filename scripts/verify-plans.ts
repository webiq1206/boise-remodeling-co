/**
 * The gates that decide whether a plan set may tighten a price.
 *
 * WHY THIS EXISTS. These five checks are the entire safety argument for the
 * plans feature, and until now the only way to exercise them was to upload a
 * real plan set and spend two minutes and real money finding out. Worse, the
 * one bug they have already had - a read that measured a single printed garage,
 * left sixteen rooms blank, and scored a PERFECT trusted share - was found by
 * eye on a live run. It would have shipped.
 *
 * EVERY FIXTURE BELOW IS THE SHAPE OF A REAL READ. Four genuine sets have been
 * through the extractor: two new builds, a 42-sheet permit set for a
 * remodel-plus-addition, and an 18-sheet schematic remodel. The room counts,
 * sources and totals here are theirs, trimmed to the fields the gates touch.
 * The point is not to test arithmetic; it is to keep the specific ways real
 * drawings defeat these gates from coming back.
 *
 *   npm run verify:plans
 */
import {
  assessPlanQuality,
  asDrawnFloorArea,
  scopedRooms,
  MIN_ROOM_COVERAGE,
  MIN_TRUSTED_AREA_SHARE,
  AREA_AGREEMENT_TOLERANCE,
  type MeasurementSource,
  type PlanExtractionResult,
  type PlanRoom,
  type PlanScopeFacts,
  type RoomPhase,
} from "../shared/plans/extraction";
import { planMeasurements, planScopePatch } from "../shared/plans/estimateInput";
import { estimateProject, buildInternalEstimate, perimeterOf, RULES_BY_PROJECT } from "../shared/costs";

let problems = 0;
const fail = (m: string) => {
  problems++;
  console.log("  PROBLEM: " + m);
};

function room(
  name: string,
  areaSqFt: number | null,
  areaSource: MeasurementSource,
  inScope = true,
  phase: RoomPhase = "new",
  level: string | null = "Main",
): PlanRoom {
  return {
    name,
    areaSqFt,
    areaSource,
    dimensionText: null,
    ceilingHeightFt: null,
    sheet: null,
    phase,
    level,
    inScope,
  };
}

const NO_FACTS: PlanScopeFacts = {
  wallsRemovedOrAdded: null,
  plumbingFixturesRelocated: null,
  electricalServiceOrPanelWork: null,
  structuralWork: null,
  hvacWork: null,
  exteriorEnvelopeWork: null,
  kitchenInScope: null,
};

function plans(over: Partial<PlanExtractionResult>): PlanExtractionResult {
  const base: PlanExtractionResult = {
    looksLikePlans: true,
    projectType: "remodel",
    statedTotalSqFt: null,
    roomAreaTotalSqFt: null,
    rooms: [],
    counts: [],
    scopeItems: [],
    scopeFacts: NO_FACTS,
    sheetsUsed: [],
    scopeNotes: [],
    warnings: [],
    ...over,
  };
  // The cross-check reads the as-drawn area, so fixtures do not have to restate
  // it and cannot drift from their own room lists.
  if (base.roomAreaTotalSqFt === null) base.roomAreaTotalSqFt = asDrawnFloorArea(base) || null;
  return base;
}

/** Repeat a blank room n times, which is what an unmeasured floor plan looks like. */
const blanks = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => room(`${prefix} ${i + 1}`, null, "inferred"));

interface Case {
  name: string;
  input: PlanExtractionResult;
  canTighten: boolean;
  /** A fragment that must appear in one of the blockers, so we fail for the RIGHT reason. */
  because?: string;
}

const CASES: Case[] = [
  /* ---------------------------------------------------------------- new builds
     Both new-build sets printed exactly one area on the whole drawing set: the
     garage. Sixteen rooms came back null - the model correctly refused to
     invent them - and no sheet stated a total. */
  {
    name: "new build: the only printed area on the drawings is the garage",
    input: plans({
      projectType: "new-build",
      rooms: [room("Garage", 441, "printed"), ...blanks(16, "Room")],
      roomAreaTotalSqFt: 441,
    }),
    canTighten: false,
    because: "we could only measure",
  },

  /* ------------------------------------------------------- the 42-sheet permit set
     THE REGRESSION THAT WOULD HAVE SHIPPED TWICE. Gambardella returned eleven
     "printed" rooms and twenty-two blanks, so the trusted SHARE was a perfect
     1.0 - a share only divides among rooms it managed to measure. And the
     eleven were not rooms at all: they were the cover sheet's area tabulation
     ("MAIN LEVEL: 1,370 SF", "GARAGE: 904 SF"). The stated total agreed with
     the summed total to the square foot, because the model computed the sum
     from a subset of those same cover-sheet lines - the same number twice, not
     an independent cross-check. Four of the five gates passed. Only coverage
     stands between this read and a tightened price. */
  {
    name: "permit set: eleven cover-sheet area tabulations, thirty-three rooms, perfect trusted share",
    input: plans({
      projectType: "addition",
      statedTotalSqFt: 3487,
      roomAreaTotalSqFt: 3487,
      rooms: [
        room("Existing main level", 1370, "printed"),
        room("Existing lower level", 1381, "printed"),
        room("Main level addition", 310, "printed"),
        room("Lower level addition", 426, "printed"),
        room("Garage addition", 192, "printed"),
        room("Existing garage", 712, "printed"),
        room("Garage total", 904, "printed"),
        room("New main level deck", 426, "printed"),
        room("Existing main level deck", 735, "printed"),
        room("New lower level patio", 78, "printed"),
        room("Existing lower level patio", 270, "printed"),
        ...blanks(22, "Room"),
      ],
    }),
    canTighten: false,
    because: "we could only measure",
  },

  /* -------------------------------------------------------- the schematic remodel
     Squier is the best read in the corpus and it still must not tighten. Nine
     of ten in-scope rooms carry a printed SF tag straight off the sheet; the
     tenth was illegible and honestly returned null. Coverage 0.9, trusted 1.0.
     The architect simply never tabulated a total anywhere in eighteen sheets,
     so there is nothing to catch a misread against - and "we could not check"
     must not read the same as "we checked and it was fine". */
  {
    name: "schematic remodel: nine of ten rooms printed, but no sheet states a total",
    input: plans({
      rooms: [
        room("Entry", 230, "printed"),
        room("Kitchen", 303, "printed"),
        room("Breakfast Room", 207, "printed"),
        room("Living Room", 277, "printed"),
        room("Mudroom", 107, "printed"),
        room("Bedroom 1", 306, "printed"),
        room("Closet 1", 122, "printed"),
        room("Bath 1", 117, "printed"),
        room("Guest Bath", 45, "printed"),
        room("W.C. 1", null, "printed"),
        // The existing-condition sheets, correctly held out of scope so the
        // same physical rooms are not counted twice.
        room("Grand Living Room (existing)", 538, "printed", false),
        room("Kitchen & Seating (existing)", 482, "printed", false),
      ],
      roomAreaTotalSqFt: 1714,
    }),
    canTighten: false,
    because: "do not state a total floor area",
  },

  /* ------------------------------------------------- THE PRODUCTION DOUBLE COUNT
     CAUGHT LIVE, ON THE FIRST REAL RUN. The Squier PDF was read twice and came
     back with different scope both times: once ten in-scope rooms (the new
     first floor), once nineteen (the new first floor AND the existing first
     floor, which is the same physical floor drawn twice). The second summed
     3,056 SF for a 1,714 SF project.

     This fixture is that second read. It must price the same as the first,
     because `scopedRooms` keeps only the "new" phase when both appear, and
     `asDrawnFloorArea` takes one phase per level. If either regresses, a
     customer gets billed for their house twice. */
  {
    name: "existing AND new plans of one floor, both tagged in scope",
    input: plans({
      statedTotalSqFt: 1800,
      rooms: [
        room("Kitchen (new)", 303, "printed", true, "new", "Main"),
        room("Living Room (new)", 277, "printed", true, "new", "Main"),
        room("Entry (new)", 230, "printed", true, "new", "Main"),
        room("Bedroom 1 (new)", 306, "printed", true, "new", "Main"),
        room("Bath 1 (new)", 117, "printed", true, "new", "Main"),
        room("Closet 1 (new)", 122, "printed", true, "new", "Main"),
        room("Breakfast Room (new)", 207, "printed", true, "new", "Main"),
        room("Mudroom (new)", 107, "printed", true, "new", "Main"),
        room("Guest Bath (new)", 45, "printed", true, "new", "Main"),
        // The same floor, drawn as it stands today, wrongly marked in scope.
        room("Kitchen & Seating (existing)", 482, "printed", true, "existing", "Main"),
        room("Living Room (existing)", 474, "printed", true, "existing", "Main"),
        room("Hallway (existing)", 95, "printed", true, "existing", "Main"),
        room("Entry (existing)", 79, "printed", true, "existing", "Main"),
        room("Bath 1 (existing)", 78, "printed", true, "existing", "Main"),
        room("Mud (existing)", 65, "printed", true, "existing", "Main"),
      ],
    }),
    canTighten: true,
  },

  /* ------------------------------------- the same remodel, once someone says the total
     THE WHOLE POINT OF SETTLING THE SECOND CROSS-CHECK. Nothing printed on
     those eighteen sheets can stand in for a stated total: the footprint
     dimensions are a chain rather than an outline, and any band loose enough to
     admit this read would admit one that had doubled every room. The
     independent statement has to come from the customer, who knows their own
     square footage - and this is what it buys. Same rooms, same read, one
     number added, and the gate opens. If this case ever starts failing, the
     feature has quietly become unreachable on remodels. */
  {
    name: "the same remodel, once the customer supplies the total",
    input: plans({
      statedTotalSqFt: 1800,
      roomAreaTotalSqFt: 1714,
      rooms: [
        room("Entry", 230, "printed"),
        room("Kitchen", 303, "printed"),
        room("Breakfast Room", 207, "printed"),
        room("Living Room", 277, "printed"),
        room("Mudroom", 107, "printed"),
        room("Bedroom 1", 306, "printed"),
        room("Closet 1", 122, "printed"),
        room("Bath 1", 117, "printed"),
        room("Guest Bath", 45, "printed"),
        room("W.C. 1", null, "printed"),
      ],
    }),
    canTighten: true,
  },

  /* ------------------------------------------------------------- the positive case
     WITHOUT THIS, THE SUITE IS SATISFIED BY ALWAYS SAYING NO. Every real set so
     far has been blocked, so a gate that returned false unconditionally would
     pass all of the above and quietly make the feature pointless. This is the
     read the whole thing is built to reward: rooms tagged on the sheet, and a
     stated total that agrees with their sum. */
  {
    name: "a set that has earned it: printed rooms, and a stated total that agrees",
    input: plans({
      statedTotalSqFt: 2400,
      roomAreaTotalSqFt: 2350,
      rooms: [
        room("Kitchen", 300, "printed"),
        room("Living", 500, "printed"),
        room("Primary Bed", 400, "printed"),
        room("Primary Bath", 200, "printed"),
        room("Bed 2", 300, "printed"),
        room("Bed 3", 300, "derived"),
        room("Hall", 150, "derived"),
        room("Laundry", 100, "printed"),
        room("Powder", 50, "printed"),
        room("Entry", 50, "inferred"),
      ],
    }),
    canTighten: true,
  },

  /* --------------------------------------------------------------- scale misreads
     A misread scale bar produces numbers that are internally consistent and
     completely wrong, and nothing downstream can detect it. "scaled" therefore
     earns nothing, however confident the read felt. */
  {
    name: "every area paced off the scale bar earns nothing",
    input: plans({
      statedTotalSqFt: 1000,
      roomAreaTotalSqFt: 1000,
      rooms: [room("Kitchen", 400, "scaled"), room("Living", 400, "scaled"), room("Bed", 200, "scaled")],
    }),
    canTighten: false,
    because: "printed dimension",
  },

  /* ------------------------------------------------------------ the cross-check
     The test that catches a misread is not "is this number sensible" but "do two
     independent statements of the same fact agree". */
  {
    name: "room areas that do not add up to the stated total",
    input: plans({
      statedTotalSqFt: 2400,
      roomAreaTotalSqFt: 1500,
      rooms: [room("Kitchen", 700, "printed"), room("Living", 500, "printed"), room("Bed", 300, "printed")],
    }),
    canTighten: false,
    because: "do not add up",
  },

  /* ------------------------------------------------------------- not drawings
     Uploading a file buys nothing on its own. */
  {
    name: "a document that does not read as drawings at all",
    input: plans({
      looksLikePlans: false,
      projectType: "unclear",
      statedTotalSqFt: 2400,
      roomAreaTotalSqFt: 2400,
      rooms: [room("Kitchen", 1200, "printed"), room("Living", 1200, "printed")],
    }),
    canTighten: false,
    because: "do not read as construction drawings",
  },

  /* ---------------------------------------------------------- nothing at all
     An empty room list must not divide by zero into a free pass. */
  {
    name: "a read that found no rooms whatsoever",
    input: plans({ statedTotalSqFt: 2400, roomAreaTotalSqFt: 2400, rooms: [] }),
    canTighten: false,
  },
];

console.log("PLAN QUALITY GATES\n");

for (const c of CASES) {
  const q = assessPlanQuality(c.input);
  const verdict = q.canTightenPrice ? "may tighten" : "blocked";
  console.log(
    `  ${c.canTighten === q.canTightenPrice ? "ok  " : "FAIL"} ${verdict.padEnd(11)} ` +
      `agree=${String(q.areasAgree).padEnd(5)} trusted=${q.trustedAreaShare.toFixed(2)} ` +
      `coverage=${q.measuredRoomCoverage.toFixed(2)}  ${c.name}`,
  );

  if (q.canTightenPrice !== c.canTighten) {
    fail(
      c.canTighten
        ? `"${c.name}" should have been allowed to tighten, but was blocked: ${q.blockers.join(" ")}`
        : `"${c.name}" was allowed to tighten a price. Blockers: none.`,
    );
  }

  // Failing for the wrong reason is its own bug: it means the gate that is
  // actually holding is not the one we think, and the message the customer
  // reads will not describe their drawings.
  if (c.because && !q.blockers.some((b) => b.toLowerCase().includes(c.because!.toLowerCase()))) {
    fail(`"${c.name}" was blocked, but not for "${c.because}". Got: ${q.blockers.join(" | ")}`);
  }

  if (!q.canTightenPrice && q.blockers.length === 0) {
    fail(`"${c.name}" was blocked without saying why`);
  }
}

/* The thresholds themselves. A coverage floor of 0 would silently disable the
   gate that caught the garage read, and nothing else here would notice. */
console.log("\nTHRESHOLDS");
console.log(
  `  coverage>=${MIN_ROOM_COVERAGE}  trusted>=${MIN_TRUSTED_AREA_SHARE}  area tolerance ${AREA_AGREEMENT_TOLERANCE}`,
);
if (MIN_ROOM_COVERAGE <= 0 || MIN_ROOM_COVERAGE > 1) fail("MIN_ROOM_COVERAGE must sit in (0, 1]");
if (MIN_TRUSTED_AREA_SHARE <= 0 || MIN_TRUSTED_AREA_SHARE > 1) fail("MIN_TRUSTED_AREA_SHARE must sit in (0, 1]");
if (AREA_AGREEMENT_TOLERANCE <= 0 || AREA_AGREEMENT_TOLERANCE >= 0.25) {
  fail("AREA_AGREEMENT_TOLERANCE must stay a tight cross-check, not a formality");
}

/* ================================================================ estimator
   What actually crosses from the drawings into a price, and what must not. */

console.log("\nESTIMATOR WIRING\n");

/** The Squier read, once the customer has supplied the total. Gates pass. */
const EARNED = plans({
  statedTotalSqFt: 1800,
  roomAreaTotalSqFt: 1714,
  rooms: [
    { ...room("Entry", 230, "printed"), ceilingHeightFt: 12 },
    { ...room("Kitchen", 303, "printed"), ceilingHeightFt: 12 },
    room("Breakfast Room", 207, "printed"),
    room("Living Room", 277, "printed"),
    room("Mudroom", 107, "printed"),
    room("Bedroom 1", 306, "printed"),
    room("Closet 1", 122, "printed"),
    room("Bath 1", 117, "printed"),
    room("Guest Bath", 45, "printed"),
    room("W.C. 1", null, "printed"),
  ],
});

const earned = planMeasurements(EARNED);
if (!earned) {
  fail("the earned Squier read produced no measurements at all");
} else {
  console.log(`  sqft=${earned.sqft} ceiling=${earned.ceilingHeight?.toFixed(2)} baths=${earned.bathroomCount} project=${earned.suggestedProject}`);

  if (earned.sqft !== 1714) fail(`measured area should be the 1714 SF of printed rooms, got ${earned.sqft}`);
  if (earned.measuredRooms !== 9) fail(`nine rooms carry a printed area, got ${earned.measuredRooms}`);

  /* THE W.C. TRAP. Squier tags Bath 1, Guest Bath and W.C. 1 on one floor. That
     is two bathrooms and a water closet inside the primary suite. Counting the
     W.C. would add 50 percent to a bathroom takeoff. */
  if (earned.bathroomCount !== 2) {
    fail(`Bath 1 and Guest Bath are two bathrooms; the W.C. is not a third. Got ${earned.bathroomCount}`);
  }

  /* Area-weighted, not a plain mean: 12 ft over 533 SF of entry and kitchen,
     nothing stated elsewhere, so the weighted answer is exactly 12. */
  if (earned.ceilingHeight === null || Math.abs(earned.ceilingHeight - 12) > 1e-9) {
    fail(`ceiling height should weight to 12.0 from the rooms that state one, got ${earned.ceilingHeight}`);
  }

  /* The unmeasured room has to be named rather than quietly dropped. */
  if (!earned.notes.some((n) => n.includes("W.C. 1"))) {
    fail("the room with no printed area was dropped without being named in the notes");
  }

  /* A whole first floor of kitchen, bedrooms and baths is not a bathroom job. */
  if (earned.suggestedProject !== "whole-home") {
    fail(`a mixed floor of rooms should suggest whole-home, got ${earned.suggestedProject}`);
  }

  /* THE INTERIOR PERIMETER IS SUMMED, NOT TAKEN OFF THE WHOLE FLOOR. Nine rooms
     totalling 1,714 SF carry far more finished wall than one open space of the
     same area, and the estimator understated it for as long as there was only
     one perimeter field. */
  const expected = [230, 303, 207, 277, 107, 306, 122, 117, 45].reduce((s, a) => s + perimeterOf(a), 0);
  if (Math.abs(earned.interiorPerimeterFt - expected) > 1e-9) {
    fail(`interior perimeter should be the sum over rooms (${expected.toFixed(1)}), got ${earned.interiorPerimeterFt.toFixed(1)}`);
  }
  if (earned.interiorPerimeterFt <= perimeterOf(earned.sqft)) {
    fail("summed room perimeter should exceed the single-blob figure; the sum is not being taken");
  }
  console.log(`  interior perimeter ${earned.interiorPerimeterFt.toFixed(0)} ft vs ${perimeterOf(earned.sqft).toFixed(0)} ft as one open space`);
}

/* ------------------------------------------- the double count, in numbers
   The fixture above proves it still prices. This proves it prices the RIGHT
   amount: the same floor area as the clean read, not the sum of both sheets. */
{
  const doubled = CASES.find((c) => c.name.startsWith("existing AND new"))!;
  const m = planMeasurements(doubled.input);
  if (!m) {
    fail("the double-counted read produced no measurements at all");
  } else {
    const both = doubled.input.rooms.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
    if (Math.abs(m.sqft - 1714) > 1e-9) {
      fail(`double-counted read should price the 1,714 SF new floor, got ${m.sqft}`);
    }
    if (m.measuredRooms !== 9) fail(`should price 9 new rooms, got ${m.measuredRooms}`);
    console.log(
      `  ok   double count collapsed: ${both} SF across both sheets -> ${m.sqft} SF priced, ${m.measuredRooms} rooms`,
    );
    // And the as-drawn figure, which is what the customer's total is checked
    // against, must describe the floor once.
    const drawn = asDrawnFloorArea(doubled.input);
    if (Math.abs(drawn - 1714) > 1e-9) fail(`as-drawn area should be 1,714, got ${drawn}`);
  }
}

/* A DECK IS NOT FINISHED SQUARE FOOTAGE. Caught on the first clean live read:
   Squier's second floor carries two roof decks tagged 665 and 161 SF, and
   counting them pushed the as-drawn figure to 3,459 against a house nearer
   2,600 conditioned. The cross-check would have called a perfect read a
   disagreement purely because a deck has an area printed on it. */
{
  const withDecks = plans({
    statedTotalSqFt: 1000,
    rooms: [
      room("Living", 600, "printed", true, "new", "Main"),
      room("Kitchen", 400, "printed", true, "new", "Main"),
      room("Roof Deck - A", 665, "printed", false, "new", "Main"),
      room("Patio Deck", 196, "printed", false, "new", "Main"),
      room("Garage", 440, "printed", false, "existing", "Main"),
    ],
  });
  const drawn = asDrawnFloorArea(withDecks);
  if (Math.abs(drawn - 1000) > 1e-9) {
    fail(`decks, patios and the garage must not count as finished area; got ${drawn} instead of 1,000`);
  }
  if (assessPlanQuality(withDecks).areasAgree !== true) {
    fail("a correct read was called a disagreement because outdoor space was counted as floor area");
  }
  console.log(`  ok   decks, patio and garage excluded from the cross-check: ${drawn} SF conditioned`);
}

/* A TWO-STOREY HOUSE IS NOT ONE FLOOR. The as-drawn figure has to add the
   levels, or the cross-check compares one floor against a whole house and
   blocks every good read on a multi-storey home. */
{
  const twoStorey = plans({
    statedTotalSqFt: 2400,
    rooms: [
      room("Kitchen (new)", 400, "printed", true, "new", "Main"),
      room("Living (new)", 600, "printed", true, "new", "Main"),
      room("Kitchen (existing)", 380, "printed", false, "existing", "Main"),
      room("Bed 1", 700, "printed", false, "existing", "Second"),
      room("Bed 2", 700, "printed", false, "existing", "Second"),
    ],
  });
  const drawn = asDrawnFloorArea(twoStorey);
  // Main takes the NEW plan (1,000), Second has only an existing plan (1,400).
  if (Math.abs(drawn - 2400) > 1e-9) {
    fail(`two-storey as-drawn should be 1,000 main + 1,400 second = 2,400, got ${drawn}`);
  }
  if (assessPlanQuality(twoStorey).areasAgree !== true) {
    fail("a correct two-storey read should agree with the stated whole-home total");
  }
  console.log(`  ok   two storeys sum to ${drawn} SF and agree with the stated total`);
}

/* NOTHING CROSSES FROM A READ THAT DID NOT EARN IT. Each of these passes some
   gates and fails at least one, and every one of them must produce null - not a
   smaller number, not a lower confidence, nothing at all. */
for (const c of CASES.filter((c) => !c.canTighten)) {
  if (planMeasurements(c.input) !== null) {
    fail(`"${c.name}" is blocked, but still handed measurements to the estimator`);
  }
}
console.log(`  ok   ${CASES.filter((c) => !c.canTighten).length} blocked reads all yield null, so the estimator is untouched`);

/* THE BATHROOM MULTIPLICATION. buildInternalEstimate multiplies the whole
   takeoff by bathroomCount, and the size question describes ONE bathroom. Handing
   it the summed area of two baths AND a count of two prices four. */
const bathOnly = plans({
  statedTotalSqFt: 170,
  roomAreaTotalSqFt: 162,
  rooms: [room("Bath 1", 117, "printed"), room("Guest Bath", 45, "printed")],
});
const bm = planMeasurements(bathOnly);
if (!bm) {
  fail("the bathroom-only read should have earned measurements");
} else {
  if (bm.suggestedProject !== "bathroom") fail(`two baths alone should suggest bathroom, got ${bm.suggestedProject}`);
  const patch = planScopePatch(bm, "bathroom");
  if (Math.abs(patch.sqft - 81) > 1e-9) {
    fail(`bathroom sqft must be per-bathroom (162/2 = 81), got ${patch.sqft}. The takeoff multiplies by the count.`);
  }
  if (patch.bathroomCount !== 2) fail(`bathroom count should reach the estimator, got ${patch.bathroomCount}`);
  // The wall length is divided by the same count, or every bathroom is tiled
  // with the perimeter of all of them.
  if (Math.abs(patch.interiorPerimeterFt - bm.interiorPerimeterFt / 2) > 1e-9) {
    fail(`bathroom interior perimeter must be per-bathroom, got ${patch.interiorPerimeterFt.toFixed(1)}`);
  }
  // The same measurements on a whole-home job must NOT be divided.
  const whole = planScopePatch(bm, "whole-home");
  if (Math.abs(whole.sqft - 162) > 1e-9) fail(`whole-home sqft must be the full area, got ${whole.sqft}`);
  if (Math.abs(whole.interiorPerimeterFt - bm.interiorPerimeterFt) > 1e-9) {
    fail(`whole-home interior perimeter must be the full length, got ${whole.interiorPerimeterFt.toFixed(1)}`);
  }
  console.log(`  ok   bathroom patch is ${patch.sqft} SF x ${patch.bathroomCount}, whole-home patch is ${whole.sqft} SF`);
}

/* ------------------------------------------------- interior moves, envelope does not
   THE WHOLE POINT OF THE SPLIT. Same measured job priced as an ADDITION, which
   is the rule set that carries both kinds: trim reads the interior figure,
   footings and gutters read the envelope. Feed a measured interior length and
   the envelope-driven quantities must not move by a single foot. */
{
  const base = { quality: "mid-range" as const, sqft: 1714 };
  const withPlans = { ...base, interiorPerimeterFt: earned!.interiorPerimeterFt };

  const qtyOf = (sel: typeof base, code: string) =>
    buildInternalEstimate(RULES_BY_PROJECT.addition, sel, "addition").lines.find((l) => l.code.startsWith(code))
      ?.quantity ?? 0;

  const checks: Array<[string, string, "moves" | "fixed"]> = [
    ["03-18-02", "trim", "moves"],
    ["03-04-02", "footings", "fixed"],
    ["03-11-03", "gutters", "fixed"],
    ["03-07-03", "windows", "fixed"],
  ];
  for (const [code, label, expect] of checks) {
    const before = qtyOf(base, code);
    const after = qtyOf(withPlans, code);
    const moved = Math.abs(after - before) > 1e-6;
    const ok = expect === "moves" ? moved : !moved;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(9)} ${before.toFixed(0).padStart(6)} -> ${after.toFixed(0).padStart(6)}  (${expect})`);
    if (!ok) {
      fail(
        expect === "moves"
          ? `${label} reads the interior perimeter and should have moved with the measurements`
          : `${label} is an envelope quantity and must not move when interior wall length is measured`,
      );
    }
  }
}

/* A NEW BUILD HAS NO ESTIMATOR PROJECT TYPE, so it must not be quietly priced
   as a whole-home remodel - that would omit the entire shell. */
const newBuild = plans({
  projectType: "new-build",
  statedTotalSqFt: 2000,
  roomAreaTotalSqFt: 1950,
  rooms: [
    room("Great Room", 600, "printed"),
    room("Kitchen", 350, "printed"),
    room("Primary Bed", 400, "printed"),
    room("Bed 2", 300, "printed"),
    room("Bath 1", 300, "printed"),
  ],
});
const nb = planMeasurements(newBuild);
if (nb && nb.suggestedProject !== null) {
  fail(`a new build must not suggest a remodel project type, got ${nb.suggestedProject}`);
}
console.log("  ok   a new build suggests no project type rather than pricing as a remodel");

/* ------------------------------------------------------ the scope of work
   FLOOR AREA SETS THE SIZE OF THE JOB; THESE SET WHAT IS BEING DONE TO IT, and
   they used to be thrown away entirely. The ratings are derived in code from
   facts the drawings answer, so they cannot drift between two reads of the same
   sheets the way a judgement does. */
{
  const withScope = (facts: Partial<PlanScopeFacts>, items: PlanExtractionResult["scopeItems"] = []) =>
    planMeasurements(
      plans({
        statedTotalSqFt: 1000,
        rooms: [
          room("Kitchen", 400, "printed"),
          room("Living", 400, "printed"),
          room("Bath 1", 200, "printed"),
        ],
        scopeFacts: { ...NO_FACTS, ...facts },
        scopeItems: items,
      }),
    );

  const ladder: Array<[Partial<PlanScopeFacts>, string | null, string | null, string]> = [
    [{}, null, null, "drawings say nothing -> both null, estimator uses its own default"],
    [{ wallsRemovedOrAdded: false }, "none", null, "no wall moves -> layout none"],
    [{ wallsRemovedOrAdded: true }, "moderate", null, "a wall moves -> moderate"],
    [{ wallsRemovedOrAdded: true, structuralWork: true }, "major", null, "load bearing -> major"],
    [{ plumbingFixturesRelocated: true }, null, "partial", "a fixture moves -> partial"],
    [{ electricalServiceOrPanelWork: true }, null, "full", "a new panel -> full"],
    [{ hvacWork: true }, null, "full", "a new system -> full"],
    [{ plumbingFixturesRelocated: false }, null, "cosmetic", "nothing moves -> cosmetic"],
  ];
  for (const [facts, layout, systems, label] of ladder) {
    const m = withScope(facts);
    const okLayout = (m?.layoutChanges ?? null) === layout;
    const okSystems = (m?.plumbingElectrical ?? null) === systems;
    console.log(`  ${okLayout && okSystems ? "ok  " : "FAIL"} ${label}`);
    if (!okLayout) fail(`${label}: layoutChanges was ${m?.layoutChanges}, expected ${layout}`);
    if (!okSystems) fail(`${label}: plumbingElectrical was ${m?.plumbingElectrical}, expected ${systems}`);
  }

  /* WORK THE DRAWINGS HAND TO SOMEONE ELSE MUST BE SEPARATED, NEVER DROPPED.
     The Squier patio deck says "SEPARATE PERMIT APPLICATION" on the sheet and
     the Gambardella greenhouse and swim spa are both "by others". Pricing those
     is as wrong as omitting the fireplace, and hiding them is worse than both:
     the customer assumes they are in the number. */
  const mixed = withScope({ wallsRemovedOrAdded: true }, [
    { category: "millwork", description: "Gas fireplace with tile surround", sheet: "A105", inContract: true },
    { category: "demolition", description: "Remove existing deck and framing", sheet: "A2.0", inContract: true },
    { category: "site", description: "Patio deck, SEPARATE PERMIT APPLICATION", sheet: "A105", inContract: false },
    { category: "structural", description: "Pre-engineered greenhouse by others", sheet: "G1.0", inContract: false },
  ]);
  if (!mixed) {
    fail("the scoped read produced no measurements");
  } else {
    if (mixed.scopeItems.length !== 2) fail(`2 items are ours to price, got ${mixed.scopeItems.length}`);
    if (mixed.excludedScope.length !== 2) fail(`2 items belong to others, got ${mixed.excludedScope.length}`);
    if (mixed.scopeItems.some((i) => !i.inContract)) fail("an out-of-contract item reached the priced list");
    const notes = mixed.notes.join(" ");
    if (!notes.includes("SEPARATE PERMIT")) fail("an excluded item is not named in the notes");
    if (!notes.includes("greenhouse")) fail("an excluded item was dropped from the notes");
    console.log(`  ok   ${mixed.scopeItems.length} items priced, ${mixed.excludedScope.length} named as someone else's`);
  }

  /* The ratings have to survive the trip into the estimator's selections. */
  const patched = planScopePatch(mixed!, "whole-home");
  if (patched.layoutChanges !== "moderate") fail("layoutChanges did not reach the scope patch");
  // A null must be ABSENT from the patch, not present as null, so the estimator
  // falls back to its own default rather than a plans-shaped hole.
  const blank = planScopePatch(withScope({})!, "whole-home");
  if ("layoutChanges" in blank) fail("an unknown layout change was sent to the estimator anyway");
  if ("plumbingElectrical" in blank) fail("an unknown systems rating was sent to the estimator anyway");
  console.log("  ok   ratings reach the estimator, and unknowns are left off rather than sent as null");

  /* And they must actually move the price, or none of this is doing anything. */
  const base = { quality: "mid-range" as const, sqft: 1000, interiorPerimeterFt: 200 };
  const cosmetic = estimateProject("whole-home", { ...base, layoutChanges: "none", plumbingElectrical: "cosmetic" }, []);
  const gutted = estimateProject("whole-home", { ...base, layoutChanges: "major", plumbingElectrical: "full" }, []);
  if (gutted.range.centre <= cosmetic.range.centre) {
    fail("a major layout change with full systems prices no higher than a cosmetic refresh");
  }
  console.log(
    `  ok   scope moves the price: cosmetic $${Math.round(cosmetic.range.centre).toLocaleString("en-US")} -> gutted $${Math.round(gutted.range.centre).toLocaleString("en-US")}`,
  );
}

/* ------------------------------------------------------------- end to end
   The point of all of it: the same job, priced with and without the drawings.
   If this stops moving, the wiring has come loose and every case above would
   still pass. */
const rows = [{ label: "Project", value: "Whole home" }];
const guessed = estimateProject("whole-home", { quality: "mid-range", sqft: 1200 }, rows);
const measured = estimateProject(
  "whole-home",
  { quality: "mid-range", ...planScopePatch(earned!, "whole-home") },
  rows,
);

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
console.log(`\n  homeowner guessed 1,200 SF : ${guessed.lead.range}`);
console.log(`  measured from the drawings : ${measured.lead.range}  (${earned!.sqft} SF, ${earned!.ceilingHeight} ft ceilings)`);

if (measured.range.centre <= guessed.range.centre) {
  fail("a larger measured area produced no larger price; the measurements are not reaching the takeoff");
}
/* The band must NOT have narrowed. See the note in estimateInput.ts: the
   back-tested spread is estimator variance, not input error, so a good drawing
   buys a truer centre and nothing else. */
if (Math.abs(measured.range.band - guessed.range.band) > 1e-9) {
  fail(
    `the quoted band moved from ${guessed.range.band} to ${measured.range.band}. A plan set earns a truer centre, not a narrower range.`,
  );
}
console.log(`  ok   band unchanged at ${measured.range.band}, centre moved ${usd(guessed.range.centre)} -> ${usd(measured.range.centre)}`);

console.log(
  problems === 0
    ? "\nverify:plans: OK - no read tightens a price it has not earned."
    : `\nverify:plans: ${problems} problem(s).`,
);
process.exit(problems === 0 ? 0 : 1);
