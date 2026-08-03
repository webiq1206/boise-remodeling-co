/**
 * Turning a plan set into estimator input.
 *
 * WHAT A PLAN SET ACTUALLY BUYS. Not a narrower band - a truer centre. Today the
 * estimator is handed a floor area someone typed into a web form or inferred
 * from assessor records, and every quantity in the takeoff is derived from it.
 * A measured drawing replaces the largest guess in the whole calculation. The
 * ceiling height matters for the same reason and is worse: it silently defaults
 * to 8 feet, and the Gambardella set carries a 12'-0" plate over the living,
 * dining and kitchen, which is 50 percent more wall than the default assumes.
 *
 * NOTHING HERE FIRES UNLESS THE READ EARNED IT. `planMeasurements` returns null
 * whenever `assessPlanQuality` says the read may not tighten a price, and a null
 * means the estimator runs exactly as it does with no plans at all. That is the
 * same rule the rest of the feature is built on: uploading a file buys nothing,
 * a measurement that can be quoted back buys something.
 *
 * WHY THE BAND IS NOT TOUCHED. The obvious move is to narrow the quoted range
 * because we now "know more", and it is wrong. The 15 percent half-band exists
 * because five back-tested jobs came in at 0.96, 1.25, 1.00, 1.01 and 0.99 of
 * the engine - and every one of those jobs had a KNOWN floor area. That spread
 * is estimator variance, not input error, so a plan set does nothing to reduce
 * it. Narrowing the band on the strength of a good drawing would raise the odds
 * of finishing above the quoted top with no evidence bought in exchange.
 */
import {
  assessPlanQuality,
  scopedRooms,
  TRUSTWORTHY_SOURCES,
  type PlanExtractionResult,
  type PlanRoom,
  type PlanScopeItem,
} from "./extraction";
import { perimeterOf } from "../costs/engine";

/**
 * THE INTERIOR PERIMETER IS SUPPLIED. THE ENVELOPE IS NOT, AND CANNOT BE.
 *
 * These were one field on `Dimensions` until the split, and the difference is
 * not small: the Squier first floor is 169 ft of building envelope and 490 ft of
 * interior wall. Trim, backsplash and tile want the second; footings, gutters,
 * siding and glazing want the first. Feeding the measured figure to all of them
 * would have priced 2.9 times the footings an addition needs.
 *
 * So only the interior side is measured here. Summing room perimeters is the
 * RIGHT way to get it, because both faces of a partition get finished and both
 * get baseboard - a nine-room floor really does carry three times the trim of
 * one open space of the same area, and the estimator has been understating it.
 *
 * The envelope stays derived from floor area. A drawing prints a dimension
 * CHAIN, not an outline, so the building's true perimeter is not recoverable
 * from it - the same finding that killed the footprint cross-check.
 */
export interface PlanMeasurements {
  /** In-scope floor area, summed from rooms we actually measured. */
  sqft: number;
  /**
   * LF of finished interior wall, summed room by room.
   *
   * Uses the estimator's own `perimeterOf` so the one-room case reduces exactly
   * to what the engine would have derived on its own.
   */
  interiorPerimeterFt: number;
  /** Area-weighted mean of the plate heights the drawings state, or null. */
  ceilingHeight: number | null;
  /** Full bathrooms in scope. Water closets are not counted; see BATHROOM. */
  bathroomCount: number | null;
  /** How many in-scope rooms the sqft figure rests on. */
  measuredRooms: number;
  /** Which estimator project type the drawings suggest, when they suggest one. */
  suggestedProject: "kitchen" | "bathroom" | "whole-home" | "addition" | null;
  /**
   * How much the layout moves, derived from whether walls actually move.
   *
   * null when the drawings do not settle it, which the estimator reads as
   * "the homeowner has not told us" rather than as "none".
   */
  layoutChanges: "none" | "moderate" | "major" | null;
  /** How deep the systems work goes, derived the same way. */
  plumbingElectrical: "cosmetic" | "partial" | "full" | null;
  kitchenIncluded: boolean | null;
  /** Work the drawings call for, ours to price. */
  scopeItems: PlanScopeItem[];
  /** Work the drawings hand to someone else. Named, never priced. */
  excludedScope: PlanScopeItem[];
  /** Plain-language provenance, for the confirmation step and the admin view. */
  notes: string[];
}

