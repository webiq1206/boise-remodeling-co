/**
 * The scope graph: how a homeowner's selections become a takeoff.
 *
 * Each project type owns a rule set. A rule names a catalog cost code, says how
 * much of it the project needs in that code's own unit of measure, and may be
 * conditional on what the homeowner selected. The engine prices them.
 *
 * The point of writing scope this way rather than as a per-square-foot rate is
 * that dependencies become explicit and checkable. Moving plumbing pulls in a
 * permit; opening a wall pulls in drywall on that wall; supplying your own
 * appliances removes the appliance material line but keeps the install labor.
 *
 * ONE THING TO UNDERSTAND ABOUT THE SOURCE RATES. Several catalog lines are
 * published per square foot but are really WHOLE-DWELLING averages: plumbing at
 * $10/SF installed is a sensible rate across a whole house and a nonsense rate
 * applied to a bathroom floor, where a single rough-in runs $4,000 to $5,000
 * against 80 square feet. Those lines therefore carry an explicit intensity
 * factor per project type, converting room area into equivalent whole-dwelling
 * area. Every factor is named, defaulted to 1, and justified where it is not.
 */
import type { Dimensions, ScopeRule, ScopeSelections } from "./engine";

/* ------------------------------------------------------ shared derivations */

export const BASELINE_SQFT: Record<string, number> = {
  kitchen: 250,
  bathroom: 80,
  "whole-home": 1800,
  addition: 400,
  adu: 600,
  basement: 900,
};

/**
 * Weeks on site, by project type and size. Drives every monthly line in the
 * catalog (dumpster, temp restroom, insurance, site storage, daily clean) and
 * the design-build team's hours, so it is stated once rather than guessed per
 * rule. Calibrated against the construction windows the company publishes on
 * its own cost guide pages: kitchens 8-16 weeks, baths 4-8, whole-home 4-12
 * months, additions 4-9 months, ADUs 6-12 months.
 */
const BASE_WEEKS: Record<string, number> = {
  kitchen: 9,
  bathroom: 5,
  "whole-home": 26,
  addition: 24,
  adu: 30,
  basement: 12,
};

/** Larger spaces take longer, but sublinearly: crews overlap trades. */
export function projectWeeks(project: string, sqft: number): number {
  const base = BASE_WEEKS[project] ?? 10;
  return base * Math.pow(Math.max(sqft, 1) / (BASELINE_SQFT[project] ?? sqft), 0.35);
}

export function projectMonths(project: string, sqft: number): number {
  return projectWeeks(project, sqft) / 4.345;
}

/**
 * Design-build team hours per week on site (cost code L-03-00, $135/hr).
 *
 * The company's own project management and supervision time. A real cost,
 * carried internally, and never shown to a homeowner as a line: leads see a
 * range and a scope summary only.
 */
export const TEAM_HOURS_PER_WEEK = 3;

/**
 * WHICH SQUARE FOOT? The single most important convention in this file.
 *
 * The catalog mixes two kinds of per-SF rate and does not label them:
 *
 *   PER FLOOR AREA   shell and system trades - drywall, paint, framing,
 *                    insulation, electrical, plumbing, roofing, siding. Drywall
 *                    at $5/SF of MATERIAL is impossible (board is about $0.50/SF),
 *                    so $12.50 installed can only be per square foot of project.
 *                    These rates already contain the walls-and-ceiling geometry.
 *
 *   PER SURFACE      finish goods measured directly - tile, each flooring type,
 *                    windows. Tile at $28/SF installed is exactly market rate for
 *                    a square foot of tile, and nonsense as a whole-project rate.
 *
 * Reading a floor-area rate as a surface rate inflates it by the wall-to-floor
 * ratio, roughly 3x, which is what made drywall the largest trade in every
 * project on the first run. Rules below therefore pass FLOOR area to shell and
 * system codes, and real measured area only to finish goods.
 */

/**
 * How much of a full dwelling's shell work a project actually touches, as a
 * multiple of its own floor area. A gut remodel or new construction is 1.0. A
 * kitchen that keeps its layout disturbs a band of wall around the cabinet run
 * and little else.
 */
const SHELL_INTENSITY: Record<string, { patch: number; gut: number }> = {
  kitchen: { patch: 0.3, gut: 0.75 },
  bathroom: { patch: 0.35, gut: 0.8 },
  "whole-home": { patch: 0.55, gut: 1 },
  addition: { patch: 1, gut: 1 },
  adu: { patch: 1, gut: 1 },
  basement: { patch: 0.75, gut: 0.9 },
};

/**
 * Finish level changes SCOPE, not just material grade.
 *
 * A refresh is not a high-end remodel with cheaper tile. It is a different job:
 * cabinets are refaced rather than torn out, systems stay where they are, walls
 * are not opened, and there is far less to demolish, haul, patch and supervise.
 * Scaling only rates could never reproduce a refresh, because most of a
 * project's cost is shell and labor that a refresh simply does not incur.
 *
 * This multiplier applies to the work whose VOLUME changes with finish level:
 * shell disturbance, demolition and site overhead. It does not touch cabinetry
 * or countertops, which a refresh still replaces or reskins in full.
 */
