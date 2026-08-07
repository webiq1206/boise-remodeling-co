/**
 * RE-10 REPAIR TAXONOMY: what each repair request actually costs to do properly.
 *
 * The main estimator answers "what does a 250 SF kitchen remodel cost". This one
 * answers a different question: "here are eleven small repairs an inspector
 * found, what is the whole list worth". The inputs share nothing - one is a
 * project with dimensions, the other is a list of discrete items - so this file
 * carries its own scope layer. What it reuses is the part that matters: the
 * owner's line-item catalog, the same UOMs and unit costs, and the same true
 * gross-margin arithmetic.
 *
 * WHY RECIPES RATHER THAN LINE ITEMS. An RE-10 says "repair damaged drywall and
 * repaint the affected wall". Priced literally that is drywall plus paint, and
 * it would lose money on every job. Doing it properly also means masking the
 * room, cutting out the damage, hauling it away, taping, floating, sanding,
 * matching texture, priming, and cleaning up. Each repair kind below expands
 * into the full set of catalog codes that the work actually consumes, so the
 * supporting work is priced because it is listed, not remembered.
 *
 * WHY MINIMUMS EXIST. The catalog is a whole-project rate card: drywall labor
 * is $7.50 per square foot of a remodel. Applied to a four-square-foot patch
 * that is thirty dollars of labor, which does not pay for the drive, let alone
 * the tradesman. Trade minimums and mobilization below are what stop a list of
 * small repairs from being priced into a loss. They are not padding; they are
 * the difference between the catalog rate and the cost of showing up.
 */
import {
  LINE_ITEMS,
  item,
  type CostType,
  type LineItem,
  type Uom,
} from "./lineItemCatalog";
import { type CostLine, type EstimateWarning, priceAtMargin } from "./engine";

/* ------------------------------------------------------------------ trades */

/**
 * The parent categories an RE-10 list is organized into. Deliberately the
 * homeowner's vocabulary, not the catalog's 27 divisions: an agent reads
 * "Painting", not "PAINTING + WALLPAPER".
 */
export type RepairTrade =
  | "carpentry"
  | "drywall"
  | "painting"
  | "flooring"
  | "plumbing"
  | "electrical"
  | "exterior"
  | "roofing"
  | "general";

export const TRADE_LABELS: Record<RepairTrade, string> = {
  carpentry: "Carpentry and trim",
  drywall: "Drywall",
  painting: "Painting",
  flooring: "Flooring",
  plumbing: "Plumbing",
  electrical: "Electrical",
  exterior: "Exterior and siding",
  roofing: "Roofing",
  general: "General repairs",
};

/* --------------------------------------------------------------- taxonomy */

/** The unit a repair is measured in. EA covers "one door", "one outlet". */
export type RepairUnit = "EA" | "SF" | "LF";

/**
 * Why an item cannot be priced automatically.
 *
 * These are not edge cases to be tidied away later. An RE-10 that says "repair
 * foundation crack" or "evaluate mold in crawlspace" is asking a question this
 * engine must not answer from a web form, and the honest response is to price
 * what it can and say plainly that the rest needs eyes on it.
 */
export type ReviewReason =
  | "structural"
  | "foundation"
  | "water-intrusion"
  | "mold-hazmat"
  | "asbestos-lead"
  | "major-roofing"
  | "electrical-service"
  | "sewer-septic"
  | "hvac-replacement"
  | "gas"
  | "fire-damage"
  | "engineering"
  | "permit-uncertain"
  | "concealed"
  | "allowance"
  | "incomplete-info"
  | "out-of-scope";

export const REVIEW_REASON_TEXT: Record<ReviewReason, string> = {
  structural: "Structural work. Needs an onsite evaluation, and may need an engineer.",
  foundation: "Foundation concern. Needs an onsite evaluation before any number is meaningful.",
  "water-intrusion": "Active or past water intrusion. The repair depends on what is found behind the finish.",
  "mold-hazmat": "Possible mold or hazardous material. Requires testing before scoping.",
  "asbestos-lead": "Possible asbestos or lead paint, common in pre-1980 homes. Requires testing and a licensed abatement contractor.",
  "major-roofing": "Roofing beyond a small localized repair. Needs an onsite evaluation.",
  "electrical-service": "Main service, panel or meter work. Requires a licensed electrician and utility coordination.",
  "sewer-septic": "Sewer or septic. Requires a licensed specialist and usually a camera inspection.",
  "hvac-replacement": "HVAC equipment replacement. Requires a licensed mechanical contractor.",
  gas: "Gas line work. Requires a licensed plumber and a pressure test.",
  "fire-damage": "Fire damage. Scope depends on a restoration assessment.",
  engineering: "Requires an engineer's letter or stamped detail.",
  "permit-uncertain": "May require a permit and inspection. Timeline depends on the jurisdiction.",
  concealed: "The extent is concealed. What is behind the finish decides the cost.",
  allowance: "Priced as a typical allowance for this kind of repair. The document does not state the extent, so the final figure is confirmed on site.",
  "incomplete-info": "The request does not say enough to price. More detail or a photo would settle it.",
  "out-of-scope": "Outside what Boise Remodeling Co. performs. We can help point you to the right trade.",
};

/**
 * Reasons that are priced anyway, with the caveat travelling alongside.
 *
 * MEASURED AGAINST A REAL RE-10. On an actual Idaho RE-10 with twenty requests,
 * routing every one of these to "needs an onsite visit" left six items priced
 * and the range covering under a third of the job. A tool that answers "come
 * and look" to most of a normal repair list is not an instant estimate.
 *
 * "concealed" was always in this set: a planning range for "some drywall behind
 * the leak" is useful as long as the caveat travels with it. The same logic
 * applies to a plainly ordinary repair whose extent nobody wrote down - a
 * hose-bib vacuum breaker is a known job whether or not the form says how many.
 *
 * NOTE the deliberate asymmetry: this covers a RECIPE that carries the reason
 * because its own scope is loose. It does NOT cover an item the extractor
 * flagged, which is the model saying "this text is not a defined repair" -
 * "ensure the lights work" is a diagnosis, not a job, and pricing it blind
 * would be inventing a scope the document never stated.
 */
export const PRICED_WITH_CAVEAT: readonly ReviewReason[] = ["concealed", "allowance"];

/**
 * A recipe component: one catalog code and how much of it a repair consumes.
 *
 * `per` multiplies the repair's own quantity. `flat` is added once regardless of
 * size, which is how set-up work is modelled - masking a room costs the same
 * whether the patch is one square foot or six.
 */
interface Component {
  /** Catalog code, or a base code whose -M and -L halves both apply. */
  code: string;
  /** Multiplier on the repair quantity. */
  per?: number;
  /** Fixed quantity, added once per repair item. */
  flat?: number;
  why?: string;
}

interface Recipe {
  trade: RepairTrade;
  label: string;
  unit: RepairUnit;
  /** Used when the document gives no measurement. Always flagged as assumed. */
  defaultQty: number;
  /** What one unit of this repair consumes. */
  components: Component[];
  /** Always route to a human, whatever the document says. */
  alwaysReview?: ReviewReason;
  /** Minutes of a tradesman's time, used for the labor-hours floor. */
  crewMinutes?: number;
}

/**
 * The repair kinds the estimator can price.
 *
 * Chosen from what actually appears on Idaho RE-10s and inspection responses,
 * and bounded by what this company performs. Anything an inspector writes that
 * does not map to one of these is not guessed at - it becomes an item for
 * manual review, which is the whole point of having a closed taxonomy.
 */
