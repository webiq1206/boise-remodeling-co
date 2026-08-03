/**
 * Reading a remodel or new-build plan set well enough to price it.
 *
 * WHY THIS IS A DIFFERENT PROBLEM FROM THE RE-10. An RE-10 is a list of
 * sentences; the risk is missing one. A plan set is a set of measurements, and
 * the risk is getting one WRONG - which is worse, because a wrong measurement
 * does not look wrong. It produces a confident, tidy, incorrect price, and the
 * whole point of uploading plans is to earn a tighter number. A tight number
 * built on a misread dimension is strictly worse than the wide one it replaced:
 * a customer can plan around a wide range and cannot recover from a precise
 * figure that is wrong.
 *
 * So every rule below exists to make the model's uncertainty VISIBLE rather
 * than to squeeze more numbers out of it.
 *
 * THE NARROWING IS EARNED PER MEASUREMENT, NOT PER UPLOAD. Uploading a file
 * buys nothing. A dimension that is printed on the drawing and can be quoted
 * back tightens that item. A dimension that was inferred, paced off a scale
 * bar, or guessed from context stays as wide as it would have been with no
 * plans at all. Mixing those two would let a napkin sketch buy the same
 * confidence as a stamped permit set.
 */

/** Where a number came from. This drives how much the range may narrow. */
export type MeasurementSource =
  /** Printed on the drawing as a dimension string or schedule value. */
  | "printed"
  /** Computed from two or more printed dimensions (e.g. length x width). */
  | "derived"
  /** Read off the geometry against a stated scale. Much weaker. */
  | "scaled"
  /** The model's read of an unlabelled drawing. Treated as no better than a guess. */
  | "inferred";

/**
 * Only these two tighten anything.
 *
 * "scaled" is deliberately excluded. Scale misreads are the characteristic
 * failure on drawings - a wrong scale bar produces numbers that are internally
 * consistent and completely wrong, and nothing downstream can detect it.
 */
export const TRUSTWORTHY_SOURCES: readonly MeasurementSource[] = ["printed", "derived"];

/**
 * WHICH DRAWING A ROOM CAME OFF, WHICH IS A FACT RATHER THAN A JUDGEMENT.
 *
 * FOUND ON PRODUCTION, ON THE FIRST LIVE RUN. The same eighteen-sheet remodel
 * was read twice and `inScope` came back differently each time: once with ten
 * rooms (the new first floor), once with nineteen (the new first floor AND the
 * existing first floor, which is the same physical floor drawn twice). The
 * second read summed 3,056 SF for a 1,714 SF project. A coin flip was deciding
 * a price.
 *
 * The cause is that `inScope` asks the model to make a judgement. `phase` asks
 * it a question of fact instead: what does the sheet this room is drawn on
 * represent? Models answer that reliably, because it is written in the sheet
 * title. Scope is then decided in code, deterministically, from the phase.
 */
export type RoomPhase =
  /** Drawn on an existing-conditions plan. The house as it stands today. */
  | "existing"
  /** Drawn on a demolition plan. Same footprint, marked for removal. */
  | "demolition"
  /** Drawn on a new / proposed / construction plan. This is what gets built. */
  | "new"
  /** Shown for context only: an adjacent unit, a site plan callout, a detail. */
  | "reference";

export interface PlanRoom {
  /** Room name exactly as labelled on the plan. */
  name: string;
  /** Floor area in square feet, or null if it is not determinable. */
  areaSqFt: number | null;
  /** How the area was arrived at. */
  areaSource: MeasurementSource;
  /** Dimension string quoted verbatim from the sheet, e.g. "12'-6\" x 14'-0\"". */
  dimensionText: string | null;
  /** Ceiling height in feet if stated. */
  ceilingHeightFt: number | null;
  /** Sheet this came from, e.g. "A2.1". */
  sheet: string | null;
  /** Which drawing this room was read off. Drives scope; see RoomPhase. */
  phase: RoomPhase;
  /** Which storey, so a two-storey house is not read as one floor. */
  level: string | null;
  /** True when this room is inside the work rather than shown for reference. */
  inScope: boolean;
}