/**
 * Turning facts about the drawings into the ratings the estimator prices on.
 *
 * DERIVED IN CODE, NOT ASKED OF THE MODEL. "Is this a moderate or a major
 * layout change" is a house judgement with money attached, and asking for it
 * directly produced exactly the drift that the phase field was added to kill.
 * Asking whether a wall moves is a question the drawing answers in one hatch
 * pattern. The ladder below is the house rule, in one place, auditable.
 *
 * A null in means a null out. The estimator already treats null as "not told",
 * and collapsing an unknown into "none" would quietly delete real cost.
 */
function deriveLayoutChanges(f: PlanExtractionResult["scopeFacts"]): PlanMeasurements["layoutChanges"] {
  if (f.wallsRemovedOrAdded === null && f.structuralWork === null) return null;
  // Structural work means a wall was load bearing, which is the expensive case.
  if (f.structuralWork === true) return "major";
  if (f.wallsRemovedOrAdded === true) return "moderate";
  if (f.wallsRemovedOrAdded === false) return "none";
  return null;
}

function derivePlumbingElectrical(
  f: PlanExtractionResult["scopeFacts"],
): PlanMeasurements["plumbingElectrical"] {
  const signals = [f.plumbingFixturesRelocated, f.electricalServiceOrPanelWork, f.hvacWork];
  if (signals.every((s) => s === null)) return null;
  // A panel or a new system is the full job; a fixture moving is partial.
  if (f.electricalServiceOrPanelWork === true || f.hvacWork === true) return "full";
  if (f.plumbingFixturesRelocated === true) return "partial";
  if (signals.some((s) => s === false)) return "cosmetic";
  return null;
}

/**
 * A BATHROOM IS A ROOM WITH A BATH IN IT, NOT EVERY ROOM WITH PLUMBING.
 *
 * `bathroomCount` multiplies the ENTIRE bathroom takeoff, so an over-count is
 * one of the few inputs here that can be badly wrong in one step. Squier tags
 * "Bath 1", "Guest Bath" and "W.C. 1" on one floor: that is two bathrooms and a
 * water closet inside the primary suite, not three bathrooms. Counting the W.C.
 * would have added 50 percent to the bathroom scope of that job.
 */
const BATHROOM = /\b(bath|bathroom|powder|ensuite|en-suite)\b/i;
const WATER_CLOSET = /\b(w\.?\s?c\.?|water closet|toilet room)\b/i;
const KITCHEN = /\bkitchen\b/i;

function isMeasured(r: PlanRoom): boolean {
  return Boolean(r.areaSqFt && r.areaSqFt > 0 && TRUSTWORTHY_SOURCES.includes(r.areaSource));
}

function isBathroom(r: PlanRoom): boolean {
  return BATHROOM.test(r.name) && !WATER_CLOSET.test(r.name);
}

/**
 * Which of the estimator's project types do these drawings describe?
 *
 * TWO DIFFERENT AXES, SO THIS IS A SUGGESTION AND NOT A TRANSLATION. A plan set
 * says what KIND of construction it is (remodel, addition, new build); the
 * estimator asks which SPACE is being worked on (kitchen, bathroom, whole-home).
 * Neither determines the other. Returns null rather than guessing when the
 * drawings do not settle it, and null means the caller asks the customer -
 * which the flow does anyway before anything is priced.
 *
 * New builds return null on purpose: the estimator has no ground-up project
 * type, and quietly pricing one as a whole-home remodel would omit the shell.
 */