export type RepairKind =
  // drywall + paint
  | "drywall-patch"
  | "drywall-repaint-wall"
  | "interior-paint-room"
  | "exterior-paint-spot"
  // carpentry + millwork
  | "trim-repair"
  | "interior-door-adjust"
  | "interior-door-replace"
  | "door-hardware"
  | "cabinet-repair"
  | "handrail-repair"
  | "handrail-replace"
  | "stair-tread-repair"
  | "shelving-repair"
  // flooring
  | "flooring-patch"
  | "tile-repair"
  | "carpet-repair"
  // plumbing
  | "faucet-replace"
  | "toilet-repair"
  | "supply-valve-replace"
  | "drain-leak-repair"
  | "water-heater-replace"
  // electrical
  | "outlet-switch-replace"
  | "gfci-install"
  | "light-fixture-replace"
  | "smoke-detector"
  | "electrical-cover-plates"
  // exterior
  | "siding-repair"
  | "exterior-trim-repair"
  | "caulking-weatherproofing"
  | "deck-board-repair"
  | "deck-railing-repair"
  | "fence-gate-repair"
  | "gutter-repair"
  | "window-seal-repair"
  // roofing
  | "roof-minor-repair"
  // safety / misc
  | "safety-correction"
  | "general-minor-repair"
  | "chimney-repair"
  | "bath-exhaust-vent"
  | "crawlspace-vapor-barrier"
  | "crawlspace-insulation"
  | "crawlspace-cleanout"
  | "irrigation-repair"
  | "hose-bib-repair";

const R = (
  trade: RepairTrade,
  label: string,
  unit: RepairUnit,
  defaultQty: number,
  components: Component[],
  extra: Partial<Recipe> = {},
): Recipe => ({ trade, label, unit, defaultQty, components, ...extra });

/**
 * PROTECTION AND CLEAN-UP ON EVERY INTERIOR REPAIR.
 *
 * 03-02-04 Temp Protection and 03-02-07 Daily Clean are in the catalog because
 * real jobs incur them. On an occupied house being sold they are not optional:
 * floors get covered, furniture gets moved back, and the room is left clean for
 * a walkthrough. Costed per repair rather than per job so a longer list carries
 * proportionally more of it.
 */
const PROTECT: Component = { code: "03-02-04", flat: 60, why: "Floor and furniture protection, per work area" };
const CLEANUP: Component = { code: "03-02-07", flat: 0.12, why: "Clean-up and haul-out of debris" };