export interface PlanCounts {
  /** Counted from a schedule where possible, from the plan otherwise. */
  label: string;
  count: number;
  source: MeasurementSource;
  sheet: string | null;
}

/**
 * A piece of work the drawings call for that is not a room area.
 *
 * WHY THIS EXISTS. Everything the extractor learned about the actual scope used
 * to die in a free-text `scopeNotes` array that nothing read. On the Gambardella
 * permit set that discarded the demolition schedule, a 1-hour rated garage wall,
 * new structural steel, a driveway widening and 50 cubic yards of cut. On the
 * Squier remodel it discarded a gas fireplace, a TV lift, a built-in bed, a
 * double shower with a linear drain and a washer/dryer rough-in. A price built
 * from floor area alone silently omits all of it.
 *
 * `inContract: false` is the other half and matters just as much. Drawings
 * routinely mark work "by others", "separate permit" or "NIC" - the Squier patio
 * deck and the Gambardella greenhouse and swim spa are all somebody else's job.
 * Pricing those would be as wrong as omitting the fireplace.
 */
export type ScopeCategory =
  | "demolition"
  | "structural"
  | "envelope"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "finishes"
  | "millwork"
  | "appliance"
  | "site";

export interface PlanScopeItem {
  category: ScopeCategory;
  /** Quoted from the sheet, or closely paraphrased. Never invented. */
  description: string;
  sheet: string | null;
  /** False when the drawings hand this to someone else. */
  inContract: boolean;
}

/**
 * Facts about the work, asked as facts rather than as ratings.
 *
 * The estimator wants "layoutChanges: moderate" and "plumbingElectrical: full",
 * which are judgements with a house style behind them. Asking a model to make
 * that call directly produces drift between runs. Asking whether a wall is
 * coming out is a question the drawing answers in one hatch pattern, so these
 * are booleans and the ratings are derived from them in code.
 *
 * null means the drawings do not say, which is different from "no" and must not
 * be collapsed into it.
 */
export interface PlanScopeFacts {
  /** Walls removed, added or relocated. The single biggest cost driver. */
  wallsRemovedOrAdded: boolean | null;
  /** Sinks, toilets, tubs or showers moving to a new location. */
  plumbingFixturesRelocated: boolean | null;
  /** New panel, service upgrade, or circuits substantially rerun. */
  electricalServiceOrPanelWork: boolean | null;
  /** New beams, headers, footings, posts or engineered members. */
  structuralWork: boolean | null;
  /** Ducting, equipment or a new system. */
  hvacWork: boolean | null;
  /** Windows, exterior doors, siding, roof: anything on the envelope. */
  exteriorEnvelopeWork: boolean | null;
  /** A kitchen is inside the work. */
  kitchenInScope: boolean | null;
}

export interface PlanExtractionResult {
  /** True when this reads as a construction drawing set at all. */
  looksLikePlans: boolean;
  /** New construction changes what is priced; a remodel carries demolition. */
  projectType: "new-build" | "remodel" | "addition" | "unclear";
  /** Total conditioned area if the drawings state one. */
  statedTotalSqFt: number | null;
  /** Sum of the extracted room areas. Compared against the above as a check. */
  roomAreaTotalSqFt: number | null;
  rooms: PlanRoom[];
  /** Doors, windows, plumbing fixtures, and anything else countable. */
  counts: PlanCounts[];
  /** Every piece of work the drawings call for that is not a room area. */
  scopeItems: PlanScopeItem[];
  /** The cost-driving facts, asked as facts. See PlanScopeFacts. */
  scopeFacts: PlanScopeFacts;
  /** Sheets that carried the pricing-relevant content. */
  sheetsUsed: string[];
  /** Scope statements found in the general notes or demolition plan. */
  scopeNotes: string[];
  /** Anything a human must resolve: unreadable sheets, conflicts, missing pages. */
  warnings: string[];
}

