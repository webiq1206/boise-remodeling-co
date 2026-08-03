/**
 * What a REMODEL estimate says about itself.
 *
 * READS THE TAKEOFF, NOT A TEMPLATE. Whether permits are included is decided by
 * looking for the permit line in the calculation, not by a policy sentence. That
 * is the whole design: if a cost code is in `estimate.lines`, the customer is
 * told it is included; if the rule set never pulled it, they are told it is not,
 * and why. The two can never disagree, because they read the same array.
 *
 * NONE OF THIS LANGUAGE IS SHARED WITH THE RE-10 CALCULATOR. A remodel is scope
 * a homeowner is choosing, priced before the walls are open. An RE-10 is a list
 * somebody else wrote and a document we may have misread. Same plumbing in
 * `disclosure.ts`, different sentences, on purpose.
 */
import type { InternalEstimate, ScopeSelections } from "../costs/engine";
import type { ProjectType } from "../estimateEngine";
import type { PlanMeasurements } from "../plans/estimateInput";
import type { PlanQuality } from "../plans/extraction";
import { DisclosureBuilder, type Disclosure } from "./disclosure";

export interface RemodelDisclosureInput {
  project: ProjectType;
  selections: ScopeSelections;
  /** The calculation itself. What is in here IS what is included. */
  estimate: InternalEstimate;
  /** Present only when drawings cleared every gate. */
  measurements?: PlanMeasurements | null;
  planQuality?: PlanQuality | null;
  /** Rooms the drawings named but could not measure. */
  notMeasured?: string[];
  /** Work the drawings hand to somebody else. */
  excludedScope?: { category: string; description: string }[];
  /** Drives whether hazardous-material language is relevant at all. */
  yearBuilt?: number | null;
  occupiedDuringWork?: boolean | null;
  /** True when the customer sent drawings, whatever we managed to read. */
  documentsProvided?: boolean;
  /** Conditions the customer told us about in their own words. */
  knownConditions?: string[];
}

const PROJECT_LABEL: Record<ProjectType, string> = {
  kitchen: "kitchen",
  bathroom: "bathroom",
  "whole-home": "whole home",
  addition: "addition",
  adu: "ADU",
  basement: "basement",
};

/** Materials that stopped going into houses around 1980. */
const HAZARD_ERA_CUTOFF = 1980;