export const RECIPES: Record<RepairKind, Recipe> = {
  /* ---------------------------------------------------------- drywall */
  "drywall-patch": R("drywall", "Drywall patch and finish", "SF", 8, [
    PROTECT,
    // Cut out, replace, tape, float, sand. Materials at 1.35x the hole to
    // cover the feathered-out area a patch always needs.
    { code: "03-13-01", per: 1.35, why: "Board, tape and compound over the feathered area, not just the hole" },
    { code: "03-14-01", per: 1.6, why: "Prime, texture-match and paint out to a natural break" },
    CLEANUP,
  ], { crewMinutes: 95 }),

  "drywall-repaint-wall": R("drywall", "Drywall repair with full wall repaint", "SF", 12, [
    PROTECT,
    { code: "03-13-01", per: 1.35, why: "Board, tape and compound over the feathered area" },
    // Repainting the whole wall, not just the patch: quantity is the damaged
    // area, so the paint multiplier carries the rest of the wall.
    { code: "03-14-01", per: 6, why: "Full wall repainted corner to corner so the patch does not read" },
    CLEANUP,
  ], { crewMinutes: 150 }),

  /* ----------------------------------------------------------- paint */
  "interior-paint-room": R("painting", "Interior painting", "SF", 350, [
    PROTECT,
    { code: "03-14-01", per: 1, why: "Wall and ceiling area, primed and painted" },
    CLEANUP,
  ], { crewMinutes: 240 }),

  "exterior-paint-spot": R("painting", "Exterior paint touch-up", "SF", 80, [
    { code: "03-14-02", per: 1.2, why: "Scrape, prime and paint, feathered into sound coating" },
    CLEANUP,
  ], { crewMinutes: 100 }),

  /* ------------------------------------------------------- carpentry */
  "trim-repair": R("carpentry", "Trim and molding repair", "LF", 12, [
    PROTECT,
    { code: "03-18-02", per: 1.15, why: "Trim stock with cutting waste" },
    { code: "03-14-01", per: 1.2, why: "Prime and paint the replaced run" },
    CLEANUP,
  ], { crewMinutes: 75 }),

  "interior-door-adjust": R("carpentry", "Interior door adjustment", "EA", 1, [
    { code: "03-18-01-L", per: 0.5, why: "Plane, shim and rehang so it latches and swings true" },
    { code: "03-19-04", per: 0.5, why: "Strike plate and hardware adjustment" },
  ], { crewMinutes: 35 }),

  "interior-door-replace": R("carpentry", "Interior door replacement", "EA", 1, [
    PROTECT,
    { code: "03-18-01", per: 1, why: "Door slab or prehung unit, hung and cased" },
    { code: "03-19-04", per: 1, why: "Knob, hinges and strike" },
    { code: "03-14-01", per: 40, why: "Paint the new door and casing" },
    CLEANUP,
  ], { crewMinutes: 100 }),

  "door-hardware": R("carpentry", "Door hardware repair or replacement", "EA", 1, [
    { code: "03-19-04", per: 1, why: "Lockset, deadbolt or hinge set, fitted" },
  ], { crewMinutes: 30 }),

  "cabinet-repair": R("carpentry", "Cabinet repair", "EA", 1, [
    PROTECT,
    { code: "03-17-01-L", per: 0.6, why: "Door, drawer and box repair labor" },
    { code: "03-19-02", per: 2, why: "Hinges, slides and pulls as needed" },
    CLEANUP,
  ], { crewMinutes: 65 }),

  // "Secure the loose handrail" is the commonest RE-10 handrail line, and it is
  // a re-anchoring job: open up, find the stud, block it, refasten, touch up.
  // Priced against the railing MATERIAL rate it came out near a thousand
  // dollars, which is the cost of a new railing, not of fixing this one.
  "handrail-repair": R("carpentry", "Handrail repair and re-anchoring", "LF", 8, [
    { code: "03-21-01-L", per: 0.6, why: "Locate framing, block, refasten and make solid" },
    { code: "03-19-05", flat: 2, why: "Brackets and structural fasteners" },
    { code: "03-14-01", per: 0.8, why: "Touch up the disturbed finish" },
  ], { crewMinutes: 70 }),

  "handrail-replace": R("carpentry", "Handrail replacement", "LF", 8, [
    { code: "03-21-01", per: 1, why: "New rail, brackets and blocking, secured to framing" },
    { code: "03-14-01", per: 3, why: "Paint or finish the new rail" },
  ], { crewMinutes: 120 }),

  "stair-tread-repair": R("carpentry", "Stair tread or riser repair", "EA", 2, [
    PROTECT,
    { code: "03-18-02", per: 4, why: "Tread and riser stock" },
    { code: "03-14-01", per: 12, why: "Finish to match" },
    CLEANUP,
  ], { crewMinutes: 80 }),

  "shelving-repair": R("carpentry", "Shelving repair", "LF", 6, [
    { code: "03-19-03", per: 1, why: "Shelf hardware and standards, anchored" },
    { code: "03-18-02", per: 1, why: "Shelf stock" },
  ], { crewMinutes: 40 }),

  /* -------------------------------------------------------- flooring */
  "flooring-patch": R("flooring", "Flooring repair", "SF", 20, [
    PROTECT,
    { code: "03-15-02", per: 1.2, why: "Replacement flooring with cutting waste" },
    CLEANUP,
  ], { crewMinutes: 115 }),

  "tile-repair": R("flooring", "Tile repair", "SF", 10, [
    PROTECT,
    { code: "03-16-01", per: 1.25, why: "Tile, thinset and grout, with breakage allowance" },
    CLEANUP,
  ], { crewMinutes: 120 }),

  "carpet-repair": R("flooring", "Carpet repair or restretch", "SF", 60, [
    PROTECT,
    { code: "03-15-05", per: 1.1, why: "Carpet, pad and seaming" },
    CLEANUP,
  ], { crewMinutes: 80 }),

  /* -------------------------------------------------------- plumbing */
  "faucet-replace": R("plumbing", "Faucet replacement", "EA", 1, [
    PROTECT,
    { code: "03-10-03-M", per: 12, why: "Faucet and supply lines" },
    { code: "03-10-03-L", per: 10, why: "Removal, install and leak test" },
  ], { crewMinutes: 60 }),

  "toilet-repair": R("plumbing", "Toilet repair", "EA", 1, [
    PROTECT,
    { code: "03-10-03-M", per: 6, why: "Fill valve, flapper, seal and supply" },
    { code: "03-10-03-L", per: 8, why: "Pull, reset and test" },
  ], { crewMinutes: 50 }),

  "supply-valve-replace": R("plumbing", "Supply valve replacement", "EA", 1, [
    { code: "03-10-03-M", per: 4, why: "Angle stop and supply line" },
    { code: "03-10-03-L", per: 6, why: "Shut down, replace and test" },
  ], { crewMinutes: 40 }),

  "drain-leak-repair": R("plumbing", "Drain or supply leak repair", "EA", 1, [
    PROTECT,
    { code: "03-10-03-M", per: 8, why: "Fittings, trap and line" },
    { code: "03-10-03-L", per: 14, why: "Trace, repair and test" },
    { code: "03-13-01", per: 4, why: "Open and close the wall or ceiling if access is needed" },
    { code: "03-14-01", per: 6, why: "Paint the opened area" },
    CLEANUP,
  ], { crewMinutes: 210, alwaysReview: "concealed" }),

  "water-heater-replace": R("plumbing", "Water heater replacement", "EA", 1, [
    { code: "03-10-01", per: 1, why: "Water heater, pan, expansion tank and venting" },
    { code: "03-10-03-L", per: 30, why: "Removal, set, connect and test" },
    CLEANUP,
  ], { crewMinutes: 300, alwaysReview: "permit-uncertain" }),

  /* ------------------------------------------------------ electrical */
  "outlet-switch-replace": R("electrical", "Outlet or switch replacement", "EA", 1, [
    { code: "03-09-04-M", per: 3, why: "Device, plate and box as needed" },
    { code: "03-09-08-L", per: 4, why: "Replace, terminate and test" },
  ], { crewMinutes: 28 }),

  "gfci-install": R("electrical", "GFCI outlet installation", "EA", 1, [
    { code: "03-09-04-M", per: 5, why: "GFCI device and plate" },
    { code: "03-09-08-L", per: 5, why: "Install, verify protection downstream and test" },
  ], { crewMinutes: 35 }),

  "light-fixture-replace": R("electrical", "Light fixture replacement", "EA", 1, [
    PROTECT,
    { code: "03-09-06-M", per: 6, why: "Fixture and mounting hardware" },
    { code: "03-09-08-L", per: 6, why: "Remove, mount, wire and test" },
  ], { crewMinutes: 50 }),

  "smoke-detector": R("electrical", "Smoke or CO detector", "EA", 2, [
    { code: "03-09-04-M", per: 2.5, why: "Detector and mounting base" },
    { code: "03-09-08-L", per: 2, why: "Mount, connect and test" },
  ], { crewMinutes: 22 }),

  "electrical-cover-plates": R("electrical", "Missing cover plates and box repairs", "EA", 4, [
    { code: "03-09-04-M", per: 0.6, why: "Plates and box extenders" },
    { code: "03-09-08-L", per: 1, why: "Fit and make safe" },
  ], { crewMinutes: 15 }),

  /* -------------------------------------------------------- exterior */
  "siding-repair": R("exterior", "Siding repair", "SF", 32, [
    { code: "03-11-06", per: 1.2, why: "Siding and trim stock with cutting waste" },
    { code: "03-06-01", per: 1.1, why: "House wrap behind the repair" },
    { code: "03-14-02", per: 1.3, why: "Prime and paint to match" },
    CLEANUP,
  ], { crewMinutes: 155 }),

  "exterior-trim-repair": R("exterior", "Exterior trim repair", "LF", 16, [
    { code: "03-11-06", per: 1.2, why: "Trim stock with waste" },
    { code: "03-14-02", per: 2, why: "Prime and paint all faces" },
    CLEANUP,
  ], { crewMinutes: 95 }),

  "caulking-weatherproofing": R("exterior", "Caulking and weatherproofing", "LF", 40, [
    { code: "03-11-06-M", per: 0.15, why: "Sealant and backer rod" },
    { code: "03-11-06-L", per: 0.35, why: "Cut out failed sealant, prep and reseal" },
  ], { crewMinutes: 75 }),

  "deck-board-repair": R("exterior", "Deck board repair", "SF", 40, [
    { code: "03-22-02", per: 0.9, why: "Decking stock and fasteners" },
    { code: "03-14-02", per: 1, why: "Stain or seal the replaced boards" },
    CLEANUP,
  ], { crewMinutes: 160 }),

  // Repair, not replacement: refasten posts, replace failed balusters, bring
  // the assembly back to a solid guard. Full replacement is a different job and
  // a different number.
  "deck-railing-repair": R("exterior", "Deck railing repair", "LF", 16, [
    { code: "03-21-02-L", per: 0.7, why: "Refasten posts, replace failed balusters, make solid" },
    { code: "03-21-02-M", per: 0.3, why: "Replacement balusters, hardware and blocking" },
    { code: "03-14-02", per: 0.8, why: "Finish the replaced pieces" },
    CLEANUP,
  ], { crewMinutes: 140 }),

  "fence-gate-repair": R("exterior", "Fence or gate repair", "LF", 20, [
    { code: "03-11-06", per: 0.6, why: "Pickets, rails and hardware" },
    CLEANUP,
  ], { crewMinutes: 120 }),

  "gutter-repair": R("exterior", "Gutter and downspout repair", "LF", 30, [
    { code: "03-11-03", per: 1, why: "Gutter, hangers and sealant" },
    { code: "03-11-02", per: 0.3, why: "Downspout and extensions" },
    CLEANUP,
  ], { crewMinutes: 95 }),

  "window-seal-repair": R("exterior", "Window seal and flashing repair", "EA", 1, [
    { code: "03-11-06-M", per: 3, why: "Flashing, sealant and trim" },
    { code: "03-11-06-L", per: 5, why: "Remove trim, flash correctly and reseal" },
    { code: "03-14-02", per: 8, why: "Prime and paint disturbed trim" },
  ], { crewMinutes: 180, alwaysReview: "concealed" }),

  /* --------------------------------------------------------- roofing */
  "roof-minor-repair": R("roofing", "Minor roof repair", "SF", 32, [
    { code: "03-11-01", per: 1.3, why: "Shingles, underlayment and flashing with waste" },
    CLEANUP,
  ], { crewMinutes: 240, alwaysReview: "concealed" }),

  /* ---------------------------------------------------------- general */
  "safety-correction": R("general", "Safety correction", "EA", 1, [
    { code: "03-19-05", per: 1, why: "Hardware, guards or fasteners to make the condition safe" },
  ], { crewMinutes: 30 }),

  // Quantity here is the NUMBER of miscellaneous repairs, so every component
  // scales with it. Built from flat components it priced five repairs the same
  // as one, which would have been invisible in production because this kind is
  // always routed to review - a latent trap rather than a live bug, and worth
  // closing either way.
  "general-minor-repair": R("general", "General minor repair", "EA", 1, [
    { code: "03-02-04", per: 60, why: "Protection of each work area" },
    { code: "03-02-04", per: 25, why: "Materials allowance per small repair" },
    { code: "03-02-07", per: 0.12, why: "Clean-up and haul-out" },
  ], { crewMinutes: 60, alwaysReview: "allowance" }),

  /* ------------------------------------------------------------------
     ADDED AFTER TESTING AGAINST A REAL IDAHO RE-10.

     Seven of that document's twenty requests had no category and were
     dropped: chimney crown cracking, chimney cleaning, bathroom exhausts
     terminating in the attic instead of outside, crawlspace debris, a
     missing vapor barrier, uninsulated crawlspace floor, and an irrigation
     pump. None of these are exotic - three of them are the crawlspace, and
     nearly every older Boise house has one.
     ------------------------------------------------------------------ */

  "chimney-repair": R("exterior", "Chimney masonry repair", "SF", 18, [
    { code: "03-11-07-M", per: 1, why: "Mortar, crown patch and sealant" },
    { code: "03-11-07-L", per: 1.15, why: "Cut out failed mortar, repoint and reseal the crown" },
    { code: "03-02-04", flat: 90, why: "Roof access and staging" },
    CLEANUP,
  ], { crewMinutes: 210 }),

  "bath-exhaust-vent": R("general", "Bathroom exhaust vented outside", "EA", 1, [
    { code: "03-08-02", per: 1, why: "Duct, insulated run and exterior cap" },
    { code: "03-11-06", per: 4, why: "Cut in the exterior termination and make the siding good" },
    { code: "03-14-02", per: 6, why: "Patch and paint where the duct was opened up" },
    CLEANUP,
  ], { crewMinutes: 180 }),

  "crawlspace-vapor-barrier": R("general", "Crawlspace vapor barrier", "SF", 900, [
    { code: "03-12-01-M", per: 0.35, why: "6-mil sheeting, seam tape and fasteners" },
    { code: "03-12-01-L", per: 1, why: "Lay, lap and seal to piers and stem wall" },
    { code: "03-02-04", flat: 70, why: "Crawlspace access and protection" },
  ], { crewMinutes: 300 }),

  "crawlspace-insulation": R("general", "Crawlspace floor insulation", "SF", 900, [
    { code: "03-12-01-M", per: 1, why: "Batt insulation and supports" },
    { code: "03-12-01-L", per: 1.2, why: "Install between joists and retain" },
    { code: "03-02-04", flat: 70, why: "Crawlspace access and protection" },
  ], { crewMinutes: 330 }),

  "crawlspace-cleanout": R("general", "Crawlspace debris removal", "SF", 900, [
    { code: "03-03-04", per: 0.06, why: "Collect, bag and haul out debris" },
    { code: "03-02-04", flat: 70, why: "Crawlspace access, lighting and protection" },
    CLEANUP,
  ], { crewMinutes: 240 }),

  // A vacuum breaker or a replacement hose bib is a known, bounded job. It was
  // landing in the catch-all, which is a worse answer than naming it.
  "hose-bib-repair": R("plumbing", "Exterior hose bib or vacuum breaker", "EA", 2, [
    { code: "03-10-03-M", per: 5, why: "Vacuum breaker or replacement bib and fittings" },
    { code: "03-10-03-L", per: 6, why: "Fit, test for backflow and check for leaks" },
    CLEANUP,
  ], { crewMinutes: 70 }),

  "irrigation-repair": R("exterior", "Irrigation system repair", "EA", 1, [
    { code: "03-22-03-M", per: 0.11, why: "Pump, valves, heads and fittings as needed" },
    { code: "03-02-04", flat: 150, why: "Locate the fault, fit and commission" },
    CLEANUP,
  ], { crewMinutes: 180, alwaysReview: "allowance" }),
};