const TIER_SCOPE_FACTOR: Record<string, number> = {
  refresh: 0.4,
  "mid-range": 1,
  "high-end": 1,
  luxury: 1.1,
};

export function tierScope(s: ScopeSelections): number {
  return TIER_SCOPE_FACTOR[s.quality] ?? 1;
}

function shellArea(project: string, d: Dimensions, s: ScopeSelections): number {
  const k = SHELL_INTENSITY[project] ?? { patch: 0.5, gut: 1 };
  return d.floorArea * (changesLayout(s) ? k.gut : k.patch) * tierScope(s);
}

/**
 * Intensity factors converting room area into equivalent whole-dwelling area
 * for the catalog's per-SF mechanical lines. See the header note.
 *
 * Bathroom plumbing is the extreme case: a rough-in, supply, drain, vent and
 * three fixtures against 80 square feet of floor. Kitchen plumbing is a single
 * sink cluster and reads far below the whole-house average.
 */
const PLUMBING_INTENSITY: Record<string, number> = {
  kitchen: 0.55,
  bathroom: 4.5,
  "whole-home": 1,
  addition: 0.35,
  adu: 1.1,
  basement: 0.45,
};

const ELECTRICAL_INTENSITY: Record<string, number> = {
  kitchen: 1,
  bathroom: 1.1,
  "whole-home": 1,
  addition: 0.9,
  adu: 1,
  basement: 0.85,
};

/**
 * Fraction of the catalog's $4,000 whole-project permit a job actually draws.
 * A single-room remodel that keeps its footprint pulls an electrical and
 * plumbing permit, not a full building permit with impact fees.
 */
const PERMIT_FRACTION: Record<string, number> = {
  kitchen: 0.3,
  bathroom: 0.25,
  "whole-home": 0.8,
  addition: 1,
  adu: 1,
  basement: 0.5,
};

/** Quality level scales material-grade lines (tile, counters, fixtures). */
const QUALITY_FACTOR: Record<string, number> = {
  refresh: 0.62,
  "mid-range": 1,
  "high-end": 1.85,
  luxury: 3.1,
};

export function qualityFactor(s: ScopeSelections): number {
  return QUALITY_FACTOR[s.quality] ?? 1;
}

/** Cabinet tier scales the cabinetry line only, not the whole project. */
const CABINET_TIER_FACTOR: Record<string, number> = {
  standard: 0.78,
  "semi-custom": 1,
  custom: 1.45,
};

/**
 * Share of the catalog's $25,000 whole-home HVAC an ADU actually needs.
 *
 * A 600 square foot dwelling is conditioned by a mini-split, not a full ducted
 * system. The company's own estimates price mini-splits at $5,000 (Ringtail) and
 * $15,400 (Walden, a larger multi-head install), so 0.35 of the catalog line
 * lands at $8,750, in the middle of its own evidence.
 */
const ADU_HVAC_FRACTION = 0.35;

/**
 * Cost of refacing a cabinet run as a share of replacing it.
 *
 * A refresh keeps the carcasses and changes the doors, drawer fronts and
 * hardware. The boxes, the demolition, the disposal and most of the install
 * labor disappear. Pricing a refresh as a full cabinet replacement was the last
 * thing pushing kitchen refresh into the market ceiling, and it was wrong on its
 * own terms: the company's own refresh copy describes "cabinet repaints or door
 * replacement", not new cabinetry.
 */
const CABINET_REFACE_FRACTION = 0.38;

export const CABINET_LF_PER_SQFT = 0.11;
const COUNTERTOP_FRACTION_OF_CABINET = 0.8;

/** Is this component in scope? Null/empty upgradeScope means a full remodel. */
function redoing(s: ScopeSelections, component: string): boolean {
  if (!s.upgradeScope || s.upgradeScope.length === 0) return true;
  return s.upgradeScope.includes(component);
}

/**
 * Bathrooms in scope, defaulted per project.
 *
 * The estimator SHOWS this field on bathroom, whole-home, addition, ADU and
 * basement, because visibility is driven by ASSUMED_BATHROOMS in
 * estimateEngine.ts. Nothing connected that table to these rules, so three of
 * the five asked the question and then priced identically whatever the answer
 * was. Asking and ignoring is worse than not asking: a homeowner who says their
 * ADU needs two bathrooms watches the number not move.
 *
 * Every rule that depends on bathroom count now goes through here, and an
 * invariant asserts that each project showing the field actually responds to it.
 */
function bathCount(s: ScopeSelections, fallback: number): number {
  const n = s.bathroomCount;
  return n === null || n === undefined ? fallback : Math.max(0, n);
}