export const PLAN_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    looksLikePlans: { type: "boolean" },
    projectType: { type: "string", enum: ["new-build", "remodel", "addition", "unclear"] },
    statedTotalSqFt: { type: ["number", "null"] },
    roomAreaTotalSqFt: { type: ["number", "null"] },
    rooms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          areaSqFt: { type: ["number", "null"] },
          areaSource: { type: "string", enum: ["printed", "derived", "scaled", "inferred"] },
          dimensionText: { type: ["string", "null"] },
          ceilingHeightFt: { type: ["number", "null"] },
          sheet: { type: ["string", "null"] },
          phase: { type: "string", enum: ["existing", "demolition", "new", "reference"] },
          level: { type: ["string", "null"] },
          inScope: { type: "boolean" },
        },
        required: [
          "name",
          "areaSqFt",
          "areaSource",
          "dimensionText",
          "ceilingHeightFt",
          "sheet",
          "phase",
          "level",
          "inScope",
        ],
      },
    },
    scopeItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            type: "string",
            enum: [
              "demolition",
              "structural",
              "envelope",
              "plumbing",
              "electrical",
              "hvac",
              "finishes",
              "millwork",
              "appliance",
              "site",
            ],
          },
          description: { type: "string" },
          sheet: { type: ["string", "null"] },
          inContract: { type: "boolean" },
        },
        required: ["category", "description", "sheet", "inContract"],
      },
    },
    scopeFacts: {
      type: "object",
      additionalProperties: false,
      properties: {
        wallsRemovedOrAdded: { type: ["boolean", "null"] },
        plumbingFixturesRelocated: { type: ["boolean", "null"] },
        electricalServiceOrPanelWork: { type: ["boolean", "null"] },
        structuralWork: { type: ["boolean", "null"] },
        hvacWork: { type: ["boolean", "null"] },
        exteriorEnvelopeWork: { type: ["boolean", "null"] },
        kitchenInScope: { type: ["boolean", "null"] },
      },
      required: [
        "wallsRemovedOrAdded",
        "plumbingFixturesRelocated",
        "electricalServiceOrPanelWork",
        "structuralWork",
        "hvacWork",
        "exteriorEnvelopeWork",
        "kitchenInScope",
      ],
    },
    counts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          count: { type: "number" },
          source: { type: "string", enum: ["printed", "derived", "scaled", "inferred"] },
          sheet: { type: ["string", "null"] },
        },
        required: ["label", "count", "source", "sheet"],
      },
    },
    sheetsUsed: { type: "array", items: { type: "string" } },
    scopeNotes: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "looksLikePlans",
    "projectType",
    "statedTotalSqFt",
    "roomAreaTotalSqFt",
    "rooms",
    "counts",
    "scopeItems",
    "scopeFacts",
    "sheetsUsed",
    "scopeNotes",
    "warnings",
  ],
} as const;