/* ------------------------------------------------------------ the request */

/** One repair the document asked for. */
export interface RepairItemInput {
  id: string;
  /** The request in the document's own words, kept verbatim for the admin view. */
  description: string;
  kind: RepairKind;
  /** Where in the home, when the document says. */
  location?: string;
  /** In the recipe's unit. Omit when the document gives no measurement. */
  quantity?: number | null;
  /** Inspection report reference, when the RE-10 cites one. */
  sourceRef?: string;
  /** Set when the extractor could not read the request cleanly. */
  needsReview?: ReviewReason;
  /** True when a photo was supplied for this item. Narrows the range. */
  hasPhoto?: boolean;
}

/** Everything about the property and the deal that changes the price. */
export interface Re10Context {
  occupancy?: "occupied" | "vacant" | "unknown";
  access?: "standard" | "limited" | "difficult";
  /** Days from today to the repair deadline. Drives the expedite uplift. */
  daysToDeadline?: number | null;
  /** True when the inspection report was supplied alongside the RE-10. */
  hasInspectionReport?: boolean;
}

/* -------------------------------------------------------------- economics */

/**
 * RE-10 work carries a 50% gross margin floor, against 30% on remodel projects.
 *
 * That is not opportunism. A remodel is one mobilization, one schedule and weeks
 * of continuous production. An inspection repair list is a dozen unrelated tasks
 * in an occupied house on somebody else's deadline, each with its own set-up,
 * its own material run, and a real chance of finding something worse once the
 * cover plate comes off. The margin difference is the cost of that fragmentation.
 */
export const RE10_TARGET_MARGIN = 0.5;

/** Never priced below this without an authorized admin adjustment. */
export const RE10_MARGIN_FLOOR = 0.5;

/** Highest the risk uplifts may carry the margin. */
export const RE10_MARGIN_CEILING = 0.62;

/** Contingency on an inspection list, above the 10% used on remodels. */
export const RE10_CONTINGENCY_RATE = 0.08;

/**
 * WHO ACTUALLY SHOWS UP. Minimums and mobilization are per crew, not per trade.
 *
 * This is the difference between a credible number and a silly one. A list with
 * a drywall patch, some trim, a caulk line and a repaint spans four "trades" on
 * paper, but it is one carpenter for one day. Charging four trade minimums and
 * four mobilizations for that would price the company out of exactly the
 * multi-item lists it is pitching for, which is the failure mode the brief
 * warns about.
 *
 * Only work that genuinely needs a different licensed person gets its own crew:
 * plumbing, electrical and roofing. Everything else is the general repair crew,
 * who can hang a door, patch drywall, paint it and reseal a window in one trip.
 */
export type RepairCrew = "general" | "plumbing" | "electrical" | "roofing";

export const CREW_FOR_TRADE: Record<RepairTrade, RepairCrew> = {
  carpentry: "general",
  drywall: "general",
  painting: "general",
  flooring: "general",
  exterior: "general",
  general: "general",
  plumbing: "plumbing",
  electrical: "electrical",
  roofing: "roofing",
};

export const CREW_LABELS: Record<RepairCrew, string> = {
  general: "General repair crew",
  plumbing: "Licensed plumber",
  electrical: "Licensed electrician",
  roofing: "Roofing crew",
};

/**
 * THE MINIMUM IS A PRICE, NOT A COST.
 *
 * This started as a cost floor, which was wrong and expensive. A $465 cost
 * minimum for an electrician, marked up through a 50% margin, quoted $1,505 to
 * replace one light switch against a Boise market of roughly $100-250. A trade
 * minimum in the real world is what you CHARGE to show up, so it belongs after
 * the margin, not before it.
 *
 * These sit deliberately above the handyman market, which runs $75-200 for a
 * minimum call. Boise Remodeling Co. is a licensed, insured contractor turning
 * up on a transaction deadline with photo documentation and a warranty, and that
 * is not the same product as an hourly handyman. But it is a premium, not a
 * multiple.
 */