function suggestProject(result: PlanExtractionResult, scoped: PlanRoom[]): PlanMeasurements["suggestedProject"] {
  if (result.projectType === "addition") return "addition";
  if (result.projectType !== "remodel") return null;
  if (scoped.length === 0) return null;

  const baths = scoped.filter(isBathroom).length;
  const kitchens = scoped.filter((r) => KITCHEN.test(r.name)).length;
  // Water closets belong to whichever suite they sit in, so they neither make a
  // scope "bathroom only" nor argue against it.
  const other = scoped.filter((r) => !isBathroom(r) && !WATER_CLOSET.test(r.name) && !KITCHEN.test(r.name)).length;

  if (baths > 0 && kitchens === 0 && other === 0) return "bathroom";
  if (kitchens > 0 && baths === 0 && other === 0) return "kitchen";
  return "whole-home";
}

/**
 * Measurements the estimator may use, or null when the read has not earned it.
 *
 * The null is the whole safety property. Every gate in `assessPlanQuality` has
 * to hold before a single number crosses from the drawings into a price, so a
 * read that measured one printed garage, or one with nothing to cross-check
 * against, changes nothing about what the customer is quoted.
 */
export function planMeasurements(result: PlanExtractionResult): PlanMeasurements | null {
  if (!assessPlanQuality(result).canTightenPrice) return null;

  // scopedRooms, not a local filter: the same definition the gates used, so
  // coverage and floor area can never disagree about which rooms they mean.
  const scoped = scopedRooms(result);
  const measured = scoped.filter(isMeasured);
  const sqft = measured.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  // A gate passing with no measured area at all should be impossible, but the
  // estimator divides by this and a zero would be worse than declining.
  if (sqft <= 0) return null;

  /* Area-weighted, because a 12-foot plate over a 300 SF living room and an
     8-foot plate over a 15 SF closet are not two equal votes. Rooms that state
     no height abstain rather than dragging the mean toward the default. */
  const withHeight = measured.filter((r) => r.ceilingHeightFt && r.ceilingHeightFt > 0);
  const heightWeight = withHeight.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  const ceilingHeight =
    heightWeight > 0
      ? withHeight.reduce((s, r) => s + (r.ceilingHeightFt ?? 0) * (r.areaSqFt ?? 0), 0) / heightWeight
      : null;

  /* Summed room by room rather than taken off the whole floor, because that is
     what the length actually is once there are partitions in the way. */
  const interiorPerimeterFt = measured.reduce((s, r) => s + perimeterOf(r.areaSqFt ?? 0), 0);

  const baths = measured.filter(isBathroom);
  const suggestedProject = suggestProject(result, scoped);

  const notes: string[] = [
    `${Math.round(sqft).toLocaleString("en-US")} square feet measured from ${measured.length} room${measured.length === 1 ? "" : "s"} on the drawings.`,
    `${Math.round(interiorPerimeterFt).toLocaleString("en-US")} linear feet of interior wall, which is what trim and tile are priced against.`,
  ];
  if (ceilingHeight !== null) {
    notes.push(
      `Ceiling height ${ceilingHeight.toFixed(1)} feet, from the plate heights stated on ${withHeight.length} of those rooms.`,
    );
  }
  if (baths.length > 0) {
    notes.push(`${baths.length} bathroom${baths.length === 1 ? "" : "s"} in scope.`);
  }
  if (measured.length < scoped.length) {
    // Named, because "nothing the customer asked for may silently vanish" and a
    // room dropped for want of a legible tag is exactly that.
    const dropped = scoped.filter((r) => !isMeasured(r)).map((r) => r.name);
    notes.push(`Not included, no printed area on the sheets: ${dropped.join(", ")}.`);
  }

  const items = result.scopeItems ?? [];
  const scopeItems = items.filter((i) => i.inContract);
  const excludedScope = items.filter((i) => !i.inContract);
  const facts = result.scopeFacts;
  const layoutChanges = facts ? deriveLayoutChanges(facts) : null;
  const plumbingElectrical = facts ? derivePlumbingElectrical(facts) : null;

  if (scopeItems.length > 0) {
    const byCategory = new Map<string, number>();
    for (const i of scopeItems) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
    notes.push(
      `${scopeItems.length} items of work read off the drawings: ` +
        [...byCategory.entries()].map(([c, n]) => `${n} ${c}`).join(", ") + ".",
    );
  }
  if (excludedScope.length > 0) {
    // Loud, because this is what the customer will otherwise assume is in the
    // price. The Squier patio deck says "SEPARATE PERMIT APPLICATION" on the
    // sheet; the Gambardella greenhouse and swim spa are both "by others".
    notes.push(
      `Not in the price, the drawings give ${excludedScope.length === 1 ? "it" : "them"} to someone else: ` +
        excludedScope.map((i) => i.description).join("; ") + ".",
    );
  }
  if (layoutChanges !== null) notes.push(`Layout change read as ${layoutChanges}.`);
  if (plumbingElectrical !== null) notes.push(`Systems work read as ${plumbingElectrical}.`);

  return {
    sqft,
    interiorPerimeterFt,
    ceilingHeight,
    bathroomCount: baths.length > 0 ? baths.length : null,
    measuredRooms: measured.length,
    suggestedProject,
    layoutChanges,
    plumbingElectrical,
    kitchenIncluded: facts?.kitchenInScope ?? null,
    scopeItems,
    excludedScope,
    notes,
  };
}