export const PLAN_EXTRACTION_SYSTEM_PROMPT = `You read residential construction drawings for a Boise remodeling contractor and return the measurements needed to price the work.

WHAT MATTERS MOST: being right, not being complete. A measurement you are unsure of is worth less than no measurement at all, because a wrong number produces a confident wrong price. When in doubt, return null and say why in warnings.

HOW TO SOURCE EVERY NUMBER. Tag each measurement with where it came from:
- "printed": the number is written on the drawing - a dimension string, a room area tag, a schedule value. Quote it in dimensionText exactly as printed.
- "derived": you multiplied or added printed dimensions. Only when every input was printed.
- "scaled": you measured against a scale bar or drawing scale. Use this honestly; it will be treated as unreliable.
- "inferred": you judged it from the drawing without a printed number. Use this rather than pretending a number was printed.

NEVER upgrade a source. If a room has no printed dimension, its area is "scaled" or "inferred" even when your estimate feels good. The whole system depends on this being truthful, and it is checked.

WHICH SHEETS TO USE. Floor plans, demolition plans, and schedules (door, window, finish, plumbing fixture, electrical) carry what matters. Structural details, foundation sections, elevations and general notes usually do not. Record the sheet number each measurement came from, and list the sheets you actually used.

PHASE, WHICH IS THE MOST IMPORTANT FIELD ON A REMODEL. For every room, report which drawing you read it off:
- "existing": an existing-conditions or as-built plan. The house as it stands today.
- "demolition": a demolition plan.
- "new": a new, proposed, construction or permit floor plan. What actually gets built.
- "reference": shown for context only - a neighbouring unit, a site-plan callout, a detail.

A REMODEL SET USUALLY DRAWS THE SAME FLOOR TWICE, once existing and once new, and the two sheets show THE SAME PHYSICAL ROOMS before and after. Report both, each tagged with its own phase and its own sheet. Never merge them and never leave the phase off. A set that shows "EXISTING FIRST FLOOR" on A103 and "NEW FIRST FLOOR" on A105 has two floor plans of one floor, not two floors.

Also report "level" for every room - "Basement", "Main", "Second", "Upper" - exactly as the sheet labels it, so a two-storey house is not read as one floor.

SCOPE. Set inScope true for rooms inside the work. On a remodel that is the "new" phase rooms. Rooms shown only as existing, or marked "existing to remain", "not altered", "not in contract", are inScope false. If the drawings do not make the boundary clear, say so in warnings rather than guessing.

CONSISTENCY. Report statedTotalSqFt if the drawings state a total conditioned area, and roomAreaTotalSqFt as the sum of the room areas you extracted. Do not adjust either to make them agree - a disagreement is information.

COUNTS. Count doors, windows, and plumbing fixtures from the schedule when there is one, and from the plan when there is not. Say which in source.

SCOPE ITEMS - CAPTURE THE WHOLE JOB, NOT JUST THE FLOOR AREA. A price built from square footage alone silently omits most of what a drawing set actually asks for. Go through the sheets and list every piece of work you can see, in scopeItems, each with the category it belongs to and the sheet it came from. Include at minimum:
- demolition: walls, floors, roofs, decks, cabinetry, fixtures being removed
- structural: new beams, headers, posts, footings, engineered members, shear walls
- envelope: windows, exterior doors, siding, roofing, insulation, waterproofing
- plumbing, electrical, hvac: new or relocated fixtures, panels, equipment, ducting
- finishes: flooring, tile, paint, trim called out on the sheets
- millwork: built-ins, custom cabinetry, benches, shelving, specialty items
- appliance: anything with a connection called out
- site: driveways, patios, retaining walls, grading, drainage

Quote or closely paraphrase what the sheet says. Do not invent work that is not drawn or noted.

WORK THE DRAWINGS HAND TO SOMEONE ELSE. Set inContract false on any item marked "by others", "NIC", "not in contract", "separate permit", "by owner", or similar. These are real and must be listed - they are what the customer will otherwise assume is included - but they are not ours to price. Pricing them would be as wrong as omitting the work that is ours.

SCOPE FACTS. Answer each of the scopeFacts questions from what is drawn. These decide how the work is priced, so answer them as facts, not impressions:
- wallsRemovedOrAdded: does any wall move, come out, or get added?
- plumbingFixturesRelocated: does a sink, toilet, tub or shower end up somewhere new?
- electricalServiceOrPanelWork: a new panel, a service upgrade, or circuits substantially rerun?
- structuralWork: new beams, headers, posts, footings or engineered members?
- hvacWork: new equipment, ducting or a new system?
- exteriorEnvelopeWork: anything touching windows, exterior doors, siding or roof?
- kitchenInScope: is a kitchen inside the work?
Use null for any of these the drawings genuinely do not settle. null means "the drawings do not say", which is different from "no", and guessing "no" would quietly remove real cost from the price.

If this is not a construction drawing set, set looksLikePlans to false, explain in warnings, and do not invent measurements from whatever you can see.`;