/**
 * What one bathroom adds to a project that is not itself a bathroom remodel.
 *
 * Used by additions and ADUs, where a bath is optional scope rather than the
 * whole job. Priced as its own fixture cluster: tile, vanity, glass, hardware,
 * ventilation, and a plumbing uplift for the rough-in.
 */
function bathroomFixtureRules(project: string, defaultCount: number): ScopeRule[] {
  const count = (s: ScopeSelections) => bathCount(s, defaultCount);
  return [
    {
      code: "03-16-01", // Tile: floor plus shower surround
      qty: (_d, s) => count(s) * 140,
      when: (s) => count(s) > 0,
      assumption: "About 140 square feet of tile per bathroom, floor plus surround.",
    },
    {
      code: "03-17-03", // Vanity
      qty: (_d, s) => count(s) * 4,
      when: (s) => count(s) > 0,
    },
    {
      code: "03-19-06", // Shower glass
      qty: (_d, s) => count(s),
      when: (s) => count(s) > 0,
    },
    {
      code: "03-19-01", // Bath hardware: towel bar, ring, paper holder, hooks
      qty: (_d, s) => count(s) * 4,
      when: (s) => count(s) > 0,
    },
    {
      code: "03-19-07", // Mirror
      qty: (_d, s) => count(s),
      when: (s) => count(s) > 0,
    },
    {
      code: "03-08-02", // Exhaust ducting
      qty: (_d, s) => count(s),
      when: (s) => count(s) > 0,
    },
    {
      code: "03-10-01", // Water heater, only once and only if there is a wet room
      qty: () => 1,
      when: (s) => count(s) > 0 && project === "adu",
    },
  ];
}

const movesSystems = (s: ScopeSelections) => s.plumbingElectrical === "full";
const changesLayout = (s: ScopeSelections) => s.layoutChanges === "moderate" || s.layoutChanges === "major";
const needsPermit = (s: ScopeSelections) => changesLayout(s) || s.plumbingElectrical !== "cosmetic";

/* --------------------------------------------------- rules common to a job */

/**
 * Site, administration, clean-up and supervision. Every project carries these;
 * they are the lines a homeowner never thinks about and a contractor cannot
 * skip, and leaving them out is the commonest way an online estimator lands low.
 */
/**
 * How much full design-build overhead a project actually carries.
 *
 * The catalog's site and administration lines are written for a whole-project
 * design-build job: a dumpster and a portable restroom on site for the duration,
 * builder's risk insurance by the month, a supervisor on the schedule. A kitchen
 * remodel shares the homeowner's driveway, uses their bathroom, runs a few weeks
 * and is supervised alongside other jobs. Charging it a full project's overhead
 * added roughly $6,000 to a $32,000 kitchen on the first back-test.
 *
 * New construction carries 1.0 because it genuinely is a standalone project.
 */
const OVERHEAD_INTENSITY: Record<string, number> = {
  kitchen: 0.35,
  bathroom: 0.3,
  "whole-home": 0.75,
  addition: 1,
  adu: 1,
  basement: 0.55,
};

function commonRules(project: string, opts: { permitAlways?: boolean } = {}): ScopeRule[] {
  const oh = OVERHEAD_INTENSITY[project] ?? 0.6;
  return [
    {
      code: "03-02-06", // Dumpster, MO
      qty: (_d, s) => projectMonths(project, s.sqft) * oh * tierScope(s),
    },
    {
      code: "03-02-02", // Temp restroom, MO
      qty: (_d, s) => projectMonths(project, s.sqft) * oh * tierScope(s),
      when: () => project !== "kitchen" && project !== "bathroom",
      assumption: "Portable sanitation carried on projects where the home's own facilities are out of service or the site is detached.",
    },
    {
      code: "03-01-02", // Builder's risk insurance, MO
      qty: (_d, s) => projectMonths(project, s.sqft) * oh * tierScope(s),
    },
    {
      code: "03-02-07", // Daily clean, MO
      qty: (_d, s) => projectMonths(project, s.sqft) * oh * tierScope(s),
    },
    {
      code: "03-23-02", // Final clean, SF
      qty: (d) => d.floorArea,
    },
    {
      code: "03-23-01", // Fit + finish, SF
      qty: (d) => d.floorArea,
    },
    {
      code: "03-01-01", // Permitting fees, EA
      qty: (_d, s) => (PERMIT_FRACTION[project] ?? 0.5) * (changesLayout(s) ? 1.6 : 1),
      when: (s) => opts.permitAlways === true || (needsPermit(s) && s.quality !== "refresh"),
      assumption:
        "The catalog's $4,000 EA is a whole-project permit; a room-level remodel draws a documented fraction of it.",
    },
    {
      code: "L-03-00", // Design-build team labor, HR
      qty: (_d, s) => projectWeeks(project, s.sqft) * TEAM_HOURS_PER_WEEK * oh * tierScope(s),
      assumption: `Project management and supervision at ${TEAM_HOURS_PER_WEEK} hours per week on site.`,
    },
  ];
}