export function buildRemodelDisclosure(input: RemodelDisclosureInput): Disclosure {
  const b = new DisclosureBuilder();
  const { estimate, selections, project } = input;
  const label = PROJECT_LABEL[project];

  const hasCode = (prefix: string) => estimate.lines.some((l) => l.code.startsWith(prefix));
  const hasDivision = (division: string) => estimate.lines.some((l) => l.division === division);
  const qtyIn = (division: string) =>
    estimate.lines.filter((l) => l.division === division).reduce((m, l) => Math.max(m, l.quantity), 0);

  const measured = input.measurements ?? null;
  const sqft = Math.round(selections.sqft);
  const area = sqft.toLocaleString("en-US");

  /* ------------------------------------------------------- assumptions
     Each one names the answer or measurement that produced it, so a customer
     reading the list can see their own inputs reflected back. */

  b.assume(
    "project-type",
    `We priced a ${label} project at the ${selections.quality.replace("-", " ")} finish level.`,
    `project=${project}, quality=${selections.quality}`,
  );

  if (measured) {
    b.assume(
      "area-measured",
      `Floor area of ${area} square feet, measured from ${measured.measuredRooms} rooms on your drawings rather than estimated.`,
      `plan measurements, ${measured.measuredRooms} rooms with printed areas`,
    );
    if (measured.ceilingHeight !== null) {
      b.assume(
        "ceiling-measured",
        `Ceilings at ${measured.ceilingHeight.toFixed(1)} feet, from the heights stated on your drawings.`,
        "plate heights stated on the sections",
      );
    } else {
      b.assume(
        "ceiling-default",
        "Standard eight foot ceilings, because your drawings do not state a plate height.",
        "no ceiling height on any sheet",
      );
    }
  } else {
    b.assume(
      "area-stated",
      `Floor area of ${area} square feet, as you gave it to us.`,
      "area entered by the customer",
    );
  }

  if (selections.layoutChanges) {
    const text =
      selections.layoutChanges === "none"
        ? "The layout stays as it is, so no walls move."
        : selections.layoutChanges === "moderate"
          ? "Some walls move or come out, without structural work."
          : "Major layout change including structural work.";
    b.assume("layout", text, `layoutChanges=${selections.layoutChanges}`);
  }

  if (selections.plumbingElectrical) {
    const text =
      selections.plumbingElectrical === "cosmetic"
        ? "Plumbing fixtures and electrical stay where they are."
        : selections.plumbingElectrical === "partial"
          ? "Some plumbing fixtures move, and circuits are reworked to suit."
          : "Full systems work: fixtures relocated, and panel or equipment work included.";
    b.assume("systems", text, `plumbingElectrical=${selections.plumbingElectrical}`);
  }

  if (project === "bathroom" && selections.bathroomCount && selections.bathroomCount > 1) {
    b.assume(
      "bath-count",
      `${selections.bathroomCount} bathrooms at roughly ${area} square feet each.`,
      `bathroomCount=${selections.bathroomCount}`,
    );
  }

  if (input.occupiedDuringWork === true) {
    b.assume(
      "occupied",
      "You will be living in the house while we work, so the schedule allows for protection, daily clean-up and staged access.",
      "customer said the property stays occupied",
    );
  }

  /* ------------------------------------------- what is in, read off the lines */

  const inclusions: Array<[string, string, string, string]> = [
    ["demolition", "Demolition and haul away", "03-03-04", "the demolition line is in the calculation"],
    ["disposal", "Dumpster and disposal", "03-02-06", "the dumpster line is in the calculation"],
    ["permits", "Permit fees", "03-01-01", "the permit line is in the calculation"],
    ["design", "Architectural drawings", "02-00-01", "the architecture line is in the calculation"],
    ["engineering", "Structural engineering", "02-00-03", "the engineering line is in the calculation"],
    ["final-clean", "Final clean before handover", "03-23-02", "the final clean line is in the calculation"],
  ];
  for (const [id, itemLabel, code, evidence] of inclusions) {
    if (hasCode(code)) {
      b.item(id, itemLabel, "included", "Priced and inside the range below.", evidence);
    }
  }

  const tradeDivisions: Array<[string, string, string]> = [
    ["cabinetry", "Cabinetry and countertops", "COUNTERTOPS + CABINETRY"],
    ["flooring", "Flooring", "FLOORING"],
    ["tile", "Tile and stone", "TILE + STONE"],
    ["electrical", "Electrical", "ELECTRICAL"],
    ["plumbing", "Plumbing", "PLUMBING"],
    ["hvac", "Heating and cooling", "MECHANICAL (HVAC)"],
    ["drywall", "Drywall", "DRYWALL"],
    ["paint", "Painting", "PAINTING + WALLPAPER"],
    ["millwork", "Interior doors and trim", "INTERIOR DOORS + MILLWORK"],
    ["framing", "Framing", "FRAMING"],
    ["foundation", "Foundation", "FOUNDATION"],
    ["exterior", "Exterior finishes", "EXTERIOR FINISHES"],
    ["openings", "Windows and exterior doors", "EXTERIOR OPENINGS"],
    ["insulation", "Insulation", "INSULATION"],
  ];
  for (const [id, itemLabel, division] of tradeDivisions) {
    if (hasDivision(division)) {
      const q = Math.round(qtyIn(division)).toLocaleString("en-US");
      b.item(
        id,
        itemLabel,
        "included",
        `Priced across roughly ${q} units of measure for this project.`,
        `${division} lines present in the calculation`,
      );
    }
  }

  /* ---------------------------------------- what is out, and only when it is
     THE SPEC'S SHARPEST RULE: never show an exclusion for something that was
     priced. Each of these fires only on the absence of its own line. */

  if (!hasCode("03-01-01")) {
    b.item(
      "permits",
      "Permit fees",
      "excluded",
      "Jurisdiction fees are not in this range. We pull the permit and bill the fee at cost once the scope is set.",
      "no permit line in the calculation for this scope and finish level",
    );
  }
  if (!hasCode("02-00-01")) {
    b.item(
      "design",
      "Architectural drawings",
      input.documentsProvided ? "excluded" : "optional",
      input.documentsProvided
        ? "You already have drawings, so no design fee is in this range."
        : "Not in this range. If your project needs drawings we can quote design separately.",
      input.documentsProvided
        ? "customer supplied drawings and no architecture line was pulled"
        : "no architecture line in the calculation",
    );
  }
  if (!hasCode("02-00-03") && !hasCode("03-01-04")) {
    const structural = selections.layoutChanges === "major";
    b.item(
      "engineering",
      "Structural engineering",
      structural ? "needs-specialist" : "excluded",
      structural
        ? "Your project involves structural work, so an engineer will need to stamp it. That fee is not in this range."
        : "No engineering fee is in this range, and nothing in your scope currently calls for one.",
      structural
        ? "layoutChanges=major with no engineering line in the calculation"
        : "no engineering line in the calculation",
    );
  }

  // Appliances are never priced by this engine. That is a standing decision with
  // its own guard (verify:no-appliance-costs), so it is a real exclusion rather
  // than an oversight, and a kitchen customer in particular has to be told.
  if (!hasDivision("APPLIANCES")) {
    b.item(
      "appliances",
      "Appliances",
      "excluded",
      "Appliances are yours to buy. We install what you supply, and the labour to do that is in the range.",
      "no appliance costs in the calculation, by design",
    );
  }
  if (!hasDivision("LANDSCAPE")) {
    b.item(
      "landscaping",
      "Landscaping and exterior grounds",
      "optional",
      "Not part of this range. We can price it alongside the remodel if you want it.",
      "no landscape lines in the calculation",
    );
  }
  if (!hasDivision("FURNISHINGS")) {
    b.item(
      "furnishings",
      "Furniture and window coverings",
      "excluded",
      "Loose furniture, decor and window coverings are not part of a construction scope.",
      "no furnishings lines in the calculation",
    );
  }

  /* Anything the drawings themselves hand to somebody else. */
  for (const [i, s] of (input.excludedScope ?? []).entries()) {
    b.item(
      `drawing-exclusion-${i}`,
      s.description,
      "excluded",
      "Your drawings mark this as somebody else's work, so it is not in our range. Tell us if you want it priced.",
      `marked out of contract on the drawings (${s.category})`,
    );
  }

  /* --------------------------------------------- allowances and soft numbers */

  if (hasDivision("COUNTERTOPS + CABINETRY") || hasDivision("TILE + STONE")) {
    b.item(
      "selections-allowance",
      "Cabinetry, stone, tile and fixture selections",
      "allowance",
      `Priced at a ${selections.quality.replace("-", " ")} level. These span a wide range at every level, so the number moves when you choose the actual products.`,
      `finish level ${selections.quality} applied to selection-heavy divisions`,
    );
    b.acknowledge("Allowance items change when I make my final material and fixture selections.");
  }

  /* ------------------------------------------------- existing conditions
     GATED ON REAL TRIGGERS. A remodel touches a building that already exists,
     but that does not make every warning relevant to every job, and a wall of
     boilerplate is how customers learn to skip the one that mattered. */

  const opensStructure = hasCode("03-03-04") || selections.layoutChanges !== "none";
  if (opensStructure) {
    b.warn(
      "concealed",
      "Opening walls, floors or ceilings can expose framing, wiring, plumbing or damage that no one could see beforehand. Anything we find gets priced and agreed with you before we carry on.",
      hasCode("03-03-04")
        ? "demolition is in the priced scope"
        : `layoutChanges=${selections.layoutChanges}`,
    );
    b.factor("What we find once the walls are open");
    b.acknowledge("Conditions hidden behind finishes may change the price once work starts.");
  }

  if (input.yearBuilt && input.yearBuilt < HAZARD_ERA_CUTOFF && opensStructure) {
    b.warn(
      "hazardous-materials",
      `A home built in ${input.yearBuilt} can contain asbestos or lead in materials we will be disturbing. Testing and any remediation are not in this range and are handled by a licensed specialist.`,
      `year built ${input.yearBuilt} is before ${HAZARD_ERA_CUTOFF} and the scope disturbs existing materials`,
    );
    b.item(
      "hazmat",
      "Hazardous material testing and removal",
      "needs-specialist",
      "Not in this range. If testing finds asbestos or lead, a licensed abatement contractor prices that work separately.",
      `pre-${HAZARD_ERA_CUTOFF} property with demolition in scope`,
    );
  }

  if (selections.plumbingElectrical === "full" || selections.plumbingElectrical === "partial") {
    b.warn(
      "existing-systems",
      "Existing wiring and plumbing are only fully visible once they are opened up. If what is behind the wall will not carry the new work, bringing it up to code is priced as it is found.",
      `plumbingElectrical=${selections.plumbingElectrical}`,
    );
    b.factor("The condition and capacity of the existing wiring and plumbing");
  }

  for (const [i, c] of (input.knownConditions ?? []).entries()) {
    b.warn(
      `customer-condition-${i}`,
      `You told us about ${c}. We have not priced repairs for it, because the extent will not be clear until someone is standing in front of it.`,
      "condition described by the customer",
    );
    b.item(
      `condition-${i}`,
      c,
      "needs-onsite",
      "Priced after we have seen it.",
      "condition described by the customer",
    );
  }

  /* ---------------------------------------------- what we do not know yet
     Each gap says what it did to the estimate, which is the difference between
     a warning and an excuse. */

  if (input.documentsProvided && input.planQuality && !input.planQuality.canTightenPrice) {
    for (const [i, blocker] of input.planQuality.blockers.entries()) {
      b.gap(
        `plan-gate-${i}`,
        blocker,
        "your uploaded drawings",
        "We priced from the area you gave us instead of from the drawings, so this range is wider than it would be otherwise.",
        "Send the floor plans with room areas marked, or tell us the finished square footage of each area.",
      );
    }
    b.widen(0.05);
    b.factor("A closer read of your drawings");
  }

  if (!input.documentsProvided) {
    b.gap(
      "no-drawings",
      "No drawings were provided",
      "the whole project",
      "Every quantity is derived from the floor area you gave us rather than measured, so the range is preliminary.",
      "Upload floor plans if you have them and we will measure from those instead.",
    );
    b.widen(0.07);
  }

  for (const [i, room] of (input.notMeasured ?? []).entries()) {
    b.gap(
      `unmeasured-${i}`,
      `${room} carries no printed area`,
      "your floor plans",
      "It is not in the measured square footage, so nothing in this range covers it.",
      `Tell us the size of ${room} and we will add it.`,
    );
  }

  if (!selections.layoutChanges) {
    b.gap(
      "layout-unknown",
      "We do not know whether walls are moving",
      "your project scope",
      "The range assumes no structural change. Moving a load bearing wall would add cost that is not in it.",
      "Tell us whether any walls are being removed or moved.",
    );
    b.widen(0.05);
  }
  if (!selections.plumbingElectrical) {
    b.gap(
      "systems-unknown",
      "We do not know whether plumbing or electrical is moving",
      "your project scope",
      "The range assumes fixtures stay where they are. Relocating them adds cost that is not in it.",
      "Tell us whether sinks, toilets or appliances are changing position.",
    );
    b.widen(0.05);
  }

  /* --------------------------------------------------- factors and next steps */

  b.factor("An on-site walkthrough and verified measurements");
  b.factor("Your final material and fixture selections");
  if (hasCode("03-01-01")) b.factor("What the permit office asks for on review");
  if (selections.layoutChanges === "major") b.factor("The engineer's design for the structural work");
  if (input.occupiedDuringWork === true) b.factor("Working around you while you live in the house");

  b.acknowledge("This is a preliminary planning range, not a quote or a contract.");
  b.acknowledge("It is based on the information, measurements and selections I have given you.");
  b.acknowledge("The range may change after an on-site evaluation and verified measurements.");
  b.acknowledge("Anything listed as excluded is not in this range.");
  b.acknowledge("A firm price follows a defined scope of work.");

  b.next("Book a walkthrough so we can verify measurements and look at existing conditions.");
  if (!input.documentsProvided) b.next("Send drawings if you have them, and we will measure from those.");
  if ((input.notMeasured ?? []).length > 0) b.next("Send sizes for the rooms your drawings did not label.");

  return b.build();
}