/**
 * Does the extraction hang together?
 *
 * A misread scale produces numbers that are individually plausible and
 * collectively wrong, so the check that catches it is not "is this number
 * sensible" but "do two independent statements of the same fact agree". When
 * the room areas and the stated total disagree materially, something was
 * misread and nothing may be narrowed on the strength of it.
 */
export const AREA_AGREEMENT_TOLERANCE = 0.12;

/**
 * The floor area of the home AS IT WILL BE, deduped by phase.
 *
 * THIS IS THE NUMBER THE CROSS-CHECK NEEDS, AND IT IS NOT THE IN-SCOPE SUM.
 * Found by running the flow live: we ask the customer for the finished square
 * footage of their home, then compared it against the sum of the rooms being
 * remodelled. On a whole-house job those match. On the Squier set - a first
 * floor reconfiguration of a two-storey house - the in-scope work is 1,714 SF
 * of a home more than twice that size, so an honest answer to our own question
 * would have failed the gate and blocked a near-perfect read.
 *
 * The two jobs were tangled together. Validating the READ needs a figure for
 * the whole home; PRICING needs the in-scope subset. So this computes the
 * former: take each level, prefer the new plan where one was drawn and fall
 * back to the existing plan where one was not, and sum. On Squier that is the
 * new first floor plus the existing second floor, which is exactly what the
 * homeowner would describe. Demolition and reference sheets never contribute.
 *
 * It also kills the double count structurally. Existing and new plans of the
 * same level can no longer both land in the total, whatever the model decided
 * about scope, because only one phase per level is ever counted.
 */
export function asDrawnFloorArea(result: PlanExtractionResult): number {
  const usable = result.rooms.filter(
    (r) => r.areaSqFt && r.areaSqFt > 0 && (r.phase === "new" || r.phase === "existing"),
  );
  if (usable.length === 0) return 0;

  const byLevel = new Map<string, PlanRoom[]>();
  for (const r of usable) {
    // An unlabelled level is its own bucket rather than everyone's, so a set
    // that omits level labels degrades to "one floor" instead of merging a
    // basement into a second storey.
    const key = (r.level ?? "").trim().toLowerCase() || "unspecified";
    if (!byLevel.has(key)) byLevel.set(key, []);
    byLevel.get(key)!.push(r);
  }

  let total = 0;
  for (const rooms of byLevel.values()) {
    const fresh = rooms.filter((r) => r.phase === "new");
    const chosen = fresh.length > 0 ? fresh : rooms.filter((r) => r.phase === "existing");
    total += chosen.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  }
  return total;
}

/**
 * Do two independent statements of the home's floor area agree?
 *
 * The check that catches a misread is not "is this number sensible" but "do two
 * independent statements of the same fact agree". Both sides here describe the
 * whole home: one from the drawings' own room tags, one from a total stated on
 * the sheets or supplied by the person who lives there.
 */
export function areasAgree(result: PlanExtractionResult): boolean | null {
  const stated = result.statedTotalSqFt;
  if (!stated || stated <= 0) return null; // Nothing to cross-check against.
  const drawn = asDrawnFloorArea(result);
  if (drawn <= 0) return null; // Nothing read to check.
  return Math.abs(drawn - stated) / stated <= AREA_AGREEMENT_TOLERANCE;
}