/** Interior finish shell shared by every interior remodel. */
function interiorShellRules(project: string): ScopeRule[] {
  return [
    {
      code: "03-13-01", // Drywall, per SF of project floor area
      qty: (d, s) => shellArea(project, d, s),
      assumption:
        "Drywall priced per square foot of project. A remodel that keeps its layout disturbs a band of wall rather than gutting the room.",
    },
    {
      code: "03-14-01", // Interior paint, per SF of project floor area
      qty: (d, s) => Math.max(d.floorArea * 0.6, shellArea(project, d, s)),
      assumption: "Paint priced per square foot of project; a room is repainted even when little drywall is replaced.",
    },
    {
      code: "03-18-02", // Trim, LF
      qty: (d) => d.interiorPerimeter,
    },
    {
      code: "03-09-08-L", // Electrical labor, SF
      qty: (d, s) => d.floorArea * (ELECTRICAL_INTENSITY[project] ?? 1) * (movesSystems(s) ? 1.35 : 1),
      assumption: "Electrical labor carries a 35% uplift when circuits are relocated.",
    },
    /* Fixture materials respect the kitchen's LIGHTING chip. The chip was
       offered ("what are you upgrading?") and then read by nothing: selecting
       lighting alone dropped $18k of cabinet/counter scope while the lighting
       itself changed no line, and cabinets-only still paid full fixture
       materials. Only the kitchen has a lighting chip, so other projects'
       partial scopes (bathroom shower/vanity, whole-home rooms) are
       unaffected - redoing() is true for them regardless. Electrical LABOR
       stays ungated: circuits, disconnects and code work accompany cabinet
       and counter replacement whether or not fixtures change. */
    {
      code: "03-09-04-M", // Standard interior fixtures, SF
      qty: (d, s) => d.floorArea * (ELECTRICAL_INTENSITY[project] ?? 1),
      when: (s) =>
        (s.quality === "refresh" || s.quality === "mid-range") &&
        (project !== "kitchen" || redoing(s, "lighting")),
    },
    {
      code: "03-09-06-M", // Decorative interior fixtures, SF
      qty: (d, s) => d.floorArea * (ELECTRICAL_INTENSITY[project] ?? 1),
      when: (s) =>
        (s.quality === "high-end" || s.quality === "luxury") &&
        (project !== "kitchen" || redoing(s, "lighting")),
    },
    {
      code: "03-03-04", // Building demolition + haul, SF
      qty: (d, s) => d.floorArea * tierScope(s),
    },
  ];
}

/* ----------------------------------------------------------------- kitchen */

export const KITCHEN_RULES: ScopeRule[] = [
  ...commonRules("kitchen"),
  ...interiorShellRules("kitchen"),
  {
    code: "03-17-01", // Cabinets, LF
    qty: (d, s) =>
      d.floorArea *
      CABINET_LF_PER_SQFT *
      (CABINET_TIER_FACTOR[s.cabinetTier ?? "semi-custom"] ?? 1) *
      (s.quality === "refresh" ? CABINET_REFACE_FRACTION : 1),
    when: (s) => redoing(s, "cabinets"),
    assumption:
      "Cabinet run derived at 0.11 linear feet per square foot of kitchen floor. A refresh refaces the existing boxes rather than replacing them.",
  },
  {
    code: "03-17-02", // Countertops, LF
    qty: (d, s) =>
      d.floorArea * CABINET_LF_PER_SQFT * COUNTERTOP_FRACTION_OF_CABINET,
    when: (s) => redoing(s, "counters"),
    assumption: "Countertop run is 80% of the cabinet run; the range and dishwasher interrupt it.",
  },
  {
    code: "03-19-02", // Cabinet hardware, LF
    qty: (d) => d.floorArea * CABINET_LF_PER_SQFT,
    when: (s) => redoing(s, "cabinets"),
  },
  {
    code: "03-16-01", // Backsplash tile, SF
    qty: (d, s) => d.interiorPerimeter * 0.5 * 1.5,
    when: (s) => redoing(s, "counters") || redoing(s, "cabinets"),
    assumption: "Backsplash covers 18 inches above the counter across half the perimeter.",
  },
  {
    code: "03-15-02", // LVP flooring, SF
    qty: (d) => d.floorArea,
    when: (s) => redoing(s, "flooring"),
  },
  {
    code: "03-10-03", // Plumbing, SF-equivalent
    qty: (d, s) => d.floorArea * PLUMBING_INTENSITY.kitchen * (movesSystems(s) ? 1.4 : 1),
    assumption: "Kitchen plumbing is a single sink cluster, priced well below the whole-dwelling per-square-foot average.",
  },
  // NO APPLIANCE LINE. This company does not supply or install appliances, so
  // neither the package nor the install labour belongs in a kitchen estimate.
  // Carrying the labour was still wrong: we do not set them, and billing an
  // hour for it contradicts what every page of the site tells homeowners.
  // Enforced by verify-no-appliance-costs so it cannot come back.
  {
    code: "03-21-06", // Custom vent hood
    qty: () => 1,
    when: (s) => s.quality === "high-end" || s.quality === "luxury",
  },
];

