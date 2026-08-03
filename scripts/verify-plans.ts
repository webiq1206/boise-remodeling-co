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
  MIN_ROOM_COVERAGE,
  MIN_TRUSTED_AREA_SHARE,
  AREA_AGREEMENT_TOLERANCE,
  type MeasurementSource,
  type PlanExtractionResult,
  type PlanRoom,
} from "../shared/plans/extraction";

let problems = 0;
const fail = (m: string) => {
  problems++;
  console.log("  PROBLEM: " + m);
};

function room(name: string, areaSqFt: number | null, areaSource: MeasurementSource, inScope = true): PlanRoom {
  return { name, areaSqFt, areaSource, dimensionText: null, ceilingHeightFt: null, sheet: null, inScope };
}

function plans(over: Partial<PlanExtractionResult>): PlanExtractionResult {
  return {
    looksLikePlans: true,
    projectType: "remodel",
    statedTotalSqFt: null,
    roomAreaTotalSqFt: null,
    rooms: [],
    counts: [],
    sheetsUsed: [],
    scopeNotes: [],
    warnings: [],
    ...over,
  };
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

console.log(
  problems === 0
    ? "\nverify:plans: OK - no read tightens a price it has not earned."
    : `\nverify:plans: ${problems} problem(s).`,
);
process.exit(problems === 0 ? 0 : 1);