/**
 * THE PRINTED FOOTPRINT DIMENSIONS WERE INVESTIGATED AS A SECOND CROSS-CHECK,
 * AND THEY DO NOT WORK. Settled by reading the sheets, not by argument, so that
 * the next person does not spend the same day on it.
 *
 * The idea was tempting because the best read in the corpus (Squier, 0.90 room
 * coverage, every area a printed tag) is blocked solely by `areasAgree` being
 * null, and the model volunteers overall dimensions unprompted. Three things
 * kill it, all visible on sheet A105:
 *
 * 1. WHAT IS PRINTED IS A DIMENSION CHAIN, NOT AN OUTLINE. The top edge reads
 *    74'-7" overall, decomposing into 22'-7" and 51'-6"; the bottom reads 64'-2"
 *    and 21'-4"; the sides carry their own chains. Recovering an AREA needs the
 *    polygon - which run lies on which edge, and where the steps are - and that
 *    is not recoverable from an unordered list of lengths. Only a bounding
 *    rectangle is derivable, and this plan is visibly nowhere near rectangular.
 * 2. THE REFERENCE VALUE IS LESS CERTAIN THAN THE THING IT WOULD POLICE. Reading
 *    the same sheet at full resolution, the overall depth is somewhere between
 *    27'-5" and about 48' depending on which chain is the outer one, so the
 *    bounding box lands anywhere from ~2,000 to ~3,600 SF. A reference with 75%
 *    uncertainty cannot enforce a 12% tolerance.
 * 3. ROOM TAGS DO NOT TILE THE FLOOR. Hallways, stairs, the storage below the
 *    stairs and the closet "by others" carry no SF tag at all, so tagged area is
 *    an unknown fraction of gross area even before the remodel question - and on
 *    a remodel the in-scope rooms are a subset of the building anyway, which is
 *    exactly the case that lacks a stated total.
 *
 * Any band wide enough to admit Squier (tagged area ~47% of its bounding box)
 * would also admit a read that had doubled every room in the house. That is not
 * a cross-check, it is a formality, and `verify:plans` asserts the tolerance
 * stays tight precisely so formalities cannot creep in here.
 *
 * SO THE SECOND CROSS-CHECK IS NOT ON THE DRAWING. It is the customer. This
 * flow already reads first and prices only after they confirm what we read, and
 * the owner of the house knows its square footage. A total they supply is
 * genuinely independent of our read of the sheets, which is the whole property
 * the gate needs. Do not weaken `areasAgree`; ask for the number.
 */

/**
 * The rooms a price is actually built from.
 *
 * ONE DEFINITION, USED BY EVERY GATE AND BY THE ESTIMATOR, so coverage, trusted
 * share and floor area can never disagree about which rooms they are talking
 * about. Three filters, each earning its place:
 *
 * - reference and demolition phases are never priced as floor area. A room on a
 *   demolition plan is the same room as on the new plan; counting both charges
 *   twice for one floor.
 * - when the model tagged BOTH new and existing rooms as in scope, only the new
 *   ones count. This is the production double count, and it is fixed here in
 *   code rather than by asking the model more nicely: on the same PDF read
 *   twice, one run returned ten in-scope rooms and the other nineteen, summing
 *   3,056 SF for a 1,714 SF project.
 * - a set with no "new" sheets at all (existing plans only, or a set whose
 *   phases are all "existing") still prices, because refusing those would throw
 *   away every read where the architect supplied as-builts and nothing else.
 */
export function scopedRooms(result: PlanExtractionResult): PlanRoom[] {
  const candidates = result.rooms.filter(
    (r) => r.inScope && r.phase !== "reference" && r.phase !== "demolition",
  );
  const fresh = candidates.filter((r) => r.phase === "new");
  return fresh.length > 0 ? fresh : candidates;
}

/**
 * How much of the scope rests on numbers we can actually stand behind.
 *
 * Returned as a share so the estimator can narrow proportionally rather than
 * on a yes/no: a plan set where every room is printed deserves more than one
 * where half were paced off.
 */
export function trustedAreaShare(result: PlanExtractionResult): number {
  const scoped = scopedRooms(result).filter((r) => r.areaSqFt && r.areaSqFt > 0);
  if (scoped.length === 0) return 0;
  const total = scoped.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  if (total <= 0) return 0;
  const trusted = scoped
    .filter((r) => TRUSTWORTHY_SOURCES.includes(r.areaSource))
    .reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  return trusted / total;
}

/**
 * What fraction of the rooms we were asked about did we actually measure?
 *
 * FOUND ON A REAL PLAN SET, AND IT WOULD HAVE SHIPPED. trustedAreaShare only
 * divides among rooms that HAVE an area, so a read that captured one printed
 * garage and left sixteen rooms empty scored a perfect 1.0. Combined with a
 * drawing set that states no total to cross-check against, every gate passed
 * and the price would have tightened on a read that found almost nothing.
 *
 * A share is not a coverage measure. This is.
 */