/* ---------------------------------------------------------------- bathroom */

export const BATHROOM_RULES: ScopeRule[] = [
  ...commonRules("bathroom"),
  ...interiorShellRules("bathroom"),
  /* The size slider describes ONE bathroom, so a homeowner doing two at once
     multiplies the fixture work: tile, vanity, glass, hardware, mirrors,
     ventilation and the rough-in. Site overhead in commonRules is deliberately
     NOT multiplied - two bathrooms in one job share a dumpster, a permit and a
     supervisor. */
  /* THE UPGRADE CHIPS ARE READ HERE. The wizard offers SHOWER / VANITY / TUB
     / TILE and these rules used to ignore all four - the documented
     asking-and-ignoring antipattern (see bathCount above), on the estimator's
     second-most-used project. Null scope stays a full remodel (redoing() is
     true); a selected subset gates each line to the work it names. */
  {
    code: "03-16-01", // Tile, SF - floor plus a wet wall
    qty: (d, s) => (d.floorArea + d.interiorPerimeter * 0.45 * 7),
    when: (s) => redoing(s, "tile") || redoing(s, "shower"),
    assumption:
      "Tile covers the floor plus a shower surround roughly 7 feet high across 45% of the perimeter, per bathroom in scope.",
  },
  {
    code: "03-17-03", // Vanity, LF
    qty: (d, s) =>
      Math.max(4, d.floorArea * 0.05) * (s.fixtureCount && s.fixtureCount > 1 ? 1.6 : 1),
    when: (s) => redoing(s, "vanity"),
    assumption: "Vanity run scales with room size, floored at a 4 foot single vanity, per bathroom in scope.",
  },
  {
    code: "03-19-06", // Shower glass, EA
    qty: () => 1,
    when: (s) => s.quality !== "refresh" && redoing(s, "shower"),
  },
  {
    code: "03-19-01", // Bath hardware, EA
    /* Flat four pieces PER BATHROOM - the whole takeoff is already multiplied
       by bathroomCount (engine `instances`). The old fixtureCount * 4 * count
       shape charged a primary suite (fixtureCount 3) for 12 pieces per
       bathroom, 24 across two bathrooms, purely from which layout card was
       tapped - a $4,000 swing the assumption text never described. */
    qty: () => 4,
    assumption: "Four hardware pieces per bathroom: towel bar, ring, paper holder, hooks.",
  },
  {
    code: "03-19-07", // Mirrors, EA - one, or two over a double vanity
    qty: (_d, s) => (s.fixtureCount && s.fixtureCount > 1 ? 2 : 1),
    when: (s) => redoing(s, "vanity"),
  },
  {
    code: "03-15-04", // Vinyl flooring where not tiled
    qty: () => 0,
    when: () => false,
    assumption: "Bathroom floors are tiled; the vinyl line is retained for future selection support.",
  },
  {
    code: "03-10-03", // Plumbing, SF-equivalent
    qty: (d, s) =>
      d.floorArea * PLUMBING_INTENSITY.bathroom * (movesSystems(s) ? 1.3 : 1) * (changesLayout(s) ? 1.25 : 1),
    // Any wet-work chip carries the rough-in; a tile-only refresh does not.
    when: (s) => redoing(s, "shower") || redoing(s, "tub") || redoing(s, "vanity"),
    assumption:
      "Bathroom plumbing is priced at 4.5x the whole-dwelling per-square-foot rate: a rough-in, supply, drain, vent and three fixtures against a small floor.",
  },
  {
    code: "03-08-02", // Exhaust ducting, EA
    qty: () => 1,
  },
];

/* -------------------------------------------------------------- whole-home */