/** The subset of ScopeSelections a plan set can speak to. */
export interface PlanScopePatch {
  sqft: number;
  interiorPerimeterFt: number;
  ceilingHeight?: number;
  bathroomCount?: number;
  layoutChanges?: "none" | "moderate" | "major";
  plumbingElectrical?: "cosmetic" | "partial" | "full";
  kitchenIncluded?: boolean;
}

/**
 * Fold measurements into the selections the estimator is about to price.
 *
 * ON A BATHROOM PROJECT THE SIZE QUESTION MEANS ONE BATHROOM, NOT ALL OF THEM.
 * `buildInternalEstimate` multiplies the whole takeoff by `bathroomCount`, so
 * handing it the summed area of three bathrooms AND a count of three prices nine
 * bathrooms. This is the one place the two numbers interact, and getting it
 * wrong is a silent tripling rather than an error, so the area is divided here
 * and the division is stated in the notes.
 */
export function planScopePatch(
  m: PlanMeasurements,
  project: "kitchen" | "bathroom" | "whole-home" | "addition" | "adu" | "basement",
): PlanScopePatch {
  const count = project === "bathroom" ? Math.max(1, m.bathroomCount ?? 1) : 1;

  const patch: PlanScopePatch = {
    sqft: m.sqft / count,
    // Divided by the same count as the area, and for the same reason: the
    // takeoff multiplies both back up. Leaving this undivided would tile every
    // bathroom with the wall length of all of them.
    interiorPerimeterFt: m.interiorPerimeterFt / count,
  };
  if (m.ceilingHeight !== null) patch.ceilingHeight = m.ceilingHeight;
  if (project === "bathroom" && m.bathroomCount !== null) patch.bathroomCount = m.bathroomCount;

  /* THE SCOPE RATINGS, WHICH ARE WHERE MOST OF THE MONEY IS. Floor area sets
     the size of the job; these set what is being done to it. A null is left off
     the patch entirely rather than sent as null, so the estimator's own default
     applies instead of a plans-shaped hole. */
  if (m.layoutChanges !== null) patch.layoutChanges = m.layoutChanges;
  if (m.plumbingElectrical !== null) patch.plumbingElectrical = m.plumbingElectrical;
  if (m.kitchenIncluded !== null) patch.kitchenIncluded = m.kitchenIncluded;
  return patch;
}