export function measuredRoomCoverage(result: PlanExtractionResult): number {
  const scoped = scopedRooms(result);
  if (scoped.length === 0) return 0;
  const measured = scoped.filter(
    (r) => r.areaSqFt && r.areaSqFt > 0 && TRUSTWORTHY_SOURCES.includes(r.areaSource),
  );
  return measured.length / scoped.length;
}

/** Below this, too much of the floor plan is guesswork to tighten anything. */
export const MIN_ROOM_COVERAGE = 0.6;

/** Below this, most of what we have is estimate rather than measurement. */
export const MIN_TRUSTED_AREA_SHARE = 0.6;

export interface PlanQuality {
  areasAgree: boolean | null;
  trustedAreaShare: number;
  measuredRoomCoverage: number;
  /** Only ever true when nothing below objected. */
  canTightenPrice: boolean;
  blockers: string[];
}

/**
 * May this read tighten the price, and if not, why not?
 *
 * LIVES HERE RATHER THAN IN THE ROUTE SO IT CAN BE TESTED. These five gates are
 * the entire safety argument for the feature, and while they sat inline in the
 * request handler the only way to exercise them was to upload a file and spend
 * two minutes and real money finding out. `verify:plans` now runs them against
 * the shapes four real plan sets actually produced.
 *
 * All must hold. Any one failing drops back to pricing as though no plans
 * arrived, because a tightened range is a promise about accuracy and each of
 * these is a way that promise breaks silently rather than loudly.
 */
export function assessPlanQuality(result: PlanExtractionResult): PlanQuality {
  const agree = areasAgree(result);
  const trusted = trustedAreaShare(result);
  const coverage = measuredRoomCoverage(result);
  const blockers: string[] = [];

  if (!result.looksLikePlans) blockers.push("These do not read as construction drawings.");

  if (agree === false) {
    blockers.push(
      "The room areas do not add up to the total floor area stated on the drawings, so something was misread.",
    );
  }

  if (trusted < MIN_TRUSTED_AREA_SHARE) {
    blockers.push(
      "Too few of the rooms carry a printed dimension, so most of the areas are estimates rather than measurements.",
    );
  }

  // COVERAGE, WHICH IS NOT THE SAME AS SHARE. A read that measured one printed
  // garage and left sixteen rooms blank scores a perfect trusted SHARE, because
  // a share only divides among the rooms it managed to measure. Seen on a real
  // plan set, where every other gate passed - and then seen again on a permit
  // set, where the eleven "measured rooms" turned out to be the cover sheet's
  // area tabulation and all thirty-three actual rooms were blank.
  if (coverage < MIN_ROOM_COVERAGE) {
    blockers.push(
      `We could only measure ${Math.round(coverage * 100)}% of the rooms from these drawings, so most of the floor plan would still be an estimate.`,
    );
  }

  // No total on the sheets means no way to catch a misread, and "we could not
  // check" must not read the same as "we checked and it was fine".
  //
  // NAMES THE FIX, BECAUSE THIS ONE IS FIXABLE AND THE OTHERS ARE NOT. Every
  // other blocker here means the drawings cannot carry a tighter price. This one
  // means a single number is missing, and the person who uploaded the plans
  // knows it. Nothing printed on the sheets can substitute (see the note above
  // areasAgree), so the message must ask rather than apologise.
  if (agree === null) {
    blockers.push(
      "The drawings do not state a total floor area, so there is nothing to check the room measurements against. Tell us the total square footage and we can tighten this.",
    );
  }

  return {
    areasAgree: agree,
    trustedAreaShare: Number(trusted.toFixed(3)),
    measuredRoomCoverage: Number(coverage.toFixed(3)),
    canTightenPrice: blockers.length === 0,
    blockers,
  };
}