export const CREW_MINIMUM_PRICE: Record<RepairCrew, number> = {
  general: 245,
  plumbing: 275,
  electrical: 255,
  roofing: 450,
};

/**
 * Below this, a standalone job is not worth the disruption.
 *
 * Not a price - a decision. A single small repair at the minimum still occupies
 * a scheduling slot, a drive and an admin file. The estimator surfaces this to
 * the team rather than to the customer, so a one-item RE-10 can be taken as a
 * favor to an agent who brings the next five, or declined, as a judgement call
 * rather than by accident.
 */
export const WORTHWHILE_JOB_PRICE = 400;

/** How long a quoted figure is held. Long enough to clear a repair deadline. */
export const QUOTE_VALID_DAYS = 30;

/**
 * The catalog is a HIGH-END rate card. Repairs are not high-end work.
 *
 * This was established when the main estimator was calibrated: the owner's
 * workbook prices high-end finishes, which is why QUALITY_RATE_FACTOR scales it
 * down for mid-range projects. RE-10 work is further down again - the job is to
 * match what is already there, in a house being sold, to builder-grade. Applying
 * the card unadjusted priced inspection patches at luxury-remodel rates.
 *
 * Materials take the bigger correction because that is where the grade lives:
 * stock trim against custom millwork. Labor moves less, because the hours are
 * the hours and a repair often takes LONGER per unit than new work.
 */
export const REPAIR_GRADE_MATERIAL_FACTOR = 0.58;
export const REPAIR_GRADE_LABOUR_FACTOR = 0.82;

/**
 * PER-DIVISION GRADE FACTORS, because one global factor cannot be right.
 *
 * A single pair of material/labor factors was the second version of this and it
 * failed against the market: every one of the 32 priceable repair kinds came out
 * over its band, from 114% to 535%. The reason is that the catalog's divisions
 * are not uniformly inflated relative to repair work.
 *
 * Interior paint is the extreme case. The card carries $6.00 per square foot
 * installed, which is a high-end multi-coat finish with full prep. Repainting a
 * wall so a patch does not show costs closer to $1.40 a foot, so the correction
 * there is roughly a quarter. Door hardware is the opposite: $95 to fit a
 * lockset is already close to what the work costs, so it barely moves.
 *
 * Each factor below is set from the researched market band for that category and
 * held there by verify:re10, which prices every kind and fails if any lands
 * outside its band. Changing a factor without re-running that check is how this
 * silently drifts back.
 */
export const REPAIR_GRADE_BY_DIVISION: Record<string, number> = {
  // Card is a high-end finish rate; repair repaint is a fraction of it.
  "PAINTING + WALLPAPER": 0.17,
  // Patch work uses partial sheets and small batches of compound.
  DRYWALL: 0.34,
  FLOORING: 0.24,
  "TILE + STONE": 0.3,
  "COUNTERTOPS + CABINETRY": 0.32,
  // Doors and trim are close to trade rate already.
  "INTERIOR DOORS + MILLWORK": 0.5,
  // Hardware is nearly at cost on the card.
  "HARDWARE + GLASS": 0.72,
  ELECTRICAL: 0.42,
  PLUMBING: 0.42,
  "EXTERIOR FINISHES": 0.4,
  "ENVELOPE PROTECTION": 0.5,
  // Railings on the card are custom metal and millwork rates.
  "SPECIALTY ELEMENTS": 0.3,
  LANDSCAPE: 0.32,
  // Protection and clean-up: a repair protects one room, not a whole site.
  "SITE REQUIREMENTS": 0.35,
};

/** Used for any division without an explicit factor above. */
export const REPAIR_GRADE_DEFAULT_FACTOR = 0.42;

/** Cost of putting one crew on site, per crew that has to attend. */
export const MOBILIZATION_COST = 70;

/**
 * Mobilizations are shared, not charged per repair.
 *
 * Eight repairs handled by two crews is two trips, not eight. The first crew on
 * site carries a full mobilization and each additional crew carries a reduced
 * one, because they overlap on the same days and share one access arrangement.
 */
export const ADDITIONAL_TRADE_MOBILIZATION_FACTOR = 0.55;

/** Per-item coordination: scheduling, access, updates, documentation. */
export const COORDINATION_COST_PER_ITEM = 11;

/** Cost of the blended crew hour used for the labor floor. */
export const CREW_HOURLY_COST = 56;

/**
 * WHAT THE MARKET CHARGES, per repair kind, at the recipe's default quantity.
 *
 * These are researched installed-price bands for the Treasure Valley and the
 * national guides, for a standalone job. They exist so the engine can be held to
 * them: verify:re10 prices every kind and fails if any lands outside its band.
 * Without this the estimator drifts, and the drift is invisible until an agent
 * stops returning calls.
 *
 * Boise Remodeling Co. should sit in the UPPER half of each band. It is a
 * licensed, insured contractor arriving on a closing deadline with photo
 * documentation and a warranty, and that is worth more than the cheapest number
 * on a lead-gen site. It is not worth a multiple of the band, which is where
 * this engine started.
 */
export const MARKET_PRICE_BAND: Partial<Record<RepairKind, [number, number]>> = {
  "drywall-patch": [180, 450],
  "drywall-repaint-wall": [350, 750],
  "interior-paint-room": [400, 1100],
  "exterior-paint-spot": [220, 600],
  "trim-repair": [180, 450],
  "interior-door-adjust": [120, 300],
  "interior-door-replace": [420, 850],
  "door-hardware": [140, 350],
  "cabinet-repair": [150, 620],
  "handrail-repair": [180, 500],
  "handrail-replace": [380, 900],
  "stair-tread-repair": [200, 550],
  "shelving-repair": [120, 350],
  "flooring-patch": [150, 600],
  "tile-repair": [180, 600],
  "carpet-repair": [150, 500],
  "faucet-replace": [160, 450],
  "toilet-repair": [120, 350],
  "hose-bib-repair": [150, 450],
  "chimney-repair": [400, 950],
  "bath-exhaust-vent": [350, 750],
  "crawlspace-vapor-barrier": [600, 1500],
  "crawlspace-insulation": [1200, 2800],
  "crawlspace-cleanout": [400, 1100],
  "irrigation-repair": [250, 700],
  "supply-valve-replace": [110, 300],
  "outlet-switch-replace": [110, 300],
  "gfci-install": [110, 350],
  "light-fixture-replace": [150, 420],
  "smoke-detector": [110, 300],
  "electrical-cover-plates": [90, 260],
  "siding-repair": [280, 750],
  "exterior-trim-repair": [200, 550],
  "caulking-weatherproofing": [160, 450],
  "deck-board-repair": [600, 1500],
  "deck-railing-repair": [320, 850],
  "fence-gate-repair": [280, 900],
  "gutter-repair": [120, 480],
  "safety-correction": [110, 300],
};

/* ------------------------------------------------------------- estimating */

export interface PricedRepair {
  input: RepairItemInput;
  recipe: Recipe;
  trade: RepairTrade;
  quantity: number;
  /** True when no measurement was given and defaultQty was used. */
  quantityAssumed: boolean;
  /** True when a supplied measurement exceeded the sane ceiling for the kind
      and was clamped - the quote must say so, and the alert hook must fire. */
  quantityClamped: boolean;
  lines: CostLine[];
  /** Sum of `lines`, before minimums, mobilization and margin. */
  directCost: number;
  crewMinutes: number;
  reviewReason?: ReviewReason;
}

