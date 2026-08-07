"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import type { LucideIcon } from "lucide-react";
import {
  Check, ChevronDown, ArrowRight, ArrowLeft, Lock, Calculator, Printer, RefreshCw,
  UtensilsCrossed, Droplets, Home, Building2, Layers, AlignLeft,
  LayoutGrid, Star, Sun, Monitor, Dumbbell, Bed, Car,
  Lightbulb, Wind, DoorOpen, GlassWater, Sofa, Frame, Triangle, Grid3x3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing";
import {
  WizardProgress,
  StepTransition,
  StickyStepNav,
  ReviewSection,
  EditScopeCta,
  StickyResultActions,
  TextField,
  type WizardStepMeta,
  type ReviewItem,
} from "@/components/estimate/wizard";
import { formatPhoneInput, isValidEmail, isValidPhone } from "@/lib/wizardFormat";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";
import { CTA_SECONDARY } from "@/shared/ctaCopy";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { PropertyProfile } from "@/shared/propertyProfile";
import {
  takeoffForRange,
  takeoffForClient,
  formatQuantity,
  TAKEOFF_SCOPE_NOTICE,
  type UnitCostOverrides,
} from "@/shared/costCatalog";
import { resolveQuotedRange, resolveInternalEstimate } from "@/shared/costs/resolve";
import { assessBudget, budgetGuidance, BUDGET_BASIS_NOTE } from "@/shared/costs/budget";
import type { QualityLevel, ScopeSelections } from "@/shared/costs/engine";
import { HOUSE_NUMBER_REGEX, extractZip } from "@/shared/addressValidation";
import {
  type ProjectType,
  type FinishLevel,
  type PlumbingElectrical,
  type CabinetTier,
  type EstimateRefinements,
  type EstimateInput,
  type EstimateResult,
  EMPTY_REFINEMENTS,
  getAvailableFinishLevels,
  getPlumbingElectricalOptions,
  getPlumbingElectricalLabel,
  getAssumedBathrooms,
  getAssumedBathroomsForSize,
  getKitchenQuestion,
  getTypicalSelections,
  FINISH_LABELS as ENGINE_FINISH_LABELS,
  PROJECT_SIZE_CONFIG,
  formatPlanningCurrency,
  calculateEstimate,
  buildStoredEstimate,
  countVisibleUserRefinements,
  getMaxRefinementFields,
  getSetRefinementKeys,
  INCLUDED_SCOPE_NOTE,
  buildEstimateDisclosure,
  NOT_A_QUOTE_NOTICE,
  ONSITE_REQUIRED_NOTICE,
  APPLIANCE_DISCLAIMER,
} from "@/shared/estimateEngine";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { GRAIN_URL } from "@/lib/grain";
import {
  applyLeadParams,
  writeStoredPrefill,
  readStoredPrefill,
  hasPassedGate,
  markGatePassed,
  clearStoredIdentity,
  readLastSentKey,
  writeLastSentKey,
} from "@/lib/leadPrefill";

/* Project-level icons for the project-type card grid. */
const PROJECT_ICONS: Record<ProjectType, LucideIcon> = {
  kitchen: UtensilsCrossed,
  bathroom: Droplets,
  "whole-home": Home,
  addition: Building2,
  adu: DoorOpen,
  basement: Layers,
};

/* ══════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════ */

interface SubtypeOption {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

interface ChipOption {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface ProjectUIConfig {
  tabLabel: string;
  headlinePrefix: string;
  headlineAccent: string;
  headlineSuffix: string;
  twoLineHeadline?: boolean; /* force accent onto a new line (Addition) */
  gridLabel: string;
  subtypes: SubtypeOption[];
  chipsLabel: string;
  chips: ChipOption[];
  footerAccent: string;
}

type SubtypeData = {
  sqft: number;
  refinements: Partial<EstimateRefinements>;
  projectOverride?: ProjectType;
};

/* ══════════════════════════════════════════════════════════════════════
   SUBTYPE DATA  (sqft + refinement seeds, per spec)
══════════════════════════════════════════════════════════════════════ */

const SUBTYPE_DATA: Record<ProjectType, Record<string, SubtypeData>> = {
  kitchen: {
    galley:      { sqft: 175, refinements: { layoutChanges: "none" } },
    "l-shape":   { sqft: 250, refinements: { layoutChanges: "none" } },
    "u-shape":   { sqft: 325, refinements: { layoutChanges: "moderate" } },
    island:      { sqft: 400, refinements: { layoutChanges: "moderate" } },
  },
  bathroom: {
    powder:           { sqft: 50,  refinements: { fixtureCount: 1 } },
    "guest-bath":     { sqft: 80,  refinements: { fixtureCount: 2 } },
    "primary-suite":  { sqft: 120, refinements: { fixtureCount: 3 } },
    "walk-in-shower": { sqft: 90,  refinements: { fixtureCount: 2, layoutChanges: "moderate" } },
  },
  "whole-home": {
    "single-room":   { sqft: 400,  refinements: {} },
    "multi-room":    { sqft: 900,  refinements: {} },
    "whole-home":    { sqft: 1800, refinements: {} },
    "home-addition": { sqft: 500,  refinements: {}, projectOverride: "addition" },
  },
  addition: {
    "bedroom-suite": { sqft: 350, refinements: { plumbingElectrical: "partial" } },
    sunroom:         { sqft: 250, refinements: {} },
    "great-room":    { sqft: 400, refinements: {} },
    "second-story":  { sqft: 600, refinements: { stories: 2 } },
  },
  adu: {
    attached:       { sqft: 500, refinements: { aduConfig: "attached" } },
    garage:         { sqft: 400, refinements: { aduConfig: "attached" } },
    detached:       { sqft: 600, refinements: { aduConfig: "detached" } },
    "above-garage": { sqft: 550, refinements: { aduConfig: "detached" } },
  },
  basement: {
    "family-room":  { sqft: 700, refinements: { layoutChanges: "none" } },
    "home-theater": { sqft: 900, refinements: { layoutChanges: "none" } },
    "guest-suite":  { sqft: 800, refinements: { layoutChanges: "moderate", plumbingElectrical: "partial" } },
    "gym-flex":     { sqft: 700, refinements: { layoutChanges: "none" } },
  },
};

/* The layout whose typical size is closest to the project baseline - used as the
   default selection so a sensible live estimate shows immediately on load. */
function defaultSubtypeFor(project: ProjectType): string {
  const baseline = PROJECT_SIZE_CONFIG[project].baselineSqft;
  const ids = Object.keys(SUBTYPE_DATA[project]);
  return ids.reduce(
    (best, id) =>
      Math.abs(SUBTYPE_DATA[project][id].sqft - baseline) <
      Math.abs(SUBTYPE_DATA[project][best].sqft - baseline)
        ? id
        : best,
    ids[0],
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FOOTER STRIP IMAGES
══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   PROJECT UI CONFIGS
══════════════════════════════════════════════════════════════════════ */

const PROJECT_CONFIGS: Record<ProjectType, ProjectUIConfig> = {
  kitchen: {
    tabLabel: "Kitchen",
    headlinePrefix: "Calculate your", headlineAccent: "kitchen", headlineSuffix: "remodel cost",
    gridLabel: "YOUR KITCHEN LAYOUT",
    subtypes: [
      { id: "galley",   icon: AlignLeft,  title: "Galley",  subtitle: "Two facing runs" },
      { id: "l-shape",  icon: Frame,      title: "L-Shape", subtitle: "Corner run" },
      { id: "u-shape",  icon: Grid3x3,    title: "U-Shape", subtitle: "Three walls" },
      { id: "island",   icon: LayoutGrid, title: "Island",  subtitle: "Open concept" },
    ],
    chipsLabel: "WHAT ARE YOU UPGRADING?",
    chips: [
      { id: "cabinets", icon: LayoutGrid, label: "CABINETS" },
      { id: "counters", icon: Layers,     label: "COUNTERS" },
      { id: "flooring", icon: Grid3x3,    label: "FLOORING" },
      { id: "lighting", icon: Lightbulb,  label: "LIGHTING" },
    ],
    footerAccent: "kitchen",
  },
  bathroom: {
    tabLabel: "Bathroom",
    headlinePrefix: "Calculate your", headlineAccent: "bathroom", headlineSuffix: "remodel cost",
    gridLabel: "YOUR BATHROOM TYPE",
    subtypes: [
      { id: "powder",          icon: Droplets, title: "Powder",         subtitle: "Sink & toilet" },
      { id: "guest-bath",      icon: Layers,   title: "Guest Bath",     subtitle: "Tub & shower" },
      { id: "primary-suite",   icon: Star,     title: "Primary Suite",  subtitle: "Spa retreat" },
      { id: "walk-in-shower",  icon: Wind,     title: "Walk-in Shower", subtitle: "Curbless" },
    ],
    chipsLabel: "WHAT ARE YOU UPGRADING?",
    chips: [
      { id: "shower", icon: Droplets, label: "SHOWER" },
      { id: "vanity", icon: Star,     label: "VANITY" },
      { id: "tub",    icon: Layers,   label: "TUB" },
      { id: "tile",   icon: Grid3x3,  label: "TILE" },
    ],
    footerAccent: "bathroom",
  },
  "whole-home": {
    tabLabel: "Whole-Home",
    headlinePrefix: "Calculate your", headlineAccent: "home", headlineSuffix: "remodel cost",
    gridLabel: "YOUR PROJECT SCOPE",
    subtypes: [
      { id: "single-room",   icon: Layers,    title: "Single Room",   subtitle: "One space" },
      { id: "multi-room",    icon: LayoutGrid, title: "Multi-Room",    subtitle: "A few spaces" },
      { id: "whole-home",    icon: Home,       title: "Whole Home",    subtitle: "Full renovation" },
      { id: "home-addition", icon: Building2,  title: "Home Addition", subtitle: "New footage" },
    ],
    chipsLabel: "WHAT ARE YOU INCLUDING?",
    chips: [
      { id: "kitchen",  icon: UtensilsCrossed, label: "KITCHEN" },
      { id: "baths",    icon: Droplets,        label: "BATHS" },
      { id: "flooring", icon: Grid3x3,         label: "FLOORING" },
      { id: "layout",   icon: LayoutGrid,      label: "LAYOUT" },
    ],
    footerAccent: "home",
  },
  addition: {
    tabLabel: "Addition",
    headlinePrefix: "Calculate your room",
    headlineAccent: "addition",
    headlineSuffix: "cost",
    twoLineHeadline: true, /* "room" ends line 1; "addition cost" is line 2 */
    gridLabel: "WHAT ARE YOU ADDING?",
    subtypes: [
      { id: "bedroom-suite", icon: Bed,    title: "Bedroom Suite", subtitle: "Bed + bath" },
      { id: "sunroom",       icon: Sun,    title: "Sunroom",       subtitle: "Bright + airy" },
      { id: "great-room",    icon: Sofa,   title: "Great Room",    subtitle: "Living space" },
      { id: "second-story",  icon: Layers, title: "Second Story",  subtitle: "Add a level" },
    ],
    chipsLabel: "WHAT'S INCLUDED?",
    chips: [
      { id: "foundation", icon: Layers,   label: "FOUNDATION" },
      { id: "framing",    icon: Frame,    label: "FRAMING" },
      { id: "roofing",    icon: Triangle, label: "ROOFING" },
      { id: "hvac",       icon: Wind,     label: "HVAC" },
    ],
    footerAccent: "addition",
  },
  adu: {
    tabLabel: "ADU",
    headlinePrefix: "Calculate your", headlineAccent: "ADU", headlineSuffix: "cost",
    gridLabel: "YOUR ADU TYPE",
    subtypes: [
      { id: "attached",      icon: Home,      title: "Attached",      subtitle: "Shares a wall" },
      { id: "garage",        icon: Car,       title: "Garage",        subtitle: "Convert existing" },
      { id: "detached",      icon: Building2, title: "Detached",      subtitle: "Standalone build" },
      { id: "above-garage",  icon: Layers,    title: "Above Garage",  subtitle: "Second story" },
    ],
    chipsLabel: "WHAT'S INCLUDED?",
    chips: [
      { id: "kitchen",  icon: UtensilsCrossed, label: "KITCHEN" },
      { id: "bath",     icon: Droplets,        label: "BATH" },
      { id: "bedroom",  icon: Bed,             label: "BEDROOM" },
      { id: "living",   icon: Sofa,            label: "LIVING" },
    ],
    footerAccent: "ADU",
  },
  basement: {
    tabLabel: "Basement",
    headlinePrefix: "Calculate your", headlineAccent: "basement", headlineSuffix: "finishing cost",
    gridLabel: "HOW WILL YOU USE IT?",
    subtypes: [
      { id: "family-room",  icon: Sofa,    title: "Family Room",  subtitle: "Living space" },
      { id: "home-theater", icon: Monitor, title: "Home Theater", subtitle: "Media room" },
      { id: "guest-suite",  icon: Bed,     title: "Guest Suite",  subtitle: "Bed + bath" },
      { id: "gym-flex",     icon: Dumbbell,title: "Gym / Flex",   subtitle: "Workout space" },
    ],
    chipsLabel: "WHAT'S INCLUDED?",
    chips: [
      { id: "egress",   icon: DoorOpen,   label: "EGRESS" },
      { id: "bath",     icon: Droplets,   label: "BATH" },
      { id: "wet-bar",  icon: GlassWater, label: "WET BAR" },
      { id: "flooring", icon: Grid3x3,    label: "FLOORING" },
    ],
    footerAccent: "basement",
  },
};


const PROJECT_TYPE_ORDER: ProjectType[] = [
  "kitchen", "bathroom", "whole-home", "addition", "adu", "basement",
];

/* ══════════════════════════════════════════════════════════════════════
   REFINEMENT BUILDER  (exact logic per spec)
══════════════════════════════════════════════════════════════════════ */

/**
 * Assembles the engine refinements from what the visitor actually told us.
 *
 * The upgrade chips used to silently drive pricing: ticking a fourth chip set
 * plumbing and electrical to "full", so adding "Flooring" (which has nothing to
 * do with plumbing) quietly moved a kitchen from $53k-$66k to $57k-$72k and
 * printed "Full (complete update)" in the customer's confirmation email for a
 * scope they never chose. Inferring a systems scope from a checkbox count is
 * not defensible, so it is now asked directly and the chips only capture scope.
 *
 * The one inference kept is the whole-home "Layout" chip, because that chip
 * literally says layout: ticking it is a direct statement, not a guess.
 */
function buildRefinements(
  effectiveProject: ProjectType,
  _subtype: string,
  addOns: string[],
  subtypeRef: Partial<EstimateRefinements>,
  plumbingElectrical: PlumbingElectrical | null,
  cabinetTier: CabinetTier | null,
  bathroomCount: number | null,
  kitchenIncluded: boolean | null,
): EstimateRefinements {
  const ref: EstimateRefinements = { ...EMPTY_REFINEMENTS, ...subtypeRef };

  if (effectiveProject === "whole-home" && addOns.includes("layout")) {
    ref.layoutChanges = "moderate";
  }

  if (plumbingElectrical) ref.plumbingElectrical = plumbingElectrical;
  if (cabinetTier && effectiveProject === "kitchen") ref.cabinetTier = cabinetTier;

  if (bathroomCount !== null) ref.bathroomCount = bathroomCount;
  if (kitchenIncluded !== null) ref.kitchenIncluded = kitchenIncluded;

  // Kitchen and bathroom "what are you upgrading" chips scope the estimate: a
  // partial subset prices below a full remodel. Only pass them for those two
  // projects; other projects' chips describe inherent build components, not
  // optional finish scope, and must not scope the price.
  if (effectiveProject === "kitchen" || effectiveProject === "bathroom") {
    ref.upgradeScope = addOns.length > 0 ? [...addOns] : null;
  }

  return ref;
}

/* ══════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════ */

const FINISH_LABELS: Record<FinishLevel, string> = {
  refresh: "Refresh",
  "mid-range": "Mid-Range",
  "high-end": "High-End",
  luxury: "Luxury",
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */

interface EstimateCalculatorProps {
  inModal?: boolean;
  onBookVisit?: () => void;
}

export function EstimateCalculator({
  inModal = false,
  onBookVisit: onBookVisitProp,
}: EstimateCalculatorProps = {}) {

  /* ── State ── */
  const [activeProject, setActiveProject] = useState<ProjectType>("kitchen");
  const [subtype, setSubtype]             = useState<string>(() => defaultSubtypeFor("kitchen"));
  const [sqft, setSqft]                   = useState<number>(
    () => SUBTYPE_DATA.kitchen[defaultSubtypeFor("kitchen")].sqft,
  );
  const [addOns, setAddOns]               = useState<string[]>([]);
  const [finish, setFinish]               = useState<FinishLevel>("mid-range");
  const [budgetInput, setBudgetInput]     = useState<string>("");
  /* Nothing is pre-selected for the visitor. The state above still holds
     working values so the engine always has a valid input, but until the
     visitor makes each choice themselves nothing is shown as selected, the
     later steps stay hidden, and no estimate can be produced. Presenting a
     pre-filled answer invites people to accept a project they never chose. */
  /* Systems scope and cabinetry tier are asked outright rather than inferred
     from the upgrade chips, so nothing reaches the estimate or the email that
     the visitor did not choose. */
  const [peScope, setPeScope] = useState<PlumbingElectrical | null>(null);
  const [cabTier, setCabTier] = useState<CabinetTier | null>(null);
  /* Whole-home only. Bathrooms are the largest swing in a whole-home budget and
     were never asked; the kitchen is the second largest. Both are priced as
     modules against what the published rate already assumes. */
  const [bathCount, setBathCount] = useState<number | null>(null);
  /* Tracks whether the visitor explicitly tapped a bath-count button.
     Pre-filling bathCount from property data should NOT count as confirmed --
     the user must see and accept (or change) it before the finish scroll fires. */
  const [bathCountConfirmed, setBathCountConfirmed] = useState(false);
  const [kitchenIn, setKitchenIn] = useState<boolean | null>(null);
  /* True once the visitor overrides a pre-selected value, after which the
     profile stops overwriting their choice. */
  const [edited, setEdited] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [chosen, setChosen] = useState({ project: false, subtype: false, finish: false });
  /* Bathroom count and kitchen inclusion are REQUIRED wherever they are shown.
     Leaving them optional meant a skipped answer silently priced at whatever
     the published rate happens to assume, which is an assumption made on the
     homeowner's behalf about the single largest swing in the estimate. Asked
     and answered, never inferred. Declared after the visibility flags below. */
  const [scopeOpen, setScopeOpen]         = useState(false);
  const [takeoffOpen, setTakeoffOpen]     = useState(false);
  /*
   * Real unit costs recorded in the admin pricing panel. The estimator runs in
   * the browser and cannot read the database, so without this the homeowner
   * would see derived allocations while the confirmation email and the CRM
   * show measured costs. Fetched once; an empty map simply means every line is
   * still a derived allocation, which is the correct fallback.
   */
  const [unitCostOverrides, setUnitCostOverrides] = useState<UnitCostOverrides>({});
  const [legalOpen, setLegalOpen]         = useState(false);
  const [limitsOpen, setLimitsOpen]       = useState(false);
  /* Lead-gate three-state flow:
     gateOpen=false  gateSubmitted=false -> show "Get estimate" CTA
     gateOpen=true   gateSubmitted=false -> show contact form (gate)
     gateSubmitted=true (any gateOpen)   -> show full result panel */
  const [gateOpen,      setGateOpen]      = useState(false);
  const [gateSubmitted, setGateSubmitted] = useState(false);
  const [gateName,      setGateName]      = useState("");
  const [gateEmail,     setGateEmail]     = useState("");
  const [gatePhone,     setGatePhone]     = useState("");
  const [gateLoading,   setGateLoading]   = useState(false);
  const [gateError,     setGateError]     = useState<string | null>(null);
  /* Field-level messages, so a rejected submit points at the exact input to
     fix instead of a single banner the visitor has to decode. Each field
     clears its own message the moment it is edited. */
  const [gateFieldErrors, setGateFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});
  /* Property address. Collected here as well as on the consultation form: this
     gate is the path most leads arrive through, and without it the team cannot
     confirm the property is inside the service area, and the county property
     lookup that prepares the visit has nothing to work from. */
  const [gateAddress,   setGateAddress]   = useState("");
  const [gateProfile,   setGateProfile]   = useState<PropertyProfile | null>(null);
  /* Contact details we already hold for this visitor. Present means they have
     passed the gate before (possibly on an earlier visit), so the estimator is
     theirs to use freely: no re-entry, editable, and resubmittable. */
  const [savedIdentity, setSavedIdentity] = useState<{ name: string; email: string; phone: string } | null>(null);
  /* Signature of the estimate last sent to the team, so we can tell whether
     what is on screen now is actually new information worth resubmitting. */
  const [lastSentKey, setLastSentKey] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  /* Guards the estimator-completion conversion event so it fires at most once
     per mount even if the visitor recalculates after editing. */
  const engagementFired   = useRef(false);
  /* Scroll refs - each targets the top of the section that appears when the
     visitor completes a step. scheduleScroll() uses double-rAF so the DOM
     is fully painted before the browser scrolls. Instant on mobile (iOS
     smooth-scroll is unreliable); smooth on desktop. */
  const addressStepRef = useRef<HTMLDivElement>(null);
  const layoutRef      = useRef<HTMLDivElement>(null);
  const sizeRef        = useRef<HTMLDivElement>(null);
  const chipsRef       = useRef<HTMLDivElement>(null);
  const bathRef        = useRef<HTMLDivElement>(null);
  const kitchenRef     = useRef<HTMLDivElement>(null);
  const finishRef      = useRef<HTMLDivElement>(null);
  const typicalRef     = useRef<HTMLDivElement>(null);
  const ctaAreaRef     = useRef<HTMLDivElement>(null);
  const gateFormRef    = useRef<HTMLDivElement>(null);
  /* The gate <form> itself, so the sticky Continue control at the bottom of the
     step can submit it (the fields scroll above; the action stays pinned). */
  const gateSubmitRef  = useRef<HTMLFormElement>(null);
  const resultRef      = useRef<HTMLDivElement>(null);
  const sectionRef     = useRef<HTMLDivElement>(null);
  const allChosenScrolled  = useRef(false);
  /* Top of the wizard card. Every step change brings this just below the
     sticky site header so the new step heading is the first thing in view. */
  const topRef = useRef<HTMLDivElement>(null);
  /* The current step's heading. Moved to on every step change so a screen
     reader or keyboard user who is not visually tracking the scroll still
     gets told the step changed, not just a sighted user watching it scroll. */
  const headingRef = useRef<HTMLHeadingElement>(null);

  /* ── Guided step machine ──────────────────────────────────────────────
     The estimator is presented one screen at a time. `phase` is the coarse
     stage; within the form phase, `formIdx` points at a step in the dynamic
     `formStepIds` list (which grows or shrinks with the visitor's answers).
     `editReturn` remembers that the visitor jumped in from the review screen,
     so a single edit sends them straight back rather than through every step. */
  const [phase, setPhase] = useState<"form" | "review" | "gate" | "result">("form");
  const [formIdx, setFormIdx] = useState(0);
  const [editReturn, setEditReturn] = useState(false);
  /* Set to a step id when a single tap on that step has settled its answer, so
     the flow can carry the visitor forward on its own. Read by the auto-advance
     effect below (never acted on inline, to avoid a stale click-time answer). */
  const [pendingAdvance, setPendingAdvance] = useState<string | null>(null);

  /* Bring the current step heading into view, just below the sticky header. */
  function scrollWizardTop() {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const el = topRef.current;
      if (!el) return;
      const header = document.querySelector("header");
      const headerH = header ? header.getBoundingClientRect().height : 64;
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion ? "instant" : "smooth" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  /* Retained as a no-op so the historical selection handlers below stay intact
     while advancement is now driven by the sticky Back / Continue controls. */
  function scheduleScroll(_getEl: () => HTMLElement | null): boolean {
    return true;
  }

  /* ── Derived ── */
  const config = PROJECT_CONFIGS[activeProject];

  const effectiveProject = useMemo<ProjectType>(
    () => SUBTYPE_DATA[activeProject]?.[subtype]?.projectOverride ?? activeProject,
    [activeProject, subtype],
  );

  /* Finish options MUST come from effectiveProject to stay consistent with the engine */
  const availFinish = useMemo(
    () => getAvailableFinishLevels(effectiveProject),
    [effectiveProject],
  );

  /* When effectiveProject changes (subtype override), drop invalid finish selection */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing/unit-costs")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.overrides && typeof body.overrides === "object") {
          setUnitCostOverrides(body.overrides as UnitCostOverrides);
        }
      })
      .catch(() => {
        // Pricing must never be the reason the estimator fails to render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!availFinish.includes(finish)) setFinish("mid-range");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availFinish]);

  /* Size config (min / max / step / baseline) for the sqft slider, per project. */
  const sizeConfig = PROJECT_SIZE_CONFIG[effectiveProject];

  const refinements = useMemo<EstimateRefinements>(() => {
    const data = SUBTYPE_DATA[activeProject]?.[subtype];
    if (!data) return { ...EMPTY_REFINEMENTS };
    return buildRefinements(effectiveProject, subtype, addOns, data.refinements, peScope, cabTier, bathCount, kitchenIn);
  }, [effectiveProject, activeProject, subtype, addOns, peScope, cabTier, bathCount, kitchenIn]);

  const userRefinementCount = useMemo(
    () => countVisibleUserRefinements(effectiveProject, getSetRefinementKeys(refinements)),
    [effectiveProject, refinements],
  );

  /**
   * The quoted range now comes from the line-item cost engine.
   *
   * calculateEstimate still runs and still supplies everything that is not the
   * price - ROI, the typical-inclusions list, the confidence label - and it
   * remains the source of the market ceiling the cost engine's margin guard
   * prices against. Only priceLow and priceHigh are replaced, so every consumer
   * downstream (session storage, both emails, the CRM record) keeps working
   * against the same shape it always had.
   */
  /**
   * The homeowner's stated budget, compared against the range they can already
   * see. Kept as raw text so a typed "45,000" or "45000" both work and nothing
   * is reformatted under the cursor while they type.
   */
  const budgetValue = useMemo(() => {
    const n = Number(budgetInput.replace(/[^\d]/g, ""));
    // Below a few thousand it is a mistyped number, not a budget, and quoting
    // "unlikely to land near $45" back at someone is worse than saying nothing.
    return Number.isFinite(n) && n >= 3000 ? n : null;
  }, [budgetInput]);

  const result = useMemo<EstimateResult>(() => {
    const input: EstimateInput = { project: effectiveProject, finish, sqft, refinements };
    const guide = calculateEstimate(input, userRefinementCount);

    const maxFields = getMaxRefinementFields(effectiveProject);
    const detailRatio = maxFields > 0 ? userRefinementCount / maxFields : 0;
    const range = resolveQuotedRange(effectiveProject, finish, sqft, refinements, detailRatio);
    return range ? { ...guide, ...range } : guide;
  }, [effectiveProject, finish, sqft, refinements, userRefinementCount]);

  /**
   * Declared AFTER `result` on purpose: the comparison must follow the range
   * the homeowner is looking at, never a stale copy of it.
   */
  const budgetAssessment = useMemo(() => {
    if (budgetValue === null) return null;
    const internal = resolveInternalEstimate(effectiveProject, finish, sqft, refinements);
    const topTrades = internal ? internal.admin.trades.slice(0, 2).map((t) => t.division) : [];
    return assessBudget(
      effectiveProject,
      { quality: finish as QualityLevel, sqft, ...refinements } as unknown as ScopeSelections,
      { low: result.priceLow, high: result.priceHigh },
      budgetValue,
      topTrades,
    );
  }, [budgetValue, effectiveProject, finish, sqft, refinements, result.priceLow, result.priceHigh]);

  /* The visitor's literal card/chip choices, resolved to the exact labels shown
     on screen so the emails can restate them word for word. */
  const selectedLayoutLabel = useMemo(
    () =>
      chosen.subtype
        ? PROJECT_CONFIGS[activeProject].subtypes.find((s) => s.id === subtype)?.title
        : undefined,
    [chosen.subtype, activeProject, subtype],
  );

  const selectedUpgradeLabels = useMemo(() => {
    const chips = PROJECT_CONFIGS[activeProject].chips;
    return addOns
      .map((id) => chips.find((c) => c.id === id)?.label)
      .filter((l): l is string => !!l)
      // Chips render uppercase for the grid; title-case reads better in email.
      .map((l) => l.charAt(0) + l.slice(1).toLowerCase());
  }, [activeProject, addOns]);

  /* Exclusions, assumptions and cost drivers, from the same shared source the
     confirmation emails use, so the on-screen and emailed estimate never differ. */
  const disclosure = useMemo(
    () =>
      buildEstimateDisclosure({ project: effectiveProject, finish, sqft, refinements }),
    [effectiveProject, finish, sqft, refinements],
  );

  /* ── Persist to sessionStorage (live, on every change) ── */
  useEffect(() => {
    const input: EstimateInput = { project: effectiveProject, finish, sqft, refinements };
    sessionStorage.setItem(
      "brc_estimate",
      JSON.stringify({
        ...buildStoredEstimate(input, userRefinementCount),
        // buildStoredEstimate calls the guide engine directly, so without this
        // the stored record carried guide prices while the panel above showed
        // the line-item engine's. The consultation form, both emails and the
        // CRM all read this record, so the two must not diverge: take the
        // price from `result`, which is the number the visitor actually saw.
        priceLow: result.priceLow,
        priceHigh: result.priceHigh,
        // Carried alongside the engine result so the consultation form can
        // forward the visitor's literal choices to the emails. Without these
        // the emails could only show derived values (for example "moderate
        // layout changes") and never the card the visitor actually clicked.
        statedBudget: budgetValue,
        layoutLabel: selectedLayoutLabel,
        upgradeLabels: selectedUpgradeLabels,
      }),
    );
    window.dispatchEvent(new CustomEvent("brc_estimate_updated"));
  }, [effectiveProject, finish, sqft, refinements, userRefinementCount]);

  /* On mount: prefill the gate for pre-qualified traffic (e.g. a Meta Instant
     Form click that already captured their info) so it's a single tap, then
     restore gate state for return visits. We never skip the gate: contact is
     always captured on-site before the range is revealed. */
  useEffect(() => {
    const { prefill } = applyLeadParams();
    if (prefill.name) setGateName(prefill.name);
    if (prefill.email) setGateEmail(prefill.email);
    if (prefill.phone) setGatePhone(formatPhoneInput(prefill.phone));
    // A visitor who already gave us their details should never be asked again,
    // including on a later visit, so this reads durable storage and restores
    // both the gate state AND the saved contact info (needed to resubmit an
    // updated estimate without retyping anything).
    const saved = readStoredPrefill();
    if (saved.name) setGateName(saved.name);
    if (saved.email) setGateEmail(saved.email);
    if (saved.phone) setGatePhone(formatPhoneInput(saved.phone));
    if (saved.address) setGateAddress(saved.address);
    if (hasPassedGate()) {
      setGateSubmitted(true);
      setSavedIdentity({
        name: saved.name ?? "",
        email: saved.email ?? "",
        phone: saved.phone ?? "",
      });
      setLastSentKey(readLastSentKey());
    }
  }, []);

  /* ── Progress survives a refresh ─────────────────────────────────────
     Every answer and the visitor's place in the flow are mirrored to
     sessionStorage, so an accidental reload or a tab that briefly navigates
     away resumes exactly where they were instead of at question one. Session
     scope on purpose: contact identity is stored durably elsewhere, but a
     half-finished project description should not follow someone for weeks.

     The one rule on restore: a saved phase can never reveal more than the
     gate allows. "gate" resumes at review (the form re-opens cleanly from
     there), and "result" resumes at result only for a visitor who has
     actually passed the gate. */
  const PROGRESS_KEY = "brc_estimate_progress_v1";
  /* State, not a ref, on purpose: flipping it is batched into the same commit
     as the restored values, so the save effect below cannot fire in between
     with pre-restore defaults and clobber the record it was about to load.
     (With a ref it did exactly that, and dev StrictMode's second mount then
     restored the clobbered defaults.) */
  const [progressRestored, setProgressRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.v !== 1) return;
      if (!(p.activeProject in SUBTYPE_DATA)) return;
      const project = p.activeProject as ProjectType;
      if (typeof p.subtype !== "string" || !(p.subtype in SUBTYPE_DATA[project])) return;

      setActiveProject(project);
      setSubtype(p.subtype);
      /* A restored record is untrusted input: it survives deploys that may
         have changed size bounds, finish availability, or chip ids, and it is
         hand-editable. An out-of-range sqft used to flow to the engine, price
         on screen, and then be silently nulled server-side - a lead recorded
         with no estimate while the visitor saw "success". Clamp and filter
         against the same rules the live UI enforces. */
      const effProject: ProjectType =
        SUBTYPE_DATA[project]?.[p.subtype]?.projectOverride ?? project;
      if (typeof p.sqft === "number" && Number.isFinite(p.sqft)) {
        const sc = PROJECT_SIZE_CONFIG[effProject];
        setSqft(Math.min(sc.max, Math.max(sc.min, Math.round(p.sqft))));
      }
      if (Array.isArray(p.addOns)) {
        const validChips = new Set(PROJECT_CONFIGS[project].chips.map((c) => c.id));
        setAddOns(p.addOns.filter((a: unknown): a is string => typeof a === "string" && validChips.has(a)));
      }
      if (
        typeof p.finish === "string" &&
        getAvailableFinishLevels(effProject).includes(p.finish as FinishLevel)
      ) {
        setFinish(p.finish as FinishLevel);
      }
      if (typeof p.budgetInput === "string") setBudgetInput(p.budgetInput);
      if (p.peScope === null || typeof p.peScope === "string") setPeScope(p.peScope);
      if (p.cabTier === null || typeof p.cabTier === "string") setCabTier(p.cabTier);
      if (p.bathCount === null || typeof p.bathCount === "number") setBathCount(p.bathCount);
      if (typeof p.bathCountConfirmed === "boolean") setBathCountConfirmed(p.bathCountConfirmed);
      if (p.kitchenIn === null || typeof p.kitchenIn === "boolean") setKitchenIn(p.kitchenIn);
      if (typeof p.edited === "boolean") setEdited(p.edited);
      if (p.chosen && typeof p.chosen === "object") {
        setChosen({
          project: Boolean(p.chosen.project),
          subtype: Boolean(p.chosen.subtype),
          finish: Boolean(p.chosen.finish),
        });
      }
      if (typeof p.gateAddress === "string" && p.gateAddress) setGateAddress(p.gateAddress);
      if (typeof p.formIdx === "number") setFormIdx(Math.max(0, Math.floor(p.formIdx)));
      if (p.phase === "review" || p.phase === "gate") {
        setPhase("review");
      } else if (p.phase === "result" && hasPassedGate()) {
        setPhase("result");
      }
    } catch {
      /* A corrupt record just means starting fresh, never a broken estimator. */
    } finally {
      setProgressRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!progressRestored) return;
    try {
      sessionStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          v: 1,
          activeProject, subtype, sqft, addOns, finish, budgetInput,
          peScope, cabTier, bathCount, bathCountConfirmed, kitchenIn,
          edited, chosen, gateAddress, phase, formIdx,
        }),
      );
    } catch {
      /* Private mode / quota: the visitor simply loses refresh recovery. */
    }
  }, [
    progressRestored,
    activeProject, subtype, sqft, addOns, finish, budgetInput,
    peScope, cabTier, bathCount, bathCountConfirmed, kitchenIn,
    edited, chosen, gateAddress, phase, formIdx,
  ]);

  /* The budget deliberately survives a change of project type. It used to be
     cleared here because the brackets offered were per-project, so a kitchen
     bracket was meaningless once you switched to a bathroom. A plain number is
     not: what someone has to spend does not change because they clicked a
     different tab, and wiping it would silently drop the answer they gave. */

  /* ── Handlers ── */

  /* Estimator engagement is UPPER FUNNEL, not the primary conversion. The goal
     is: get an estimate on the site, then submit the consultation form - that
     submission is the Lead (fired with email/phone in ConsultationForm). This
     fires once per session on first real interaction or when a visit is booked,
     as InitiateCheckout / begin_checkout: it feeds a retargeting audience of
     people who started an estimate but have not submitted, and gives Meta higher
     early volume to optimize toward the real Lead. Not counted as a Lead, so no
     double-counting. */
  function fireEstimatorEngagement() {
    if (engagementFired.current) return;
    engagementFired.current = true;
    trackMetaEvent("InitiateCheckout", {
      content_name: effectiveProject,
      content_category: "remodel_estimate",
    });
    trackEvent("begin_checkout", { project: effectiveProject });
  }

  function handleSelectProject(type: ProjectType) {
    if (type === activeProject && chosen.project) return;
    const sub = defaultSubtypeFor(type);
    setActiveProject(type);
    setSubtype(sub);
    setSqft(SUBTYPE_DATA[type][sub].sqft);
    setAddOns([]);
    const avail = getAvailableFinishLevels(type);
    if (!avail.includes(finish)) setFinish("mid-range");
    setPeScope(null);
    setCabTier(null);
    setBathCount(null);
    setBathCountConfirmed(false);
    setKitchenIn(null);
    // Changing the project invalidates the layout and finish choices made under
    // the previous one, so the visitor picks those again rather than inheriting.
    allChosenScrolled.current = false;
    setChosen({ project: true, subtype: false, finish: false });
    fireEstimatorEngagement();
    /* Advance to the next step (address) directly from the tap, so it fires
       even when the visitor confirms the already-active default project. */
    scheduleScroll(() => addressStepRef.current);
  }

  /* Selecting a layout sets a smart default size, which the slider fine-tunes. */
  function handleSelectSubtype(id: string) {
    setSubtype(id);
    setChosen((p) => ({ ...p, subtype: true }));
    const data = SUBTYPE_DATA[activeProject]?.[id];
    if (data) {
      const c = PROJECT_SIZE_CONFIG[data.projectOverride ?? activeProject];
      setSqft(Math.max(c.min, Math.min(c.max, data.sqft)));
    }
    fireEstimatorEngagement();
    /* Advance to the next step (size) directly from the tap, so it also fires
       when the visitor re-picks a different layout later. */
    scheduleScroll(() => sizeRef.current);
  }

  function handleSelectFinish(level: FinishLevel) {
    setFinish(level);
    setChosen((p) => ({ ...p, finish: true }));
    fireEstimatorEngagement();
  }

  function handleToggleChip(id: string) {
    setAddOns((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    fireEstimatorEngagement();
  }

  function handleSqft(value: number) {
    setSqft(value);
    fireEstimatorEngagement();
  }

  function handleBookVisit() {
    fireEstimatorEngagement();
    if (onBookVisitProp) {
      onBookVisitProp();
    } else {
      document.getElementById("consult")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  /* "Start another estimate" from the result screen. Returns to the first step
     with a fresh project selection while keeping the contact details we already
     hold, so a second project never re-asks who they are. */
  function handleStartOver() {
    setPhase("form");
    setFormIdx(0);
    setEditReturn(false);
    setGateOpen(false);
    setChosen({ project: false, subtype: false, finish: false });
    setAddOns([]);
    scrollWizardTop();
  }

  /* ── Which questions are worth asking ──────────────────────────────────
     A question only earns a place if its answer can change the estimate for
     the work the visitor actually described. Asking about cabinetry when they
     never said they are touching cabinets is noise, and answering it would
     move a price for work that is not in scope. */

  /* Upgrade chips that imply plumbing or electrical work is in play. */
  const SYSTEMS_CHIPS: Record<ProjectType, string[]> = {
    kitchen: ["counters", "lighting"],
    bathroom: ["shower", "vanity", "tub"],
    "whole-home": ["kitchen", "baths", "layout"],
    addition: [],
    adu: [],
    basement: ["bath", "wet-bar", "egress"],
  };
  /* New construction always carries its own systems, whatever else is ticked. */
  const ALWAYS_HAS_SYSTEMS: ProjectType[] = ["addition", "adu"];

  const showCabinetry = effectiveProject === "kitchen" && addOns.includes("cabinets");
  /* Bathrooms drive a whole-home budget more than anything else, so the count is
     asked whenever baths are in scope. With no chips ticked the scope is still
     unknown and a whole-home almost always includes baths, so it is asked then
     too. The kitchen question appears the same way. */
  const showBathCount = getAssumedBathrooms(effectiveProject) !== null;
  /* When the "kitchen" chip is selected for a whole-home project the visitor
     has already answered the kitchen-included question implicitly (yes). Show
     the follow-up step only when the chip has NOT answered it. */
  const kitchenChipAnswersQuestion =
    effectiveProject === "whole-home" && addOns.includes("kitchen");
  const showKitchenIncluded =
    getKitchenQuestion(effectiveProject) !== null && !kitchenChipAnswersQuestion;
  const showSystems =
    ALWAYS_HAS_SYSTEMS.includes(effectiveProject) ||
    // No chips ticked means we do not know the scope yet, and systems work is
    // too big a cost driver to quietly assume away.
    addOns.length === 0 ||
    addOns.some((id) => SYSTEMS_CHIPS[effectiveProject].includes(id));

  /* A hidden question must not keep pricing the estimate. Clearing the value
     when its step disappears is what stops an invisible input from moving the
     number, which is the same failure the upgrade chips used to cause. */
  /* The estimator configures the project rather than interrogating the visitor.
     Choosing a finish level loads what that level typically includes, so nobody
     is asked whether their cabinetry is "semi-custom" or whether their plumbing
     counts as relocated. Both are shown and both are editable; once the visitor
     changes one, the profile stops touching their choices. */
  const typical = useMemo(
    () => getTypicalSelections(effectiveProject, finish),
    [effectiveProject, finish],
  );

  useEffect(() => {
    if (!chosen.finish || edited) return;
    setPeScope(typical.plumbingElectrical);
    setCabTier(typical.cabinetTier);
  }, [chosen.finish, edited, typical]);

  useEffect(() => {
    if (!showCabinetry) setCabTier((prev) => (prev === null ? prev : null));
  }, [showCabinetry]);
  useEffect(() => {
    if (!showSystems) setPeScope((prev) => (prev === null ? prev : null));
  }, [showSystems]);
  useEffect(() => {
    if (!showBathCount) setBathCount((prev) => (prev === null ? prev : null));
  }, [showBathCount]);
  useEffect(() => {
    if (!showKitchenIncluded) setKitchenIn((prev) => (prev === null ? prev : null));
  }, [showKitchenIncluded]);

  /* Sync kitchenIn with the whole-home kitchen chip selection. When the chip
     implicitly answers the kitchen question, set state to true so pricing is
     consistent with what the visitor indicated via the chip. When the chip is
     deselected, reset to null so the kitchen step shows as unanswered. */
  useEffect(() => {
    if (kitchenChipAnswersQuestion) {
      setKitchenIn(true);
    } else {
      setKitchenIn(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenChipAnswersQuestion]);

  /* Address scroll fires directly from handleSelectProject (see above), so it
     also works when the visitor confirms the already-active default project. */

  /* Size scroll fires directly from handleSelectSubtype (see above). */

  /* NOTE: sections that mount (bath count, kitchen, finish) never scroll by
     themselves anymore. Auto-scroll advances only in direct response to a
     user tap, from the click handlers below -- each tap moves to exactly the
     next step in visual sequence and can never skip an incomplete one. */

  /* Scroll to the typical-selections panel when finish is chosen. */
  useEffect(() => {
    if (chosen.finish) {
      scheduleScroll(() => typicalRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.finish]);

  /* Scroll to the gate form when it opens. */
  useEffect(() => {
    if (gateOpen) {
      scheduleScroll(() => gateFormRef.current);
    }
  }, [gateOpen]);

  /* The guided form steps, derived so a step that does not apply never leaves a
     gap in the sequence. "address" appears early so the property lookup can
     pre-fill the size slider; "details" is a short confirm-the-assumptions step
     that the visitor can accept in one tap. The dynamic steps (bathrooms,
     kitchen) always sit AFTER the answers that reveal them, so a plain index is
     safe: nothing before the current step can be added or removed. */
  const formStepIds: string[] = [
    "project",
    "address",
    "layout",
    "size",
    "upgrades",
    ...(showBathCount ? ["bathcount"] : []),
    ...(showKitchenIncluded ? ["kitchen"] : []),
    "finish",
    "details",
  ];
  const STEP_LABELS: Record<string, string> = {
    project: "Project",
    address: "Address",
    layout: "Layout",
    size: "Size",
    upgrades: "Upgrades",
    bathcount: "Bathrooms",
    kitchen: "Kitchen",
    finish: "Finish",
    details: "Details",
  };
  const safeFormIdx = Math.min(formIdx, formStepIds.length - 1);
  const currentFormId = formStepIds[safeFormIdx];

  /* Only the things a homeowner actually knows are required: their project,
     layout, size, finish, bathroom count and whether the kitchen is in scope.
     Cabinetry and systems scope are pre-selected from the finish profile, so
     they always hold a value and never block completion. */
  const allChosen =
    chosen.project &&
    chosen.subtype &&
    chosen.finish &&
    (!showBathCount || bathCount !== null) &&
    (!showKitchenIncluded || kitchenIn !== null);

  /* Whether the step currently on screen has the answer it requires before the
     visitor may continue. Address, size, upgrades and details are optional or
     always hold a working value, so they never block the Continue button. */
  function stepComplete(id: string): boolean {
    switch (id) {
      case "project":
        return chosen.project;
      case "layout":
        return chosen.subtype;
      case "finish":
        return chosen.finish;
      case "bathcount":
        return bathCount !== null;
      case "kitchen":
        return kitchenIn !== null;
      default:
        return true;
    }
  }

  /* The progress rail: every applicable form step, then Review, then the
     contact step (dropped for a returning visitor we already know). */
  const progressSteps: WizardStepMeta[] = [
    ...formStepIds.map((id) => ({ id, label: STEP_LABELS[id] })),
    { id: "review", label: "Review" },
    ...(gateSubmitted ? [] : [{ id: "gate", label: "Your details" }]),
  ];
  const progressIndex =
    phase === "form"
      ? safeFormIdx
      : phase === "review"
        ? formStepIds.length
        : phase === "gate"
          ? formStepIds.length + 1
          : progressSteps.length - 1;

  /* ── Navigation ── */
  function goToForm(id: string, fromReview = false) {
    const idx = formStepIds.indexOf(id);
    if (idx < 0) return;
    setEditReturn(fromReview);
    setFormIdx(idx);
    setPhase("form");
    scrollWizardTop();
  }

  function nextFromForm() {
    if (!stepComplete(currentFormId)) return;
    // An edit that arrived from the review screen returns there as soon as the
    // flow is complete again, so one change never marches the visitor back
    // through every later step they had already answered.
    if (editReturn && allChosen) {
      setEditReturn(false);
      setPhase("review");
      scrollWizardTop();
      return;
    }
    setEditReturn(false);
    if (safeFormIdx < formStepIds.length - 1) {
      setFormIdx(safeFormIdx + 1);
      scrollWizardTop();
    } else {
      setPhase("review");
      scrollWizardTop();
    }
  }

  function backFromForm() {
    if (editReturn) {
      setEditReturn(false);
      setPhase("review");
      scrollWizardTop();
      return;
    }
    if (safeFormIdx > 0) {
      setFormIdx(safeFormIdx - 1);
      scrollWizardTop();
    }
  }

  function reviewToNext() {
    if (!allChosen) return;
    if (gateSubmitted) {
      setPhase("result");
    } else {
      setGateOpen(true);
      setPhase("gate");
    }
    scrollWizardTop();
  }

  function goEditScope() {
    setPhase("review");
    scrollWizardTop();
  }

  /* ── Auto-advance ─────────────────────────────────────────────────────
     On a single-choice step (project, layout, finish, bathrooms, kitchen) a
     valid selection carries the visitor to the next screen on its own, so the
     tool feels like an app rather than a form. Three things make it reliable:

       1. It runs in an effect, not in the click handler, so it reads the answer
          React has just committed rather than the stale click-time value.
       2. It only fires for the step actually on screen, so a background write
          (the address lookup filling in a bathroom count, say) never jumps the
          flow, and a slider or multi-select step is never dragged forward.
       3. A short, reduced-motion-aware delay lets the selected state register
          and lets rapid re-taps settle on the final choice before moving.

     The sticky Continue stays present the whole time, so keyboard users and
     anyone who prefers to press it are never dependent on the auto-advance. */
  useEffect(() => {
    if (pendingAdvance == null) return;
    if (pendingAdvance !== currentFormId || phase !== "form" || !stepComplete(currentFormId)) {
      setPendingAdvance(null);
      return;
    }
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      setPendingAdvance(null);
      nextFromForm();
    }, prefersReducedMotion ? 0 : 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAdvance, phase, currentFormId, chosen, bathCount, kitchenIn, finish, editReturn, allChosen]);

  /* While the wizard owns the bottom of the viewport its own sticky Back /
     Continue (and, on the result, the next-step actions) must not sit under the
     site-wide Call / Text / Get-an-estimate bar. In the modal the wizard fills
     the screen, so the global bar is hidden for as long as it is mounted. Inline
     on a long page it is hidden only while the estimator section is on screen,
     so the global bar returns for the rest of the homepage. */
  useEffect(() => {
    if (inModal) {
      const release = requestHideMobileNavBar();
      return release;
    }
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let release: (() => void) | null = null;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !release) {
          release = requestHideMobileNavBar();
        } else if (!entry.isIntersecting && release) {
          release();
          release = null;
        }
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      release?.();
    };
  }, [inModal]);

  /* Identity of the current estimate. Used to tell whether the visitor has
     actually changed something since we last told the team about it. */
  const estimateKey = [
    effectiveProject, finish, sqft,
    JSON.stringify(refinements),
    selectedLayoutLabel ?? "",
    selectedUpgradeLabels.join("|"),
  ].join("~");

  const hasUnsentChanges = lastSentKey !== null && lastSentKey !== estimateKey;

  /* Send an UPDATED estimate using the contact details we already hold, so a
     visitor who reworks their project can tell us without retyping anything and
     the team sees the revision rather than the abandoned first pass. */
  async function handleResend() {
    if (!savedIdentity?.email) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/estimate-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: savedIdentity.name,
          email: savedIdentity.email,
          phone: savedIdentity.phone,
          projectType: effectiveProject,
          estimate: {
            project: effectiveProject,
            finish,
            sqft,
            priceLow: result.priceLow,
            priceHigh: result.priceHigh,
            roi: result.roi,
            refinements,
            statedBudget: budgetValue,
            layoutLabel: selectedLayoutLabel,
            upgradeLabels: selectedUpgradeLabels,
          },
        }),
      });
      if (!res.ok && res.status < 500) throw new Error(String(res.status));
      setLastSentKey(estimateKey);
      writeLastSentKey(estimateKey);
      setResendState("sent");
      trackEvent("generate_lead", { project: effectiveProject, source: "estimate_resend" });
    } catch {
      setResendState("error");
    }
  }

  /* Let the visitor correct details we hold. Reopens the gate prefilled, rather
     than wiping it, so editing is a change and not a re-registration. */
  function handleEditIdentity() {
    setGateSubmitted(false);
    setGateOpen(true);
    setResendState("idle");
    setPhase("gate");
    scrollWizardTop();
  }

  /* Forget this visitor on this device (shared computers, wrong person). The
     gate is no longer passed after this, so the result must leave the screen
     with it: the flow lands on review, one step short of the price. */
  function handleForgetIdentity() {
    clearStoredIdentity();
    setSavedIdentity(null);
    setGateSubmitted(false);
    setGateOpen(false);
    setLastSentKey(null);
    setResendState("idle");
    setGateName(""); setGateEmail(""); setGatePhone("");
    setPhase("review");
    scrollWizardTop();
  }

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();

    /* Explicit client-side validation before touching the API. Field by
       field, so the message sits on the input it is about and focus lands on
       the first one that needs attention. */
    const fieldErrors: typeof gateFieldErrors = {};
    if (!gateName.trim() || gateName.trim().length < 2) {
      fieldErrors.name = "Please enter your first name.";
    }
    if (!gateEmail.trim() || !isValidEmail(gateEmail)) {
      fieldErrors.email = "Please enter a valid email address.";
    }
    if (!isValidPhone(gatePhone)) {
      fieldErrors.phone = "Please enter a valid 10-digit phone number.";
    }
    if (!gateAddress.trim() || !HOUSE_NUMBER_REGEX.test(gateAddress.trim())) {
      fieldErrors.address = "Please enter your property address, including a house number.";
    }
    setGateFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setGateError(null);
      const firstInvalid = (["name", "email", "phone", "address"] as const).find((k) => fieldErrors[k]);
      if (firstInvalid) {
        document.getElementById(`gate-${firstInvalid}`)?.focus();
      }
      return;
    }
    /* Budget is optional: an extra required field before the number is friction
       and reads as a bait-and-switch. We still capture it when offered. */

    /* Carry the contact info they just entered to the consultation form, so
       booking a visit is one tap and never asks for name / email / phone again. */
    writeStoredPrefill({
      name: gateName.trim(),
      email: gateEmail.trim(),
      phone: gatePhone.trim(),
      address: gateAddress.trim(),
      zip: gateProfile?.zip?.slice(0, 5) || extractZip(gateAddress) || undefined,
    });

    setGateLoading(true);
    setGateError(null);

    const payload = {
      name: gateName.trim(),
      email: gateEmail.trim(),
      phone: gatePhone.trim(),
      /* The CRM's budget field is free text and predates this form, so it keeps
         receiving a readable string while `estimate.statedBudget` below carries
         the number the engine actually solves against. Omitted when blank: the
         API treats budget as optional but rejects "". */
      budget: budgetValue ? `$${budgetValue.toLocaleString("en-US")}` : undefined,
      projectType: effectiveProject,
      address: gateAddress.trim(),
      zip: gateProfile?.zip?.slice(0, 5) || extractZip(gateAddress) || undefined,
      propertyProfile: gateProfile,
      estimate: {
        project: effectiveProject,
        finish,
        sqft,
        priceLow: result.priceLow,
        priceHigh: result.priceHigh,
        roi: result.roi,
        refinements,
        statedBudget: budgetValue,
        layoutLabel: selectedLayoutLabel,
        upgradeLabels: selectedUpgradeLabels,
      },
    };

    try {
      const res = await fetch("/api/estimate-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        /* Happy path: contact captured, reveal result */
        trackMetaEvent("Lead", {
          content_name: effectiveProject,
          content_category: "estimate_gate",
        });
        trackEvent("generate_lead", { project: effectiveProject, source: "estimate_gate" });
        markGatePassed();
        setSavedIdentity({ name: gateName.trim(), email: gateEmail.trim(), phone: gatePhone.trim() });
        setLastSentKey(estimateKey);
        writeLastSentKey(estimateKey);
        setResendState("idle");
        setGateSubmitted(true);
        setPhase("result");
        scrollWizardTop();
      } else if (res.status >= 500) {
        /* Server/infra error: not the user's fault; reveal so they aren't hard-blocked */
        console.warn("[gate] Server error", res.status, "- revealing estimate anyway");
        markGatePassed();
        setGateSubmitted(true);
        setPhase("result");
        scrollWizardTop();
      } else {
        /* 4xx: our client validation should have caught this; show error, keep gate */
        console.warn("[gate] API returned", res.status);
        setGateError("We could not save your details just now. Please check your name, email, phone and address, then try again.");
        setGateLoading(false);
        return;
      }
    } catch (err) {
      /* Network failure: reveal so infra issues never block a real user */
      console.warn("[gate] Network error:", err);
      markGatePassed();
      setGateSubmitted(true);
      setPhase("result");
      scrollWizardTop();
    }

    setGateLoading(false);
  }

  /* ── Shared dark card class ── */
  function darkCard(active: boolean) {
    return cn(
      "relative rounded-md border text-left transition-all duration-200",
      active
        ? "border-accent-legible bg-accent/10 ring-2 ring-accent-legible/25 shadow-[0_0_0_1px_hsl(var(--accent-legible)/0.35)]"
        : "border-accent-legible/30 bg-inverse-foreground/[0.07] hover:border-accent-legible/55 hover:bg-inverse-foreground/[0.11] hover-elevate",
    );
  }

  /* Each step leads with a real heading. The progress rail above carries the
     count and section, so the number is not repeated here. */
  const renderStepLabel = (_stepKey: string, label: string, className?: string) => (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className={cn(
        "font-sans font-light text-[clamp(1.4rem,5.5vw,2rem)] leading-[1.12] tracking-tight text-inverse-foreground mb-4",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible rounded-sm",
        className,
      )}
      data-testid="step-heading"
    >
      {label}
    </h2>
  );

  function darkChoice(active: boolean) {
    return cn(
      "rounded-md border transition-all duration-200",
      active
        ? "border-accent-legible bg-accent/10 ring-2 ring-accent-legible/25 shadow-[0_0_0_1px_hsl(var(--accent-legible)/0.35)] text-inverse-foreground"
        : "border-accent-legible/30 bg-inverse-foreground/[0.07] text-inverse-muted hover:border-accent-legible/55 hover:bg-inverse-foreground/[0.11] hover-elevate",
    );
  }

  /* ══════════════════════════════
     SECTIONS
  ══════════════════════════════ */

  /* Step 1 - Project type: prominent card grid (matches the other inputs) */
  const projectGrid = (
    <div className="mb-6">
      {renderStepLabel("project", "Choose your project")}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
        role="radiogroup"
        aria-label="Project type"
      >
        {PROJECT_TYPE_ORDER.map((type) => {
          const pc = PROJECT_CONFIGS[type];
          const Icon = PROJECT_ICONS[type];
          const active = chosen.project && activeProject === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                handleSelectProject(type);
                setPendingAdvance("project");
              }}
              data-testid={`calc-tab-${type}`}
              className={cn(darkCard(active), "flex items-center gap-3 px-4 py-3.5 min-h-[58px]")}
            >
              <Icon
                className={cn("h-5 w-5 flex-shrink-0", active ? "text-accent-legible" : "text-inverse-muted")}
              />
              <span className="text-[15px] text-inverse-foreground leading-tight">{pc.tabLabel}</span>
              {active && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent-legible flex-shrink-0">
                  <Check className="h-3 w-3 text-inverse" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Compact intro shown only on the first step, so step one still reads as the
     start of a tool without the tall headline pushing the choices off screen. */
  const introEyebrow = (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] md:text-[11px] tracking-[0.14em] uppercase text-inverse-muted">
      <span className="inline-flex items-center gap-1.5 text-accent-legible/90">
        <Calculator className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        Cost estimator
      </span>
      <span className="opacity-40" aria-hidden="true">·</span>
      <span>Free</span>
      <span className="opacity-40" aria-hidden="true">·</span>
      <span>About 60 seconds</span>
      <span className="opacity-40" aria-hidden="true">·</span>
      <span>No obligation</span>
    </div>
  );

  /* Step 2 - Address (early, so property data pre-fills the size slider and
     the gate form never has to ask for it again). Optional here; required when
     the gate form is submitted. The onProfileResolved handler snaps sqft to the
     home's measured interior square footage, bounded by the project range. */
  const addressStep = (
    <div className="mt-6 scroll-mt-20" ref={addressStepRef}>
      {renderStepLabel("address", "Your property address")}
      <p className="-mt-2 mb-3 text-[12px] text-inverse-muted/90">
        Confirms we serve your area and auto-fills your home size if we find a match.
      </p>
      <AddressAutocomplete
        variant="inverse"
        value={gateAddress}
        onChange={setGateAddress}
        onProfileResolved={(profile) => {
          setGateProfile(profile);
          if (profile?.formattedAddress) setGateAddress(profile.formattedAddress);
          if (profile?.squareFootage) {
            setSqft(
              Math.max(sizeConfig.min, Math.min(sizeConfig.max, profile.squareFootage)),
            );
          }
          if (profile?.bathrooms !== undefined && showBathCount) {
            setBathCount(profile.bathrooms);
          }
          /* Do NOT auto-scroll to the layout step here. After the property card
             renders the subtype grid is immediately below it in the DOM; an extra
             scroll jump just disorients the visitor (perceived as "skipped step 2"
             or "jumped to the middle of step 3"). */
        }}
        data-testid="early-input-address"
      />
      <p className="mt-2 text-[12px] text-inverse-muted/90 leading-relaxed">
        Optional here -- you can skip ahead and fill it in later.
      </p>
    </div>
  );

  /* Step 3 - Layout / type (drives refinement complexity) */
  const subtypeGrid = (
    <div className="scroll-mt-20" ref={layoutRef}>
      {renderStepLabel("layout", config.gridLabel)}
      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={config.gridLabel}>
        {config.subtypes.map((opt) => {
          const Icon = opt.icon;
          const active = chosen.subtype && subtype === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                handleSelectSubtype(opt.id);
                setPendingAdvance("layout");
              }}
              data-testid={`calc-subtype-${opt.id}`}
              aria-pressed={active}
              className={cn(darkCard(active), "flex items-start gap-3 p-4 min-h-[76px]")}
            >
              {active && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent-legible flex-shrink-0">
                  <Check className="h-3 w-3 text-inverse" />
                </span>
              )}
              <Icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-accent-legible" />
              <span className="min-w-0 pr-5">
                <span className="block text-[15px] text-inverse-foreground leading-tight">
                  {opt.title}
                </span>
                <span className="block text-[12.5px] italic text-inverse-muted leading-snug mt-1">
                  {opt.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Step 4 - Size: a precise sqft slider (cost is very size-sensitive). The chosen
     layout pre-sets a smart default; the slider fine-tunes for accuracy.

     Built on Radix's Slider primitive rather than a bare <input type="range">
     - that hand-rolled control set `outline: none` with no focus-visible
     replacement, leaving keyboard users with no visible focus indicator on
     the estimator's highest-traffic control. Radix provides full keyboard
     support (arrow keys, Home/End, Page Up/Down), correct ARIA, and a
     focus-visible ring for free; the value-fill track is also native to
     Radix's Range element instead of a manually computed gradient. */
  const sizeGrid = (
    <div className="mt-6 scroll-mt-20" ref={sizeRef}>
      <div className="flex items-baseline justify-between mb-3">
        {renderStepLabel("size", "About how big?", "mb-0")}
        <span
          className="brc-display-num tabular-nums text-[22px] leading-none text-inverse-foreground"
          data-testid="calc-sqft-value"
        >
          {sqft.toLocaleString()}
          <span className="text-[13px] text-inverse-muted ml-1">sq ft</span>
        </span>
      </div>
      <SliderPrimitive.Root
        className="relative flex h-11 w-full touch-none select-none items-center"
        min={sizeConfig.min}
        max={sizeConfig.max}
        step={sizeConfig.step}
        value={[sqft]}
        onValueChange={([v]) => handleSqft(v)}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-inverse-foreground/[0.14]">
          <SliderPrimitive.Range className="absolute h-full bg-accent-legible" />
        </SliderPrimitive.Track>
        {/* aria-label belongs on the Thumb, not the Root - Radix puts
            role="slider" on the Thumb, so that is the element AT needs a
            name for. Root has no ARIA role of its own. */}
        <SliderPrimitive.Thumb
          data-testid="calc-sqft-slider"
          aria-label="Approximate square footage"
          className="block h-6 w-6 flex-shrink-0 rounded-full border-[3px] border-card bg-accent shadow-[0_2px_8px_hsl(var(--primary)/0.28)] transition-shadow hover:shadow-[0_2px_14px_hsl(var(--primary)/0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible focus-visible:ring-offset-2 focus-visible:ring-offset-inverse"
        />
      </SliderPrimitive.Root>
      <div className="flex justify-between mt-2 text-[12px] text-inverse-muted">
        <span>Compact ({sizeConfig.min.toLocaleString()})</span>
        <span>Large ({sizeConfig.max.toLocaleString()} sq ft)</span>
      </div>
      <p className="mt-2.5 text-[12.5px] text-inverse-muted/90 leading-relaxed">
        Not sure? The layout above sets a typical size. Drag only if your space is notably smaller or
        larger. Size is the biggest cost driver, so a closer number means a closer estimate.
      </p>
    </div>
  );

  /* Step 4 - Upgrades (optional add-ons) */
  const chipsRow = (
    <div className="mt-5 scroll-mt-20" ref={chipsRef}>
      {renderStepLabel("upgrades", config.chipsLabel)}
      <p className="-mt-2 mb-3 text-[12px] text-inverse-muted/90">
        {effectiveProject === "kitchen" || effectiveProject === "bathroom"
          ? "Pick only the parts you're redoing, or leave blank for a full remodel. This adjusts your range."
          : "Select all that apply. Optional, and it helps us understand your scope."}
      </p>
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        role="group"
        aria-label={config.chipsLabel}
      >
        {config.chips.map((chip) => {
          const Icon = chip.icon;
          const active = addOns.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleToggleChip(chip.id)}
              data-testid={`calc-chip-${chip.id}`}
              aria-pressed={active}
              className={cn(
                darkCard(active),
                "flex flex-col items-center justify-center gap-1.5 py-4 px-2 min-h-[68px] text-center",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-accent-legible" : "text-inverse-muted")} />
              <span className="text-[11.5px] tracking-[0.08em] uppercase text-inverse-foreground leading-tight">
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Step 5 - Systems scope. Asked outright because it is a real cost driver
     (up to 1.22x) that used to be inferred from how many upgrade chips were
     ticked, which meant a visitor could not see it and never agreed to it. */
  const systemsRow = (
    <div className="mt-5">
      {renderStepLabel("systems", getPlumbingElectricalLabel(effectiveProject))}
      <p className="-mt-2 mb-3 text-[12px] text-inverse-muted/90">
        Taking a sink out and putting it back in the same spot is routine. This is about whether pipes or circuits actually change location, which is where the cost is.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {getPlumbingElectricalOptions(effectiveProject).map((opt) => {
          const active = peScope === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPeScope(opt.value);
                setEdited(true);
                fireEstimatorEngagement();
              }}
              data-testid={`calc-systems-${opt.value}`}
              aria-pressed={active}
              className={cn(
                darkChoice(active),
                "py-3 px-3 min-h-[64px] flex flex-col items-center justify-center gap-0.5",
              )}
            >
              <span className="text-[13.5px] text-inverse-foreground leading-tight">{opt.label}</span>
              <span className="text-[11px] text-inverse-muted leading-tight">{opt.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Step 6 - Cabinetry tier (kitchens only). Previously assumed from the
     "Cabinets" chip; now an explicit choice. */
  const cabinetRow = (
    <div className="mt-5">
      {renderStepLabel("cabinetry", "Cabinetry")}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {([
          { value: "standard" as const, label: "Stock", sub: "Standard sizes and finishes" },
          { value: "semi-custom" as const, label: "Semi-Custom", sub: "More sizes, door styles, colors" },
          { value: "custom" as const, label: "Custom", sub: "Built to your exact space" },
        ]).map((opt) => {
          const active = cabTier === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setCabTier(opt.value);
                setEdited(true);
                fireEstimatorEngagement();
              }}
              data-testid={`calc-cabinets-${opt.value}`}
              aria-pressed={active}
              className={cn(
                darkChoice(active),
                "py-3 px-3 min-h-[64px] flex flex-col items-center justify-center gap-0.5",
              )}
            >
              <span className="text-[13.5px] text-inverse-foreground leading-tight">{opt.label}</span>
              <span className="text-[11px] text-inverse-muted leading-tight">{opt.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Whole-home: bathroom count. The published whole-home rate already assumes
     two, so this prices the difference rather than the whole thing. */
  const bathCountRow = (
    <div className="mt-5 scroll-mt-20" ref={bathRef}>
      {renderStepLabel("bathcount", "How many bathrooms?")}
      <p className="-mt-2 mb-3 text-[12px] text-inverse-muted/90">
        {effectiveProject === "whole-home"
          ? "Bathrooms move a whole-home budget more than any other room. Count every one in the project."
          : "A bathroom is one of the largest single line items here. Count every one included."}
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {(() => {
          // The top of the range must reach at least the count the rate already
          // assumes for this home size, or a large home cannot be described
          // accurately: whole-home's assumed reference scales with area (about
          // one bath per 1,000 sq ft), so an 8,000 sq ft home assumes 8. Capping
          // the buttons at 6 there meant selecting the max still priced BELOW
          // not answering, because it read as removing two baths from the rate.
          const start = getAssumedBathrooms(effectiveProject) === 0 ? 0 : 1;
          const assumedForSize = getAssumedBathroomsForSize(effectiveProject, sqft) ?? 0;
          const max = Math.max(6, assumedForSize);
          return Array.from({ length: max - start + 1 }, (_, i) => start + i);
        })().map((n) => {
          const active = bathCount === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setBathCount(n);
                setBathCountConfirmed(true);
                fireEstimatorEngagement();
                setPendingAdvance("bathcount");
              }}
              data-testid={`calc-baths-${n}`}
              aria-pressed={active}
              className={cn(
                darkChoice(active),
                "py-3 min-h-[52px] text-[15px]",
              )}
            >
              {n === 0 ? "None" : `${n}${n === 6 ? "+" : ""}`}
            </button>
          );
        })}
      </div>
    </div>
  );

  const kitchenRow = (() => {
    const q = getKitchenQuestion(effectiveProject);
    const label = q?.isWetBar
      ? "Is there a wet bar or kitchenette?"
      : q?.isDowngrade
        ? "What kind of kitchen?"
        : "Is the kitchen part of it?";
    const opts = q?.isWetBar
      ? [
          { value: true, label: "Yes", sub: "Wet bar or kitchenette" },
          { value: false, label: "No", sub: "No sink or cabinetry down there" },
        ]
      : q?.isDowngrade
        ? [
            { value: true, label: "Full kitchen", sub: "Full-size appliances and run" },
            { value: false, label: "Kitchenette", sub: "Compact galley or efficiency" },
          ]
        : [
            { value: true, label: "Yes", sub: "Kitchen is part of the project" },
            { value: false, label: "No", sub: "Leaving the kitchen as is" },
          ];
    return (
      <div className="mt-5 scroll-mt-20" ref={kitchenRef}>
        {renderStepLabel("kitchen", label)}
        <div className="grid grid-cols-2 gap-2">
          {opts.map((opt) => {
            const active = kitchenIn === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  setKitchenIn(opt.value);
                  fireEstimatorEngagement();
                  setPendingAdvance("kitchen");
                }}
                data-testid={`calc-kitchen-${opt.value ? "yes" : "no"}`}
                aria-pressed={active}
                className={cn(
                  darkChoice(active),
                  "py-3 px-3 min-h-[64px] flex flex-col items-center justify-center gap-0.5",
                )}
              >
                <span className="text-[13.5px] text-inverse-foreground leading-tight">{opt.label}</span>
                <span className="text-[11px] text-inverse-muted leading-tight">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  })();

  /* What we have pre-selected, stated plainly. This replaces two questions the
     visitor could not answer without a paragraph of explanation, and it reads as
     competence rather than as a form: the estimator already understands the
     project. Editing is one tap away for the minority who want it. */
  const typicalPanel = (
    <div className="mt-6 scroll-mt-20" ref={typicalRef}>
      {renderStepLabel("details", "Confirm the details")}
      <div className="rounded-md border border-accent-legible/30 bg-inverse-foreground/[0.05] p-4 shadow-[inset_0_0_0_1px_hsl(var(--accent-legible)/0.08)]">
      <p className="text-[13px] tracking-[0.06em] uppercase text-inverse-foreground">
        Typical for a {FINISH_LABELS[finish]} {config.tabLabel.toLowerCase()}
      </p>
      <p className="mt-1 text-[12px] text-inverse-muted">
        We have pre-selected what is most common. Nothing here is locked in.
      </p>
      <ul className="mt-3 space-y-1.5">
        {typical.summary.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-inverse-muted leading-snug">
            <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-accent-legible" />
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setEditOpen((v) => !v)}
        aria-expanded={editOpen}
        data-testid="button-edit-assumptions"
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-inverse-foreground underline underline-offset-2 hover:opacity-80"
      >
        Need to adjust anything?
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", editOpen && "rotate-180")} />
      </button>
      {editOpen && (
        <div className="mt-1">
          {showSystems && systemsRow}
          {showCabinetry && cabinetRow}
        </div>
      )}
      </div>
    </div>
  );

  /* Finish level (options tied to effectiveProject) */
  const finishRow = (
    <div className="mt-5 scroll-mt-20" ref={finishRef}>
      {renderStepLabel("finish", "Finish level")}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {availFinish.map((level) => {
          const active = chosen.finish && finish === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => {
                handleSelectFinish(level);
                setPendingAdvance("finish");
              }}
              data-testid={`calc-finish-${level}`}
              aria-pressed={active}
              className={cn(
                darkChoice(active),
                "py-3 px-2 min-h-[64px] flex flex-col items-center justify-center gap-0.5",
              )}
            >
              {/* Finish is the single biggest price driver (roughly 2x per tier),
                  so it gets the same explanatory subtitle the other cards have. */}
              <span className="text-[13.5px] text-inverse-foreground leading-tight">
                {ENGINE_FINISH_LABELS[level].label}
              </span>
              <span className="text-[11px] text-inverse-muted leading-tight">
                {ENGINE_FINISH_LABELS[level].sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* Live planning range - always visible, updates as selections change */
  const resultPanel = (
    <div className="scroll-mt-20" ref={resultRef} aria-live="polite" aria-atomic="true">
      <div className="space-y-5">
          {/* Price range */}
          <div>
            <p className="text-[12px] tracking-[0.14em] uppercase text-inverse-muted mb-2">
              Your planning range
            </p>
            <div
              className="brc-display-num tabular-nums leading-none text-inverse-foreground text-[clamp(32px,8vw,52px)]"
              data-testid="estimate-range"
            >
              {formatPlanningCurrency(result.priceLow)}
              <span className="text-inverse-muted/90 mx-2 text-xl">to</span>
              {formatPlanningCurrency(result.priceHigh)}
            </div>
            <p className="mt-2.5 text-[14px] text-inverse-muted">
              Typical resale return for this project type: about {result.roi}%.
            </p>
            {/* Always visible, never behind a toggle: a homeowner must not be
                able to leave this screen thinking they were given a price. */}
            <p className="mt-3 text-[12.5px] text-inverse-foreground/90 leading-relaxed font-normal">
              {NOT_A_QUOTE_NOTICE}
            </p>
            <p className="mt-1.5 text-[12.5px] text-inverse-muted/90 leading-relaxed">
              {ONSITE_REQUIRED_NOTICE}
            </p>
            {/* Reassuring scope-editing action sits right under the number, so a
                homeowner who is surprised by the range can adjust it without
                hunting. The same action is mirrored in the sticky bar below. */}
            <EditScopeCta onClick={goEditScope} className="mt-4" testId="edit-scope-cta-inline" />
          </div>

          {/* THE ANSWER TO THE BUDGET ASKED IN THE GATE. There is no second
              input here: the homeowner has already given us the number, and
              asking again would read as though we had not been listening.
              This block is the reply, and it re-solves itself whenever they
              change a selection above. */}
          {budgetAssessment && (
            <div className="border-t border-inverse-foreground/10 pt-4">
              <div className="rounded-sm bg-inverse-foreground/[0.06] border border-inverse-foreground/12 p-4" data-testid="budget-assessment">
                <p className="text-[14px] text-inverse-foreground leading-relaxed">
                  {budgetAssessment.headline}
                </p>
                {budgetAssessment.driver && (
                  <p className="mt-1.5 text-[13px] text-inverse-muted leading-relaxed">
                    {budgetAssessment.driver}
                  </p>
                )}
                {budgetGuidance(budgetAssessment) && (
                  <p className="mt-2.5 text-[13.5px] text-inverse-foreground leading-relaxed">
                    {budgetGuidance(budgetAssessment)}
                  </p>
                )}
                {budgetAssessment.options.length > 1 && (
                  <ul className="mt-3 space-y-1.5">
                    {budgetAssessment.options.slice(1).map((o) => (
                      <li key={o.label} className="text-[13px] text-inverse-muted leading-relaxed">
                        {/* Full dollars, not the compact form used for the
                            headline range: this list sits directly under a
                            sentence written in full dollars, and mixing
                            "$19,000" with "$19k" two lines apart reads as two
                            different numbers. */}
                        Or {o.label}: ${o.low.toLocaleString("en-US")} to $
                        {o.high.toLocaleString("en-US")}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[12px] text-inverse-muted/90 leading-relaxed">
                  {BUDGET_BASIS_NOTE}
                </p>
              </div>
            </div>
          )}

          {/* Scope accordion */}
          <div className="border-t border-inverse-foreground/10 pt-4">
            <button
              type="button"
              onClick={() => setScopeOpen((p) => !p)}
              className="flex w-full items-center justify-between text-left"
              data-testid="button-toggle-scope"
              aria-expanded={scopeOpen}
            >
              <span className="text-[13px] tracking-[0.06em] uppercase text-inverse-foreground">
                What&apos;s typically included ({result.included.length})
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-inverse-muted transition-transform", scopeOpen && "rotate-180")}
              />
            </button>
            {scopeOpen && (
              <div className="pt-3 space-y-2">
                {result.included.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-[13.5px] text-inverse-muted leading-snug"
                    data-testid={`included-item-${i}`}
                  >
                    <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-accent-legible" />
                    {item}
                  </div>
                ))}
                <p className="text-[12px] text-inverse-muted/90 pt-1.5 leading-relaxed">
                  {INCLUDED_SCOPE_NOTE}
                </p>
                {effectiveProject === "kitchen" && (
                  <p className="text-[12px] text-inverse-muted/90 leading-relaxed">
                    {APPLIANCE_DISCLAIMER}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Scope breakdown. Collapsed by default: most homeowners want the
              range, and the ones who want to know what is behind it get the
              trades and quantities it was built from. Deliberately no per-line
              dollars - see TAKEOFF_SCOPE_NOTICE. */}
          <div className="border-t border-inverse-foreground/10 pt-4">
            <button
              type="button"
              onClick={() => setTakeoffOpen((p) => !p)}
              className="flex w-full items-center justify-between text-left"
              data-testid="button-toggle-takeoff"
              aria-expanded={takeoffOpen}
            >
              <span className="text-[13px] tracking-[0.06em] uppercase text-inverse-foreground">
                The work this range covers
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-inverse-muted transition-transform", takeoffOpen && "rotate-180")}
              />
            </button>
            {takeoffOpen && (() => {
              // Clients never see PM or overhead itemized; those dollars are
              // folded proportionally into the visible lines (same total).
              const takeoff = takeoffForClient(
                takeoffForRange(
                  effectiveProject,
                  finish,
                  sqft,
                  result.priceLow,
                  result.priceHigh,
                  unitCostOverrides,
                ),
              );
              const group = (g: "direct" | "soft") =>
                takeoff.lines.filter((l) => l.group === g && l.cost > 0);
              const groupLabel = "text-[11.5px] tracking-[0.1em] uppercase text-inverse-muted/90 pt-2.5 pb-1";
              // Scope and quantities only. Per-line dollars were removed from
              // every lead-facing surface: they are proportional allocations of
              // a validated total, not priced quantities, so showing them
              // claimed a precision the model does not have and created a
              // negotiating anchor before anyone had seen the house. See
              // TAKEOFF_SCOPE_NOTICE.
              const row = (l: (typeof takeoff.lines)[number]) => {
                const qty = formatQuantity(l);
                return (
                  <div
                    key={l.id}
                    className="text-[13.5px] text-inverse-muted leading-snug py-1"
                    data-testid={`takeoff-line-${l.id}`}
                  >
                    <span>
                      {l.label}
                      {qty && <span className="text-inverse-muted/90"> ({qty})</span>}
                    </span>
                  </div>
                );
              };
              return (
                <div className="pt-2">
                  <p className={groupLabel}>The work</p>
                  {group("direct").map(row)}
                  <p className={groupLabel}>Running the job</p>
                  {group("soft").map(row)}
                  <p className="text-[12px] text-inverse-muted/90 pt-3 leading-relaxed">
                    {TAKEOFF_SCOPE_NOTICE}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Exclusions, assumptions and cost drivers. Collapsed so the panel
              stays scannable, but the content is complete and comes from the
              same source as the confirmation email. */}
          <div className="border-t border-inverse-foreground/10 pt-4">
            <button
              type="button"
              onClick={() => setLimitsOpen((p) => !p)}
              className="flex w-full items-center justify-between text-left"
              data-testid="button-toggle-limits"
              aria-expanded={limitsOpen}
            >
              <span className="text-[13px] tracking-[0.06em] uppercase text-inverse-foreground">
                What&apos;s not included &amp; what could change it
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-inverse-muted transition-transform", limitsOpen && "rotate-180")}
              />
            </button>
            {limitsOpen && (
              <div className="pt-3 space-y-5">
                <div>
                  <p className="text-[12px] tracking-[0.1em] uppercase text-inverse-muted mb-2">
                    Not included
                  </p>
                  <ul className="space-y-1.5">
                    {disclosure.excludes.map((item, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-inverse-muted leading-snug pl-4 relative before:content-['\00d7'] before:absolute before:left-0 before:text-inverse-muted/90"
                        data-testid={`excluded-item-${i}`}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[12px] tracking-[0.1em] uppercase text-inverse-muted mb-2">
                    What we assumed
                  </p>
                  <ul className="space-y-1.5">
                    {disclosure.assumptions.map((item, i) => (
                      <li key={i} className="text-[13px] text-inverse-muted leading-snug pl-4 relative before:content-['\2022'] before:absolute before:left-0 before:text-inverse-muted/90">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[12px] tracking-[0.1em] uppercase text-inverse-muted mb-2">
                      Could raise the cost
                    </p>
                    <ul className="space-y-1.5">
                      {disclosure.increases.map((item, i) => (
                        <li key={i} className="text-[13px] text-inverse-muted leading-snug pl-4 relative before:content-['\2191'] before:absolute before:left-0 before:text-inverse-muted/90">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[12px] tracking-[0.1em] uppercase text-inverse-muted mb-2">
                      Could lower the cost
                    </p>
                    <ul className="space-y-1.5">
                      {disclosure.decreases.map((item, i) => (
                        <li key={i} className="text-[13px] text-inverse-muted leading-snug pl-4 relative before:content-['\2193'] before:absolute before:left-0 before:text-inverse-muted/90">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] tracking-[0.1em] uppercase text-inverse-muted mb-2">
                    Optional upgrades that add cost
                  </p>
                  <ul className="space-y-1.5">
                    {disclosure.upgrades.map((item, i) => (
                      <li key={i} className="text-[13px] text-inverse-muted leading-snug pl-4 relative before:content-['\002b'] before:absolute before:left-0 before:text-inverse-muted/90">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Legal */}
          <div>
            <button
              type="button"
              onClick={() => setLegalOpen((p) => !p)}
              className="flex items-center gap-1.5 text-[12px] text-inverse-muted/90 hover:text-inverse-muted transition-colors"
              aria-expanded={legalOpen}
            >
              Why a range, not a fixed price?
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", legalOpen && "rotate-180")} />
            </button>
            {legalOpen && (
              <p className="text-[12px] text-inverse-muted/90 leading-relaxed mt-2">
                Planning estimate only, not a proposal, bid, or guaranteed cost. Ranges reflect
                project type, size, location, and finish assumptions. Your consultation delivers a
                detailed evaluation tailored to your home.
              </p>
            )}
          </div>

          {/* Who we already have on file. Shown once the visitor has passed the
              gate so the estimator is theirs to use freely: they can keep
              changing selections without being asked again, correct what we
              hold, or send us the revised numbers. */}
          {savedIdentity?.email && (
            <div className="rounded-md border border-inverse-foreground/[0.12] bg-inverse-foreground/[0.04] p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] text-inverse-muted">
                    Saved on this device, so you can keep exploring without re-entering anything
                  </p>
                  <p className="text-[13.5px] text-inverse-foreground mt-0.5 truncate">
                    {savedIdentity.name}
                    {savedIdentity.email ? ` · ${savedIdentity.email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleEditIdentity}
                    data-testid="button-edit-identity"
                    className="text-[12px] text-inverse-foreground underline underline-offset-2 hover:opacity-80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleForgetIdentity}
                    data-testid="button-forget-identity"
                    className="text-[12px] text-inverse-muted hover:text-inverse-foreground"
                  >
                    Not you?
                  </button>
                </div>
              </div>

              {/* Resubmitting is only meaningful once something has actually
                  changed, so the prompt appears rather than sitting there
                  inviting duplicate leads. */}
              {hasUnsentChanges && resendState !== "sent" && (
                <div className="mt-3 pt-3 border-t border-inverse-foreground/10">
                  <p className="text-[12px] text-inverse-muted mb-2">
                    You have changed your project since we last heard from you.
                  </p>
                  <Button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === "sending"}
                    data-testid="button-resend-estimate"
                    variant="brandOutline"
                    className="h-10 text-[12.5px] tracking-[0.08em] uppercase"
                  >
                    {resendState === "sending" ? "Sending…" : "Send us my updated estimate"}
                  </Button>
                  {resendState === "error" && (
                    <p className="text-[12px] text-destructive mt-2">
                      That did not go through. Please try again.
                    </p>
                  )}
                </div>
              )}

              {resendState === "sent" && (
                <p className="mt-3 pt-3 border-t border-inverse-foreground/10 text-[12px] text-accent-legible">
                  Sent. We have your updated numbers and will follow up on these.
                </p>
              )}
            </div>
          )}

      </div>
    </div>
  );

  /* Lead-gate panel - shown in place of the result until contact info is submitted */
  const subtypeTitle =
    config.subtypes.find((s) => s.id === subtype)?.title ?? config.tabLabel;

  const leadsGatePanel = (
    <div className="scroll-mt-20" ref={gateFormRef} aria-label="Unlock your estimate">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-legible/20">
            <Lock className="h-4 w-4 text-accent-legible" />
          </div>
          <div>
            <p className="text-[18px] font-light text-inverse-foreground leading-tight">
              Your estimate is ready
            </p>
            <p className="text-[13px] text-inverse-muted mt-0.5">
              Enter your info below to see it
            </p>
          </div>
        </div>

        {/* Project summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-inverse-foreground/[0.08] border border-inverse-foreground/15 text-[11.5px] text-inverse-foreground">
            {config.tabLabel}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-inverse-foreground/[0.08] border border-inverse-foreground/15 text-[11.5px] text-inverse-foreground">
            {subtypeTitle}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-inverse-foreground/[0.08] border border-inverse-foreground/15 text-[11.5px] text-inverse-foreground">
            {FINISH_LABELS[finish]}
          </span>
        </div>

        {/* Blurred price teaser. A MASK, NEVER THE NUMBER: the real range must
            not exist anywhere in the DOM until the gate is passed, and a CSS
            blur over the true figures is one devtools click from a free
            estimate. The mask is the same for every project so its shape
            carries no information either. */}
        <div className="relative select-none">
          <div
            className="brc-display-num tabular-nums leading-none text-inverse-foreground text-[clamp(32px,8vw,52px)] blur-sm pointer-events-none"
            aria-hidden="true"
          >
            {"$●●,●●●"}
            <span className="text-inverse-muted/90 mx-2 text-xl">to</span>
            {"$●●,●●●"}
          </div>
          <div className="absolute inset-0 flex items-center">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-inverse-muted bg-inverse px-3 py-1.5 rounded-full border border-inverse-foreground/15">
              <Lock className="h-3 w-3" />
              Enter your info to unlock
            </span>
          </div>
        </div>

        {/* Contact form. The submit control lives in the sticky step nav below,
            so on a phone the primary action is always pinned within thumb reach
            even while the visitor scrolls through the fields. */}
        {/* noValidate: the handler below runs our inline, styled, per-field
            validation on every submit, so the browser's native bubbles never
            compete with it (two different error styles for one form). */}
        <form ref={gateSubmitRef} onSubmit={handleGateSubmit} noValidate className="space-y-3">
          <TextField
            id="gate-name"
            label="First name"
            required
            value={gateName}
            onChange={(v) => {
              setGateName(v);
              setGateFieldErrors((p) => (p.name ? { ...p, name: undefined } : p));
            }}
            autoComplete="given-name"
            error={gateFieldErrors.name}
            testId="gate-input-name"
          />
          <TextField
            id="gate-email"
            label="Email address"
            required
            type="email"
            value={gateEmail}
            onChange={(v) => {
              setGateEmail(v);
              setGateFieldErrors((p) => (p.email ? { ...p, email: undefined } : p));
            }}
            autoComplete="email"
            inputMode="email"
            error={gateFieldErrors.email}
            testId="gate-input-email"
          />
          <TextField
            id="gate-phone"
            label="Phone number"
            required
            type="tel"
            value={gatePhone}
            onChange={(v) => {
              setGatePhone(formatPhoneInput(v));
              setGateFieldErrors((p) => (p.phone ? { ...p, phone: undefined } : p));
            }}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(208) 555-0123"
            error={gateFieldErrors.phone}
            testId="gate-input-phone"
          />

          {/* Address was collected in step 2. Show a read-only confirmation when
              already filled. When skipped, offer the same autocomplete the
              address step has, so the fallback is not a lesser control. */}
          {gateAddress.trim() && !gateFieldErrors.address ? (
            <div className="rounded-md border border-inverse-foreground/15 bg-inverse-foreground/[0.04] px-4 py-3">
              <p className="text-[11px] text-inverse-muted/90 mb-0.5 uppercase tracking-wide">Property address</p>
              <p className="text-[13.5px] text-inverse-foreground leading-snug">{gateAddress}</p>
              <p className="mt-1 text-[11px] text-inverse-muted/90">Go back to the Address step to change this.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="gate-address" className="mb-1.5 block text-[12.5px] text-inverse-muted">
                Property address<span className="text-accent-legible"> *</span>
              </label>
              <AddressAutocomplete
                id="gate-address"
                variant="inverse"
                value={gateAddress}
                onChange={(v) => {
                  setGateAddress(v);
                  setGateFieldErrors((p) => (p.address ? { ...p, address: undefined } : p));
                }}
                onProfileResolved={(profile) => {
                  setGateProfile(profile);
                  if (profile?.formattedAddress) setGateAddress(profile.formattedAddress);
                }}
                data-testid="gate-input-address"
              />
              {gateFieldErrors.address ? (
                <p className="mt-1.5 text-[12.5px] text-destructive" role="alert">
                  {gateFieldErrors.address}
                </p>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-inverse-muted/90">
                  So we can confirm we serve your area and check county records before your visit.
                </p>
              )}
            </div>
          )}
          {/* THE ONE BUDGET ASK. Asked here, before the range, so the estimate
              we hand back can be framed against it straight away and so the
              team has a real number for every lead who gets this far, not only
              the ones who go on to book a visit.

              A number rather than a bracket: "$25,000 - $50,000" is too coarse
              to solve against, and the trade-off engine needs an actual figure
              to test selections at. Optional, and never a condition of seeing
              the range - an extra required field here reads as a
              bait-and-switch. */}
          <div>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-inverse-muted/90"
                aria-hidden="true"
              >
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value.replace(/[^\d,]/g, ""))}
                placeholder="Budget you are working toward (optional)"
                /* 16px: iOS Safari zooms the page when a focused input renders
                   below 16px and does not zoom back out. */
                className="w-full bg-inverse-foreground/[0.07] border border-inverse-foreground/20 rounded-md pl-8 pr-4 py-3 text-[16px] text-inverse-foreground placeholder:text-[14px] placeholder:text-inverse-muted/90 outline-none focus:border-inverse-foreground/50 transition-colors"
                data-testid="gate-input-budget"
                aria-label="Budget you are working toward (optional)"
                aria-describedby="brc-gate-budget-help"
              />
            </div>
            <p id="brc-gate-budget-help" className="mt-1.5 text-[11.5px] text-inverse-muted/90">
              If you share it, we will show you what fits and what to change if it does not.
              It never changes what we charge.
            </p>
          </div>
          {gateError && (
            // role="alert" so a screen reader announces the validation message
            // the moment it appears; native required-field errors are announced
            // by the browser, but these format checks are ours to surface.
            <p role="alert" className="text-[12px] text-red-400">{gateError}</p>
          )}
          {/* A hidden native submit keeps Enter-to-submit working for keyboard
              users; the visible primary action is the sticky Continue below. */}
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="button-gate-submit">
            Reveal My Estimate
          </button>
          <p className="text-[12px] text-inverse-muted/90 text-center leading-relaxed">
            We will email you a copy too. No spam, ever.
          </p>
        </form>
      </div>
    </div>
  );

  /* ══════════════════════════════
     GUIDED STEP MACHINE
  ══════════════════════════════ */

  /* Each form step id maps to the single screen shown for it. Only one screen is
     ever mounted, so the visitor never scrolls past questions they have already
     answered, and never sees a choice for a step they have not reached. */
  const formStepBodies: Record<string, React.ReactNode> = {
    project: projectGrid,
    address: addressStep,
    layout: subtypeGrid,
    size: sizeGrid,
    upgrades: chipsRow,
    bathcount: bathCountRow,
    kitchen: kitchenRow,
    finish: finishRow,
    details: typicalPanel,
  };

  /* Selected upgrade chips rendered as plain labels on the review screen. */
  const reviewChipLabels = config.chips
    .filter((c) => addOns.includes(c.id))
    .map((c) => c.label);

  /* One review card per step. Each Edit action jumps straight back to that one
     step and returns here the moment the flow is complete again, so changing a
     single answer never loses anything else or marches through later steps. */
  const reviewSections: { title: string; step: string; items: ReviewItem[] }[] = [
    { title: "Project", step: "project", items: [{ label: "Type", value: config.tabLabel }] },
    { title: "Layout", step: "layout", items: [{ label: "Layout", value: subtypeTitle }] },
    { title: "Size", step: "size", items: [{ label: "Approx. size", value: `${sqft.toLocaleString()} sq ft` }] },
    {
      title: "Upgrades",
      step: "upgrades",
      items: [
        {
          label: "Selected",
          value: reviewChipLabels.length ? reviewChipLabels.join(", ") : "Full remodel (nothing left out)",
        },
      ],
    },
    ...(showBathCount
      ? [{ title: "Bathrooms", step: "bathcount", items: [{ label: "Count", value: bathCount === null ? "Not set" : String(bathCount) }] }]
      : []),
    ...(showKitchenIncluded
      ? [{ title: "Kitchen", step: "kitchen", items: [{ label: "In scope", value: kitchenIn ? "Yes, included" : "No" }] }]
      : []),
    { title: "Finish level", step: "finish", items: [{ label: "Finish", value: FINISH_LABELS[finish] }] },
    { title: "Property", step: "address", items: [{ label: "Address", value: gateAddress.trim() || "You can add this later" }] },
  ];

  const isLastFormStep = safeFormIdx === formStepIds.length - 1;
  const formNextLabel =
    editReturn && allChosen ? "Back to review" : isLastFormStep ? "Review my project" : "Continue";

  /* Single guided body: `phase` chooses which screen is mounted, and only one is
     ever on screen, so the step in view owns the whole viewport. `topRef` is the
     scroll anchor every transition brings just under the sticky site header. */
  const wizardBody = (
    <div ref={topRef} className="scroll-mt-24">
      {phase !== "result" && (
        <WizardProgress steps={progressSteps} currentIndex={progressIndex} />
      )}

      {phase === "form" && (
        <div>
          <StepTransition key={currentFormId}>
            {safeFormIdx === 0 && introEyebrow}
            {formStepBodies[currentFormId]}
          </StepTransition>
          <StickyStepNav
            onBack={safeFormIdx > 0 || editReturn ? backFromForm : undefined}
            onNext={nextFromForm}
            nextDisabled={!stepComplete(currentFormId)}
            nextLabel={formNextLabel}
            hint={!stepComplete(currentFormId) ? "Choose an option to continue." : undefined}
          />
        </div>
      )}

      {phase === "review" && (
        <StepTransition>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-sans font-light text-[clamp(1.5rem,5.5vw,2.25rem)] leading-[1.1] tracking-tight text-inverse-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible rounded-sm"
            data-testid="step-heading"
          >
            Review your project
          </h2>
          <p className="mt-2.5 mb-5 text-[14px] text-inverse-foreground/80 leading-relaxed">
            Make sure everything looks right. Tap Edit on any line to change it. Nothing else is lost.
          </p>
          <div className="space-y-3">
            {reviewSections.map((s) => (
              <ReviewSection
                key={s.step}
                title={s.title}
                items={s.items}
                onEdit={() => goToForm(s.step, true)}
                testId={`review-${s.step}`}
              />
            ))}
          </div>
          <StickyStepNav
            onBack={() => {
              setEditReturn(false);
              setFormIdx(formStepIds.length - 1);
              setPhase("form");
              scrollWizardTop();
            }}
            onNext={reviewToNext}
            nextDisabled={!allChosen}
            nextLabel={gateSubmitted ? "See my estimate" : "Get my estimate"}
            nextTestId="review-continue"
          />
        </StepTransition>
      )}

      {phase === "gate" && (
        <div>
          <StepTransition>{leadsGatePanel}</StepTransition>
          <StickyStepNav
            onBack={() => {
              setGateOpen(false);
              setPhase("review");
              scrollWizardTop();
            }}
            onNext={() => gateSubmitRef.current?.requestSubmit()}
            busy={gateLoading}
            busyLabel="Sending..."
            nextLabel="Reveal my estimate"
            nextTestId="gate-continue"
          />
        </div>
      )}

      {phase === "result" && (
        <div>
          <StepTransition>{resultPanel}</StepTransition>
          <StickyResultActions
            primaryLabel={CTA_SECONDARY}
            onPrimary={handleBookVisit}
            onEditScope={goEditScope}
            secondary={[
              { label: "Print", icon: Printer, onClick: () => window.print(), testId: "result-print" },
              { label: "Start another", icon: RefreshCw, onClick: handleStartOver, testId: "result-start-over" },
            ]}
          />
        </div>
      )}
    </div>
  );

  /* inModal: compact card without the full-viewport section chrome. */
  if (inModal) {
    return (
      <div className="relative bg-inverse text-inverse-foreground rounded-lg p-4 sm:p-6">
        {wizardBody}
      </div>
    );
  }

  /* Full page: dark section that sizes to its content. overflow is left visible
     so the sticky step nav pins to the viewport rather than to this section. */
  return (
    <Section
      id="calculator"
      variant="inverse"
      divider
      className="scroll-mt-16 relative border-y-2 border-accent-legible/40"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-accent-legible z-10" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.028]"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat" }}
        aria-hidden
      />
      <div ref={sectionRef} className="container px-4 sm:px-6 py-2 md:py-4 relative z-[1]">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative rounded-sm border border-accent-legible/45 bg-inverse-foreground/[0.04] shadow-[0_0_0_1px_hsl(var(--accent-legible)/0.1),0_24px_60px_-20px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-y-0 left-0 w-1 bg-accent-legible/80 rounded-l-sm" aria-hidden />
            <div className="relative px-4 sm:px-6 py-8 md:py-10">{wizardBody}</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