export const WHOLE_HOME_RULES: ScopeRule[] = [
  ...commonRules("whole-home"),
  ...interiorShellRules("whole-home"),
  {
    code: "03-15-01", // Hardwood flooring, SF
    qty: (d, s) => d.floorArea * (s.quality === "high-end" || s.quality === "luxury" ? 0.7 : 0.35),
    assumption: "Hardwood across the main living areas; the balance is carpet or LVP.",
  },
  {
    code: "03-15-02", // LVP, SF
    qty: (d, s) => d.floorArea * (s.quality === "high-end" || s.quality === "luxury" ? 0.15 : 0.4),
  },
  {
    code: "03-15-05", // Carpet, SF
    qty: (d) => d.floorArea * 0.25,
    assumption: "Carpet in bedrooms, roughly a quarter of a typical home's floor area.",
  },
  {
    code: "03-17-01", // Kitchen cabinets, LF
    qty: (_d, s) => (s.kitchenIncluded === false ? 0 : 250 * CABINET_LF_PER_SQFT * (CABINET_TIER_FACTOR[s.cabinetTier ?? "semi-custom"] ?? 1)),
    assumption: "A whole-home remodel carries one kitchen at the 250 square foot reference unless excluded.",
  },
  {
    code: "03-17-02", // Kitchen countertops, LF
    qty: (_d, s) => (s.kitchenIncluded === false ? 0 : 250 * CABINET_LF_PER_SQFT * COUNTERTOP_FRACTION_OF_CABINET),
  },
  {
    code: "03-17-03", // Vanities, LF - one run per bathroom
    qty: (_d, s) => Math.max(1, s.bathroomCount ?? 2) * 4.5,
    assumption: "One 4.5 foot vanity run per bathroom in scope.",
  },
  {
    code: "03-16-01", // Tile, SF - baths plus kitchen backsplash
    qty: (_d, s) => Math.max(1, s.bathroomCount ?? 2) * 150,
    assumption: "Roughly 150 square feet of tile per bathroom, floor plus surround.",
  },
  {
    code: "03-19-06", // Shower glass, EA
    qty: (_d, s) => Math.max(1, s.bathroomCount ?? 2),
  },
  {
    code: "03-10-03", // Plumbing, SF
    qty: (d, s) => d.floorArea * PLUMBING_INTENSITY["whole-home"] * (movesSystems(s) ? 1.25 : 1),
  },
  {
    code: "03-10-01", // Water heater, EA
    qty: () => 1,
    when: movesSystems,
  },
  {
    code: "03-08-01", // HVAC system, EA
    qty: () => 1,
    when: (s) => s.quality === "high-end" || s.quality === "luxury" || movesSystems(s),
    assumption: "Full HVAC replacement carried on gut-level scope; retained systems are not recharged for.",
  },
  {
    code: "03-18-01", // Interior doors, EA
    qty: (d) => Math.max(4, Math.round(d.floorArea / 220)),
    assumption: "One interior door per 220 square feet of home.",
  },
  {
    code: "03-19-04", // Door hardware, EA
    qty: (d) => Math.max(4, Math.round(d.floorArea / 220)),
  },
  {
    code: "03-12-01", // Insulation, SF
    // ENVELOPE, not interior. Insulation goes in the exterior wall; partitions
    // between two conditioned rooms carry none. Measuring this off the interior
    // figure would insulate every partition in a plan-fed remodel.
    qty: (d, s) => (movesSystems(s) ? d.envelopeWallArea : 0),
    when: movesSystems,
    assumption: "Insulation replaced only where walls are opened.",
  },
];

/* --------------------------------------------------------------- addition */

/**
 * New construction tied into an existing home. Unlike a remodel this carries
 * foundation, framing, envelope, roofing and exterior finishes, and it does NOT
 * carry demolition of an existing interior.
 */
function buildShellRules(project: string): ScopeRule[] {
  return [
  ...commonRules(project, { permitAlways: true }),
  {
    code: "03-04-01", // Excavation + backfill, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-04-02", // Footings, LF
    qty: (d) => d.envelopePerimeter,
  },
  {
    code: "03-04-03", // Slab / flatwork, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-04-04", // Waterproofing + drains, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-05-02", // Framing, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-05-03", // Trusses, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-06-01", // House wrap / dry-in, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-11-01", // Roofing, SF
    qty: (d) => d.floorArea * 1.15,
    assumption: "Roof area is 15% greater than footprint to allow for pitch and overhang.",
  },
  {
    code: "03-11-06", // Exterior siding + trim, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-11-03", // Gutters, LF
    qty: (d) => d.envelopePerimeter,
  },
  {
    code: "03-07-03", // Windows, SF
    // Windows sit in the envelope. An interior partition has no glazing.
    qty: (d) => d.envelopeWallArea * 0.15,
    assumption: "Glazing at 15% of wall area, a normal residential window-to-wall ratio.",
  },
  {
    code: "03-07-02", // Exterior door, EA
    qty: () => 1,
  },
  {
    code: "03-12-01", // Insulation, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-13-01", // Drywall, per SF of project - full, this is new construction
    qty: (d) => d.floorArea,
  },
  {
    code: "03-14-01", // Interior paint, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-18-02", // Trim, LF
    qty: (d) => d.interiorPerimeter,
  },
  {
    code: "03-18-01", // Interior doors, EA
    qty: (d) => Math.max(1, Math.round(d.floorArea / 200)),
  },
  {
    code: "03-15-02", // LVP flooring, SF
    qty: (d) => d.floorArea,
  },
  {
    code: "03-09-08-L", // Electrical labor, SF
    qty: (d, s) => d.floorArea * (ELECTRICAL_INTENSITY[project] ?? 1) * (movesSystems(s) ? 1.3 : 1),
    assumption: "Electrical labor carries a 30% uplift when the project takes full new systems.",
  },
  {
    code: "03-09-04-M", // Standard fixtures, SF
    qty: (d, s) => d.floorArea * ELECTRICAL_INTENSITY.addition,
    when: (s) => s.quality === "refresh" || s.quality === "mid-range",
  },
  {
    code: "03-09-06-M", // Decorative fixtures, SF
    qty: (d) => d.floorArea * (ELECTRICAL_INTENSITY[project] ?? 1),
    when: (s) => s.quality === "high-end" || s.quality === "luxury",
  },
  {
    code: "03-10-03", // Plumbing, SF-equivalent
    qty: (d, s) => d.floorArea * (PLUMBING_INTENSITY[project] ?? 1) * (movesSystems(s) ? 1.35 : 1),
    assumption:
      "Plumbing intensity is project-specific: an addition carries little unless it has a wet room, an ADU carries a full kitchen and bath. Full new systems add 35%.",
  },
  {
    code: "03-17-01", // Kitchen cabinetry, only when the homeowner says there is one
    qty: () => 12,
    when: (s) => project === "addition" && s.kitchenIncluded === true,
    assumption: "An addition carries kitchen cabinetry only when the homeowner states it contains a kitchen.",
  },
  {
    code: "03-17-02", // Countertops for that kitchen
    qty: () => 10,
    when: (s) => project === "addition" && s.kitchenIncluded === true,
  },
  {
    code: "03-08-02", // Exhaust / HVAC tie-in, EA
    qty: () => 2,
    assumption: "HVAC extended from the existing system rather than replaced.",
  },
  {
    code: "02-00-01", // Architecture, SF
    qty: (d) => d.floorArea,
    assumption: "New construction requires stamped drawings.",
  },
  {
    code: "02-00-03", // Engineering, HR
    qty: () => 12,
    assumption: "Structural engineering for foundation, framing and the tie-in to the existing structure.",
  },
  ];
}