export interface TradeGroup {
  trade: RepairTrade;
  label: string;
  /** Which crew actually attends. Minimums and mobilization are resolved here. */
  crew: RepairCrew;
  repairs: PricedRepair[];
  /** Sum of the repairs' own line items. */
  rawCost: number;
  /** Raised to the trade minimum where the raw cost falls short. */
  adjustedCost: number;
  minimumApplied: number;
  mobilization: number;
  /** adjustedCost + mobilization. */
  tradeCost: number;
  customerAmount: number;
}

export interface Re10Estimate {
  /** Items priced automatically. */
  priced: PricedRepair[];
  /** Items deliberately not priced, with the reason. */
  review: { input: RepairItemInput; reason: ReviewReason; text: string }[];
  trades: TradeGroup[];
  directCost: number;
  minimumsApplied: number;
  mobilization: number;
  coordination: number;
  contingency: number;
  totalInternalCost: number;
  /** The margin the pricing logic targeted. */
  appliedMargin: number;
  /** What the margin actually came out at once the minimum visit price applied. */
  realisedMargin: number;
  /** Amount the minimum visit price added on top of cost-plus-margin. */
  minimumPriceApplied: number;
  /** Below WORTHWHILE_JOB_PRICE this is a judgement call, not an automatic yes. */
  worthwhile: boolean;
  /** Reasons the margin sits above the 50% floor. */
  marginUplifts: string[];
  sellingPrice: number;
  /** The firm figure shown to the customer. See the note where it is set. */
  quotedPrice: number;
  quoteValidDays: number;
  grossProfit: number;
  /** Customer-facing planning range. */
  low: number;
  high: number;
  /** Half-width of the range as a fraction of the center. */
  bandWidth: number;
  confidence: "high" | "medium" | "low";
  /** What is making the range as wide as it is. */
  uncertainty: string[];
  assumptions: string[];
  warnings: EstimateWarning[];
}

function lineFor(li: LineItem, quantity: number, why?: string): CostLine {
  // Grade adjustment, applied to the unit cost so the admin view shows the rate
  // actually used rather than the card rate with a hidden correction after it.
  const factor = REPAIR_GRADE_BY_DIVISION[li.division] ?? REPAIR_GRADE_DEFAULT_FACTOR;
  const unitCost = li.cost * factor;
  return {
    code: li.code,
    division: li.division,
    description: li.description,
    type: li.type as CostType,
    uom: li.uom as Uom,
    quantity,
    unitCost,
    cost: unitCost * quantity,
    assumption: why,
  };
}

/**
 * Expand a component's code into its catalog rows.
 *
 * A bare code such as "03-13-01" means both halves of a split row: materials
 * AND labor. An explicit "-M" or "-L" means only that half, which is how a
 * recipe asks for labor with no material (rehanging a door) or material with
 * no labor of its own.
 */
const BY_CODE = new Map(LINE_ITEMS.map((li) => [li.code, li]));

function rowsFor(code: string): LineItem[] {
  if (/-[ML]$/.test(code)) return [item(code)];
  const halves = [BY_CODE.get(`${code}-M`), BY_CODE.get(`${code}-L`)].filter(
    (li): li is LineItem => li != null,
  );
  // item() throws on an unknown code, so a typo in a recipe fails loudly here
  // rather than quietly pricing zero.
  return halves.length > 0 ? halves : [item(code)];
}

/**
 * Price one repair: expand the recipe against the quantity.
 *
 * Returns the labor-hours floor alongside, because a repair whose catalog cost
 * is trivially small still consumes a tradesman's afternoon, and the group-level
 * minimum needs to know that.
 */
/**
 * The largest quantity a single RE-10 line can plausibly carry, per unit.
 *
 * The request schema's cap (100,000) exists to bound the payload, not the
 * price: 100,000 EA interior doors validated cleanly and quoted $58.7M, and
 * that number went to the customer's inbox and the CRM. A real repair
 * addendum tops out around a house's worth of any one repair, so the ceiling
 * is generous against every legitimate document and hostile to a typo or a
 * crafted request. Clamped quantities are flagged so the quote says so.
 */
export function maxQuantityFor(kind: RepairKind): number {
  const r = RECIPES[kind];
  switch (r.unit) {
    case "EA":
      return Math.max(20, r.defaultQty * 10);
    case "LF":
      return Math.max(600, r.defaultQty * 25);
    case "SF":
      return Math.max(3000, r.defaultQty * 25);
  }
}

export function priceRepair(input: RepairItemInput): PricedRepair {
  const recipe = RECIPES[input.kind];
  // No measurement, a non-number, or a token below any real measurement
  // (0.0001 "square feet") all mean the same thing: price the typical size
  // and say the size was assumed.
  const quantityAssumed =
    input.quantity == null || !Number.isFinite(input.quantity) || input.quantity < 0.1;
  const maxQty = maxQuantityFor(input.kind);
  const supplied = quantityAssumed ? recipe.defaultQty : (input.quantity as number);
  const quantityClamped = supplied > maxQty;
  const quantity = quantityClamped ? maxQty : supplied;

  const lines: CostLine[] = [];
  for (const c of recipe.components) {
    const qty = c.flat != null ? c.flat : (c.per ?? 1) * quantity;
    if (qty <= 0) continue;
    for (const li of rowsFor(c.code)) lines.push(lineFor(li, qty, c.why));
  }

  const directCost = lines.reduce((s, l) => s + l.cost, 0);
  const reviewReason = input.needsReview ?? recipe.alwaysReview;

  return {
    input,
    recipe,
    trade: recipe.trade,
    quantity,
    quantityAssumed,
    quantityClamped,
    lines,
    directCost,
    crewMinutes: (recipe.crewMinutes ?? 60) * (quantityAssumed ? 1 : Math.max(1, quantity / recipe.defaultQty)),
    reviewReason,
  };
}

/**
 * Risk uplifts above the 50% floor.
 *
 * Each is a real cost driver rather than a mood: an occupied house means working
 * around people and their belongings, a short fuse means paying to jump the
 * queue, and a one-item trade visit means the drive is not shared with anything.
 * Capped so the total stays inside RE10_MARGIN_CEILING.
 */
function resolveMargin(
  ctx: Re10Context,
  tradeCount: number,
  itemCount: number,
): { margin: number; uplifts: string[] } {
  let margin = RE10_TARGET_MARGIN;
  const uplifts: string[] = [];

  const days = ctx.daysToDeadline;
  if (days != null && days >= 0 && days <= 7) {
    margin += 0.05;
    uplifts.push("Repair deadline inside a week: schedule is bought, not planned.");
  } else if (days != null && days > 7 && days <= 14) {
    margin += 0.025;
    uplifts.push("Repair deadline inside two weeks: limited scheduling flexibility.");
  }

  if (ctx.occupancy === "occupied") {
    margin += 0.02;
    uplifts.push("Occupied property: work around occupants, daily protection and reset.");
  }
  if (ctx.access === "difficult") {
    margin += 0.03;
    uplifts.push("Difficult access: longer set-up and restricted working hours.");
  } else if (ctx.access === "limited") {
    margin += 0.015;
    uplifts.push("Limited access: coordination around lockbox or showing windows.");
  }

  if (tradeCount >= 3) {
    margin += 0.02;
    uplifts.push(`${tradeCount} separate crews to coordinate on one deadline.`);
  }
  if (itemCount >= 10) {
    margin += 0.015;
    uplifts.push(`${itemCount} separate repair items to schedule, track and document.`);
  }

  return { margin: Math.min(margin, RE10_MARGIN_CEILING), uplifts };
}

/**
 * Range width from how much the documents actually pinned down.
 *
 * A complete RE-10 with an inspection report, measurements and photos earns a
 * narrow band. A list of one-line requests with no numbers does not, and
 * pretending otherwise would be the same mistake as quoting a single figure.
 */