/**
 * Ground-up shell rules, parameterized by project.
 *
 * ADUs previously reused the addition array directly, which silently applied
 * ADDITION's overhead intensity, duration, permit fraction and plumbing
 * intensity to every ADU. Building both from one factory keyed on the real
 * project is what stops that class of bug: there is no longer an array to
 * inherit from, only a function that must be told which project it is building.
 */
export const ADDITION_RULES: ScopeRule[] = [
  /* CODE COLLISIONS ARE SILENT QUANTITY LOSS. The dedup in
     buildInternalEstimate keeps the LARGER quantity when two rules emit the
     same code, so the shell's 03-08-02 (HVAC tie-in, qty 2) and the bathroom
     pack's 03-08-02 (one exhaust fan per bathroom) fought: at one bathroom
     the fan was dropped, at three the tie-in was. Same shape on 03-10-03,
     where the wet-room uplift is MEANT to replace the base rate but did so
     by winning a dedup that logged a warning nobody read. Both codes are
     filtered out of the packs here and re-emitted once, with the combined
     semantics stated. ADU_RULES already does this for 03-08-02.  */
  ...buildShellRules("addition").filter((r) => r.code !== "03-08-02" && r.code !== "03-10-03"),
  // An addition carries a bathroom only if the homeowner says so, hence a
  // default of zero. Previously the field was shown and then ignored entirely.
  ...bathroomFixtureRules("addition", 0).filter((r) => r.code !== "03-08-02"),
  {
    code: "03-08-02", // Exhaust / HVAC tie-in + one exhaust fan per bathroom, EA
    qty: (_d, s) => 2 + bathCount(s, 0),
    assumption:
      "HVAC extended from the existing system rather than replaced, plus an exhaust fan for each bathroom in the addition.",
  },
  {
    code: "03-10-03", // Plumbing: base rate, or the full wet-room rough-in
    qty: (d, s) => d.floorArea * PLUMBING_INTENSITY.addition * (movesSystems(s) ? 1.35 : 1) * (bathCount(s, 0) > 0 ? 2.6 : 1),
    assumption:
      "An addition containing a bathroom carries a full rough-in, which the base addition plumbing rate does not.",
  },
];

/* -------------------------------------------------------------------- ADU */

/** A detached dwelling: everything an addition has, plus its own kitchen, bath and utility runs. */
export const ADU_RULES: ScopeRule[] = [
  ...buildShellRules("adu").filter((r) => r.code !== "03-08-02"),
  {
    code: "03-08-01", // Its own HVAC system, EA
    qty: () => ADU_HVAC_FRACTION,
    assumption:
      "A detached unit needs its own system, but not a whole house's. The catalog's $25,000 EA is a full-home system; an ADU is served by a mini-split or a small packaged unit, consistent with the $5,000 to $15,400 mini-split lines on the company's own Walden and Ringtail estimates.",
  },
  {
    code: "03-03-08", // Permanent water + sewer, EA
    qty: () => 1,
    assumption: "Utility connections from the main house or street, which an interior remodel never pays.",
  },
  {
    code: "03-03-09", // Permanent gas + electrical, EA
    qty: () => 1,
  },
  {
    code: "03-17-01", // Kitchenette cabinets, LF
    qty: (_d, s) => (s.kitchenIncluded === false ? 0 : 12),
    when: (s) => s.kitchenIncluded !== false,
    assumption:
      "A compact ADU kitchen carries about 12 linear feet of cabinet. A homeowner can say the unit has no kitchen, which removes it.",
  },
  {
    code: "03-17-02", // Countertops, LF
    qty: () => 10,
    when: (s) => s.kitchenIncluded !== false,
  },
  // NO APPLIANCE LINE, same as the kitchen. An ADU is handed over ready for the
  // owner's own appliances. This used to carry a full $10,000 package plus $800
  // of install labour, which is why ADU came in high and why the estimate
  // contradicted the site's own answer that appliances are client-supplied.
  // One bathroom by default, and the homeowner can say otherwise. Previously
  // the vanity, tile, glass and water heater were hard-coded to a single bath
  // here, so the stated count changed nothing.
  ...bathroomFixtureRules("adu", 1),
];

/* --------------------------------------------------------------- basement */

/**
 * Finishing an existing shell. No foundation, no roof, no exterior envelope:
 * the concrete and the structure above are already there, which is why a
 * basement is the cheapest square footage in the catalogue.
 */
export const BASEMENT_RULES: ScopeRule[] = [
  ...commonRules("basement"),
  {
    code: "03-05-02", // Framing, per SF of project
    qty: (d) => d.floorArea * 0.35,
    assumption:
      "Framing is partition walls only at 45% of a new-construction rate; the basement shell, floor and ceiling already exist.",
  },
  {
    code: "03-12-01", // Insulation, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-13-01", // Drywall, per SF of project
    qty: (d, s) => d.floorArea * 0.85 * (changesLayout(s) ? 1.3 : 1),
    assumption:
      "A finished basement hangs drywall on partition walls and the perimeter, not the full envelope of a new build, so it carries 85% of a ground-up rate. A reconfigured basement carries 30% more.",
  },
  {
    code: "03-14-01", // Interior paint, per SF of project
    qty: (d) => d.floorArea,
  },
  {
    code: "03-18-02", // Trim, LF
    qty: (d) => d.interiorPerimeter,
  },
  {
    code: "03-18-01", // Interior doors, EA
    qty: (d) => Math.max(2, Math.round(d.floorArea / 250)),
  },
  {
    code: "03-19-04", // Door hardware, EA
    qty: (d) => Math.max(2, Math.round(d.floorArea / 250)),
  },
  {
    code: "03-15-05", // Carpet, SF
    qty: (d) => d.floorArea * 0.6,
  },
  {
    code: "03-15-02", // LVP, SF
    qty: (d) => d.floorArea * 0.4,
  },
  {
    code: "03-09-08-L", // Electrical labor, SF
    qty: (d) => d.floorArea * ELECTRICAL_INTENSITY.basement,
  },
  {
    code: "03-09-04-M", // Standard fixtures, SF
    qty: (d, s) => d.floorArea * ELECTRICAL_INTENSITY.basement,
    when: (s) => s.quality === "refresh" || s.quality === "mid-range",
  },
  {
    code: "03-09-06-M", // Decorative fixtures, SF
    qty: (d) => d.floorArea * ELECTRICAL_INTENSITY.basement,
    when: (s) => s.quality === "high-end" || s.quality === "luxury",
  },
  {
    code: "03-10-03", // Plumbing, SF-equivalent
    qty: (d, s) =>
      d.floorArea * PLUMBING_INTENSITY.basement * (bathCount(s, 1) > 0 ? bathCount(s, 1) : 0.2) * (movesSystems(s) ? 1.3 : 1),
    assumption: "Basement plumbing assumes one added bathroom unless the homeowner states otherwise.",
  },
  {
    code: "03-16-01", // Bathroom tile, SF
    qty: (_d, s) => Math.max(0, s.bathroomCount ?? 1) * 140,
  },
  {
    code: "03-17-03", // Bathroom vanity, LF
    qty: (_d, s) => Math.max(0, s.bathroomCount ?? 1) * 4,
  },
  {
    code: "03-19-06", // Shower glass, EA
    qty: (_d, s) => Math.max(0, s.bathroomCount ?? 1),
  },
  {
    code: "03-07-05", // Egress window wells, EA
    qty: () => 1,
    assumption: "One egress window well, required for any below-grade sleeping room.",
  },
  {
    code: "03-08-02", // HVAC extension, EA
    qty: () => 2,
  },
  {
    code: "03-03-04", // Demolition of any existing partial finish, SF
    qty: (d, s) => d.floorArea * 0.12 * tierScope(s),
    assumption: "Partial demolition only; most basements being finished are unfinished to begin with.",
  },
];

export const RULES_BY_PROJECT: Record<string, ScopeRule[]> = {
  kitchen: KITCHEN_RULES,
  bathroom: BATHROOM_RULES,
  "whole-home": WHOLE_HOME_RULES,
  addition: ADDITION_RULES,
  adu: ADU_RULES,
  basement: BASEMENT_RULES,
};