function resolveBand(
  priced: PricedRepair[],
  ctx: Re10Context,
): { band: number; confidence: "high" | "medium" | "low"; uncertainty: string[] } {
  if (priced.length === 0) return { band: 0.2, confidence: "low", uncertainty: [] };

  const assumed = priced.filter((p) => p.quantityAssumed);
  const assumedShare = assumed.length / priced.length;
  const photoShare = priced.filter((p) => p.input.hasPhoto).length / priced.length;

  let band = 0.14;
  const uncertainty: string[] = [];

  if (assumedShare > 0) {
    band += assumedShare * 0.16;
    const names = assumed.slice(0, 4).map((p) => p.recipe.label.toLowerCase());
    uncertainty.push(
      `${assumed.length} of ${priced.length} items gave no measurement, so a typical size was assumed` +
        (names.length ? ` (${names.join(", ")})` : "") +
        ". A measurement or a photo would tighten these.",
    );
  }
  if (photoShare < 0.5) {
    band += 0.05;
    uncertainty.push("Fewer than half the items have a photo. Photos are the single fastest way to narrow this range.");
  }
  if (!ctx.hasInspectionReport) {
    band += 0.04;
    uncertainty.push("The inspection report was not supplied, so the findings behind each request are unverified.");
  }
  if (ctx.access === "difficult" || ctx.occupancy === "unknown") {
    band += 0.02;
    uncertainty.push("Property access and occupancy affect scheduling and set-up cost.");
  }

  band = Math.min(band, 0.34);
  const confidence = band <= 0.18 ? "high" : band <= 0.26 ? "medium" : "low";
  return { band, confidence, uncertainty };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function stepFor(center: number): number {
  return center >= 25000 ? 500 : center >= 8000 ? 250 : 100;
}

/**
 * Price a whole RE-10 list.
 *
 * Order matters and is deliberate: line items, then trade minimums, then a
 * shared mobilization, then coordination, then contingency, then margin once
 * over the total. Applying margin per line, or per parent and child separately,
 * is the double-count the brief warns about - so it is applied exactly once, to
 * the finished cost.
 */
export function estimateRe10(
  items: RepairItemInput[],
  ctx: Re10Context = {},
): Re10Estimate {
  const warnings: EstimateWarning[] = [];
  const review: Re10Estimate["review"] = [];
  const priced: PricedRepair[] = [];

  for (const input of items) {
    if (!RECIPES[input.kind]) {
      review.push({ input, reason: "out-of-scope", text: REVIEW_REASON_TEXT["out-of-scope"] });
      continue;
    }
    const p = priceRepair(input);
    // An item flagged for review is reported, never silently priced - unless its
    // reason is one that prices anyway with the caveat attached. See
    // PRICED_WITH_CAVEAT for why that set is what it is.
    if (p.reviewReason && !PRICED_WITH_CAVEAT.includes(p.reviewReason)) {
      review.push({ input, reason: p.reviewReason, text: REVIEW_REASON_TEXT[p.reviewReason] });
      continue;
    }
    priced.push(p);
  }

  /* Group by trade and apply the per-trade minimum. */
  const byTrade = new Map<RepairTrade, PricedRepair[]>();
  for (const p of priced) {
    const list = byTrade.get(p.trade) ?? [];
    list.push(p);
    byTrade.set(p.trade, list);
  }

  const tradeOrder: RepairTrade[] = [
    "carpentry", "drywall", "painting", "flooring",
    "plumbing", "electrical", "exterior", "roofing", "general",
  ];
  const activeTrades = tradeOrder.filter((t) => byTrade.has(t));

  /* Minimums and mobilization are resolved per CREW, then distributed back over
     the trades that crew covered, so the customer-facing rollup still reads by
     trade while the economics reflect who actually drives to the house. */
  const crewOrder: RepairCrew[] = ["general", "plumbing", "electrical", "roofing"];
  const byCrew = new Map<RepairCrew, RepairTrade[]>();
  for (const trade of activeTrades) {
    const crew = CREW_FOR_TRADE[trade];
    byCrew.set(crew, [...(byCrew.get(crew) ?? []), trade]);
  }
  const activeCrews = crewOrder.filter((c) => byCrew.has(c));

  const tradeAdjustment = new Map<RepairTrade, { minimum: number; mobilization: number }>();
  let minimumsApplied = 0;
  let mobilization = 0;

  activeCrews.forEach((crew, index) => {
    const crewTrades = byCrew.get(crew)!;
    const crewRepairs = crewTrades.flatMap((t) => byTrade.get(t)!);
    const rawCost = crewRepairs.reduce((s, p) => s + p.directCost, 0);

    // The only COST floor is the one that is genuinely a cost: the hours the
    // work actually takes at crew rate. A four-square-foot patch billed off a
    // per-square-foot card is thirty dollars of labor for half a day's work,
    // and no amount of margin fixes an understated cost.
    //
    // The trade MINIMUM is not applied here. It is a price, and it is applied
    // to the finished price further down.
    const crewHours = crewRepairs.reduce((s, p) => s + p.crewMinutes, 0) / 60;
    const laborFloor = crewHours * CREW_HOURLY_COST;

    const topUp = Math.max(0, laborFloor - rawCost);
    minimumsApplied += topUp;

    // First crew on site pays a full mobilization; the rest overlap with it.
    const mob = index === 0 ? MOBILIZATION_COST : MOBILIZATION_COST * ADDITIONAL_TRADE_MOBILIZATION_FACTOR;
    mobilization += mob;

    // Split the crew's top-up and mobilization across its trades by cost share,
    // so no trade shows a number that did not come from its own work.
    for (const t of crewTrades) {
      const tradeRaw = byTrade.get(t)!.reduce((s, p) => s + p.directCost, 0);
      const share = rawCost > 0 ? tradeRaw / rawCost : 1 / crewTrades.length;
      tradeAdjustment.set(t, { minimum: topUp * share, mobilization: mob * share });
    }
  });

  const trades: TradeGroup[] = activeTrades.map((trade) => {
    const repairs = byTrade.get(trade)!;
    const rawCost = repairs.reduce((s, p) => s + p.directCost, 0);
    const adj = tradeAdjustment.get(trade) ?? { minimum: 0, mobilization: 0 };
    const adjustedCost = rawCost + adj.minimum;
    return {
      trade,
      label: TRADE_LABELS[trade],
      crew: CREW_FOR_TRADE[trade],
      repairs,
      rawCost,
      adjustedCost,
      minimumApplied: adj.minimum,
      mobilization: adj.mobilization,
      tradeCost: adjustedCost + adj.mobilization,
      customerAmount: 0, // filled once the margin is known
    };
  });

  const directCost = trades.reduce((s, t) => s + t.adjustedCost, 0);
  const coordination = priced.length * COORDINATION_COST_PER_ITEM;
  const preContingency = directCost + mobilization + coordination;
  const contingency = preContingency * RE10_CONTINGENCY_RATE;
  const totalInternalCost = preContingency + contingency;

  // Crews, not trades: coordinating one carpenter across four trades is not the
  // same problem as coordinating a carpenter, a plumber and an electrician.
  const { margin, uplifts } = resolveMargin(ctx, activeCrews.length, priced.length);
  const pricedAtMargin = totalInternalCost > 0 ? priceAtMargin(totalInternalCost, margin) : 0;

  // THE MINIMUM VISIT PRICE, applied to the finished number.
  //
  // Every crew that has to attend carries one. Charging one switch at cost plus
  // margin is $130 and does not pay for the morning; charging it at a marked-up
  // cost minimum was $1,505 and does not win the job. The floor is what the
  // visit is worth, and it binds only when the work itself does not reach it.
  const minimumPrice = activeCrews.reduce((s, c) => s + CREW_MINIMUM_PRICE[c], 0);
  const sellingPrice = Math.max(pricedAtMargin, minimumPrice);
  const minimumPriceApplied = sellingPrice - pricedAtMargin;

  /**
   * THE QUOTE MUST NOT ROUND THROUGH A FLOOR.
   *
   * Rounding used to happen at the very end, on its own, which quietly undid
   * every guard above it: a small list whose selling price cleared the 50%
   * margin floor by a few dollars rounded DOWN a whole step and landed at a
   * 43% margin, and two-crew lists rounded below the sum of the minimum visit
   * prices. Nearly a quarter of sampled small lists breached the floor this
   * way, invisibly, because the verifier asserted on sellingPrice while the
   * customer, the email, and the CRM all carried quotedPrice.
   *
   * floorPrice is the lowest number the business may utter: the crew visit
   * minimums, or the price at which the realised margin is exactly the floor,
   * whichever is higher. If nearest-step rounding lands below it, round UP to
   * the next step instead. Rounding above the selling price is fine - it is a
   * few dollars of extra margin - rounding below a floor is a policy breach.
   */
  const step = stepFor(sellingPrice);
  const floorPrice = Math.max(minimumPrice, totalInternalCost / (1 - RE10_MARGIN_FLOOR));
  let quotedPrice = sellingPrice > 0 ? roundTo(sellingPrice, step) : 0;
  if (sellingPrice > 0 && quotedPrice < floorPrice) {
    quotedPrice = Math.ceil(floorPrice / step) * step;
  }

  // Profit and realised margin are reported on the number we actually quote,
  // not the pre-rounding selling price - the CRM told the team "50.0%" while
  // the invoice would have collected 42.8%.
  const grossProfit = quotedPrice - totalInternalCost;
  const realisedMargin = quotedPrice > 0 ? grossProfit / quotedPrice : margin;

  // Customer amounts per trade are the selling price split by each trade's share
  // of cost. Splitting the priced total, rather than pricing each trade
  // independently, is what stops the parts from disagreeing with the whole.
  const tradeCostTotal = trades.reduce((s, t) => s + t.tradeCost, 0);
  for (const t of trades) {
    t.customerAmount = tradeCostTotal > 0 ? sellingPrice * (t.tradeCost / tradeCostTotal) : 0;
  }

  const { band, confidence, uncertainty } = resolveBand(priced, ctx);
  const low = sellingPrice > 0 ? roundTo(sellingPrice * (1 - band), step) : 0;
  const high = sellingPrice > 0 ? roundTo(sellingPrice * (1 + band), step) : 0;

  const assumptions: string[] = [];
  const assumedCount = priced.filter((p) => p.quantityAssumed).length;
  if (assumedCount > 0) {
    assumptions.push(
      `${assumedCount} repair${assumedCount === 1 ? "" : "s"} had no measurement in the documents, so a typical size for that repair was assumed.`,
    );
  }
  const clampedItems = priced.filter((p) => p.quantityClamped);
  if (clampedItems.length > 0) {
    assumptions.push(
      `${clampedItems.length} repair${clampedItems.length === 1 ? "" : "s"} listed a measurement larger than this kind of repair plausibly runs, so ${clampedItems.length === 1 ? "it was" : "they were"} priced at the largest realistic size. Confirmed at the walkthrough.`,
    );
    warnings.push({
      severity: "warn",
      message: `Quantity clamped on ${clampedItems.map((p) => p.recipe.label).join(", ")}: the supplied measurement exceeded the sane ceiling for the repair kind. Verify against the document.`,
    });
  }
  // Items priced despite carrying a caveat have to say so. Pricing something
  // whose extent the document never defined and then presenting it like a
  // measured item is worse than refusing to price it at all.
  const allowanceCount = priced.filter((p) => p.reviewReason).length;
  if (allowanceCount > 0) {
    assumptions.push(
      `${allowanceCount} repair${allowanceCount === 1 ? " is" : "s are"} included at a typical allowance because the documents do not state the extent. ${allowanceCount === 1 ? "It is" : "They are"} confirmed at the walkthrough.`,
    );
  }
  if (activeTrades.length > 1) {
    assumptions.push(
      `Repairs across ${activeTrades.length} trades are scheduled together where possible, so travel and set-up are shared rather than charged per item.`,
    );
  }
  // "One mobilization per trade" is what this means internally, and it is what
  // this line used to say. It is trade jargon to an agent, and it points at our
  // cost structure rather than at anything they can act on.
  assumptions.push("Each trade completes its work in a single visit, with normal access during working hours.");
  assumptions.push("Finishes are matched as closely as stock allows; an exact match to aged paint or flooring is not guaranteed.");
  if (ctx.occupancy === "occupied") {
    assumptions.push("The property is occupied, so areas are protected and reset each day.");
  }

  if (review.length > 0) {
    warnings.push({
      severity: "warn",
      message: `${review.length} item${review.length === 1 ? "" : "s"} could not be priced from the documents and need an onsite evaluation.`,
    });
  }
  if (priced.length === 0) {
    warnings.push({
      severity: "warn",
      message: "Nothing on this list could be priced automatically. An onsite evaluation is the right next step.",
    });
  }
  if (sellingPrice > 0 && sellingPrice < WORTHWHILE_JOB_PRICE) {
    warnings.push({
      severity: "info",
      message:
        `At ${Math.round(sellingPrice)} this sits below the ${WORTHWHILE_JOB_PRICE} mark where a standalone visit ` +
        "pays for itself. Worth taking for an agent who brings more work, worth declining otherwise. Internal note only.",
    });
  }
  if (minimumPriceApplied > 0) {
    warnings.push({
      severity: "info",
      message:
        `The minimum visit price added ${Math.round(minimumPriceApplied)}: the work itself does not fill a trip. ` +
        "Bundling more of the repair list into the same visit is what makes this efficient.",
    });
  }
  if (margin < RE10_MARGIN_FLOOR) {
    warnings.push({ severity: "warn", message: "Margin fell below the 50% floor. This should not happen without an admin adjustment." });
  }

  return {
    priced,
    review,
    trades,
    directCost,
    minimumsApplied,
    mobilization,
    coordination,
    contingency,
    totalInternalCost,
    appliedMargin: margin,
    realisedMargin,
    minimumPriceApplied,
    worthwhile: sellingPrice >= WORTHWHILE_JOB_PRICE,
    marginUplifts: uplifts,
    sellingPrice,
    grossProfit,
    /**
     * THE NUMBER WE ACTUALLY QUOTE.
     *
     * A range lost both ways. An agent writing a repair addendum anchored on
     * the low end and treated it as the price, while the high end made us look
     * expensive to anyone comparing - so we earned the bottom of the range and
     * were judged on the top of it. And a spread of that width is not usable:
     * nobody can put "$3,800 to $7,800" in a counteroffer, which is the whole
     * job the agent is trying to do.
     *
     * The width was never uncertainty about PRICE anyway. It was uncertainty
     * about SCOPE, and scope is answered by naming what is excluded, not by
     * padding a number. So the excluded items are listed explicitly, the
     * assumed quantities are stated inline where the price depends on them,
     * and what is left is a firm figure.
     *
     * Deliberately NOT uplifted for the risk of quoting firm. We are already
     * better off than a range whose low end was doing the anchoring, and the
     * protection belongs in the stated assumptions rather than in padding that
     * would push us out of the market bands.
     *
     * Rounded to a step above, WITH the floor guard - see the quotedPrice
     * computation next to floorPrice.
     */
    quotedPrice,
    /** Held this long, so the quote bounds our exposure and their deadline. */
    quoteValidDays: QUOTE_VALID_DAYS,
    low,
    high,
    bandWidth: band,
    confidence,
    uncertainty,
    assumptions,
    warnings,
  };
}
