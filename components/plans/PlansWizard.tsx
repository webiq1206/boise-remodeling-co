"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Ruler, Mail, FileText, ClipboardList, Printer, RefreshCw } from "lucide-react";
import { Section } from "@/components/marketing/Section";
import type { PlanExtractionResult, PlanRoom, PlanQuality } from "@/shared/plans/extraction";
import {
  classifyUpload,
  MAX_UPLOAD_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  READABLE_FORMATS_LABEL,
} from "@/shared/re10/uploads";
import { PLAN_EVENTS } from "@/shared/plans/analyticsEvents";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";
import { useModals } from "@/components/modals/modalsContext";
import {
  DetailList,
  PriceHeadline,
  ResultCard,
  ResultDisclosure,
  SegmentedControl,
  StepHeading,
  StickyResultActions,
  StickyStepNav,
  TextField,
  UploadField,
  WizardError,
  WizardProgress,
  type WizardStepMeta,
} from "@/components/estimate/wizard";

/**
 * The plan-set estimator wizard.
 *
 * FOUR STEPS, SAME SHAPE AS THE RE-10 WIZARD AND FOR THE SAME REASON, and now
 * built on the same shared wizard shell (sticky nav, progress, upload field,
 * collapsible result sections) so the two tools behave identically on a
 * phone. Upload, confirm what we measured, contact details, range. The
 * customer sees and corrects our read BEFORE giving us anything, so the
 * contact form is the last step of getting their estimate rather than the
 * price of finding out we misread their drawings.
 *
 * THE SECOND STEP ASKS ONE QUESTION THE RE-10 NEVER HAD TO. Total conditioned
 * square footage, and it is required. No sheet in the best plan set we have
 * states a total, nothing else printed on a drawing can substitute, and without
 * a second independent statement of the area there is no way to catch a misread
 * room tag. The customer knows the number. Asking is the entire reason this
 * step exists in the form it does, so the field is not buried among optional
 * ones and it says why it is being asked.
 */

type Step = "upload" | "measure" | "contact" | "result";

interface EditableRoom extends PlanRoom {
  id: string;
}

interface AnalyzeResponse extends PlanExtractionResult {
  quality: PlanQuality;
  stored?: { filename: string; url: string }[];
  attachedOnly?: string[];
}

interface EstimateResponse {
  range: string;
  low: number;
  high: number;
  selections: { label: string; value: string }[];
  disclaimers: string[];
  pricedFromDrawings: boolean;
  measurements: {
    sqft: number;
    measuredRooms: number;
    interiorPerimeterFt: number;
    ceilingHeight: number | null;
    bathroomCount: number | null;
    layoutChanges: string | null;
    plumbingElectrical: string | null;
    notes: string[];
  } | null;
  scopeItems: { category: string; description: string; sheet?: string | null }[];
  excludedScope: { category: string; description: string; sheet?: string | null }[];
  blockers: string[];
  notMeasured: string[];
  propertyAddress: string;
  emailed: boolean;
  disclosure: {
    assumptions: string[];
    included: { label: string; detail: string }[];
    excluded: { label: string; detail: string }[];
    optional: { label: string; detail: string }[];
    allowances: { label: string; detail: string }[];
    needsAttention: { label: string; detail: string; status: string }[];
    warnings: string[];
    missing: { what: string; where: string; effect: string; remedy: string }[];
    factors: string[];
    acknowledgments: string[];
    nextSteps: string[];
    confidence: "high" | "medium" | "low";
  };
}

const CONFIDENCE_COPY: Record<"high" | "medium" | "low", string> = {
  high: "We measured this from your drawings and you answered the questions that move the price, so this is as tight as a planning range gets before someone walks the property.",
  medium: "Some of what drives this price is still assumed. The range reflects that rather than pretending otherwise.",
  low: "There is a lot we could not read or were not told, so this range is deliberately wide. Everything below says what would narrow it.",
};

const PROJECTS = [
  { value: "whole-home", label: "Whole home remodel" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "addition", label: "Addition" },
  { value: "basement", label: "Basement finish" },
  { value: "adu", label: "ADU" },
] as const;

const FINISHES = [
  { value: "refresh", label: "Refresh", hint: "Cosmetic, keep the layout" },
  { value: "mid-range", label: "Mid-range", hint: "Most projects land here" },
  { value: "high-end", label: "High-end", hint: "Custom cabinetry, stone" },
  { value: "luxury", label: "Luxury", hint: "Top of the market" },
] as const;

const FORM_STEPS: { id: Step; meta: WizardStepMeta }[] = [
  { id: "upload", meta: { id: "upload", section: "Documents", label: "Upload your plans and schedules" } },
  { id: "measure", meta: { id: "measure", section: "Confirm", label: "Check what we measured" } },
  { id: "contact", meta: { id: "contact", section: "Your details", label: "How we should reach you" } },
  { id: "result", meta: { id: "result", section: "Estimate", label: "Your planning range" } },
];
const STEP_METAS = FORM_STEPS.map((s) => s.meta);
const STEP_ORDER: Step[] = FORM_STEPS.map((s) => s.id);

const fileKey = (f: File) => `${f.name}:${f.size}`;

export function PlansWizard() {
  const [step, setStep] = useState<Step>("upload");
  const topRef = useRef<HTMLDivElement | null>(null);
  /* The wizard body, watched so the site-wide Call / Text bar steps aside while
     the estimator (and its own sticky Back / Continue) owns the bottom of the
     screen, then returns once the visitor scrolls away. Same pattern as the
     RE-10 and general estimator wizards - this one was previously missing it,
     which left the global bar fighting this wizard's own controls on mobile. */
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const setWizardRefs = (el: HTMLDivElement | null) => {
    topRef.current = el;
    sectionRef.current = el;
  };

  const { openConsult } = useModals();

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<AnalyzeResponse | null>(null);
  const [rooms, setRooms] = useState<EditableRoom[]>([]);
  const [documents, setDocuments] = useState<{ filename: string; url: string }[]>([]);
  const [attachedOnly, setAttachedOnly] = useState<string[]>([]);

  const [totalSqFt, setTotalSqFt] = useState("");
  const [projectType, setProjectType] = useState<(typeof PROJECTS)[number]["value"]>("whole-home");
  const [finishLevel, setFinishLevel] = useState<(typeof FINISHES)[number]["value"]>("mid-range");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState<"email" | "phone" | "text">("email");
  const [address, setAddress] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");

  const [result, setResult] = useState<EstimateResponse | null>(null);

  // Fires once on mount. The denominator for every other stage.
  useEffect(() => {
    trackEvent(PLAN_EVENTS.started);
  }, []);

  /**
   * A file dropped anywhere except the box must not navigate away. The
   * browser's default for a dropped PDF is to open it, replacing the page and
   * losing the wizard, the uploads and the step.
   */
  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  useEffect(() => {
    if (step === "contact") trackEvent(PLAN_EVENTS.contactViewed);
  }, [step]);

  useEffect(() => {
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
  }, []);

  /**
   * Add rather than replace, and name everything turned away.
   *
   * Plan sets arrive in pieces: the architectural set, then the structural
   * sheets, then a revised floor plan. Replacing on each interaction would
   * silently throw away the earlier ones and the only sign would be a short
   * room list.
   */
  function addFiles(incoming: File[], method: "picker" | "camera" | "drop") {
    if (incoming.length === 0) return;

    const problems: string[] = [];
    const seen = new Set(files.map(fileKey));
    const next = [...files];
    let bytes = files.reduce((sum, f) => sum + f.size, 0);

    for (const f of incoming) {
      if (classifyUpload(f.name, f.type) === "rejected") {
        problems.push(`${f.name} is not a format we can take`);
        continue;
      }
      if (seen.has(fileKey(f))) continue;
      if (next.length >= MAX_UPLOAD_FILES) {
        problems.push(`${f.name} would be past our limit of ${MAX_UPLOAD_FILES} files`);
        continue;
      }
      if (bytes + f.size > MAX_TOTAL_UPLOAD_BYTES) {
        problems.push(`${f.name} is more than we can send in one go`);
        continue;
      }
      seen.add(fileKey(f));
      bytes += f.size;
      next.push(f);
    }

    const added = next.length - files.length;
    setFiles(next);
    setError(
      problems.length > 0 ? `We can read ${READABLE_FORMATS_LABEL}. Left out: ${problems.join("; ")}.` : null,
    );
    if (added > 0) trackEvent(PLAN_EVENTS.plansUploaded, { file_count: next.length, added, method });
  }

  function removeFile(target: File) {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== fileKey(target)));
    setError(null);
  }

  function goTo(next: Step) {
    setStep(next);
    setError(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function analyze() {
    if (files.length === 0) {
      setError("Attach your floor plans and any schedules to get started.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/plans/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "We could not read those drawings.");
        trackEvent(PLAN_EVENTS.analysisFailed, { reason: String(data.error ?? res.status) });
        return;
      }

      const read = data as AnalyzeResponse;
      setExtraction(read);
      setDocuments(Array.isArray(data.stored) ? data.stored : []);
      setAttachedOnly(Array.isArray(data.attachedOnly) ? data.attachedOnly : []);
      setRooms(read.rooms.map((r, i) => ({ ...r, id: `room-${i}` })));

      // The drawings often state a total. When they do, prefill it and leave it
      // editable rather than making someone type what we just read.
      if (read.statedTotalSqFt) setTotalSqFt((t) => t || String(Math.round(read.statedTotalSqFt!)));
      // And the drawings suggest what kind of job this is.
      if (read.projectType === "addition") setProjectType("addition");

      trackEvent(PLAN_EVENTS.analysisCompleted, {
        rooms_found: read.rooms.length,
        can_tighten: read.quality.canTightenPrice,
        coverage: read.quality.measuredRoomCoverage,
      });
      if (!read.quality.canTightenPrice) {
        trackEvent(PLAN_EVENTS.narrowingBlocked, { blockers: read.quality.blockers.length });
      }

      /* NOTHING TO CONFIRM IS A DEAD END, NOT A STEP. Sending someone to a
         review screen with an empty room list puts them in front of a form that
         cannot help them. Uploading elevations or a structural-only set does
         exactly this, and it is an easy mistake on a forty-sheet permit set. */
      if (!read.looksLikePlans || read.rooms.length === 0) {
        setError(
          !read.looksLikePlans
            ? "This does not read like a set of construction drawings. Send the floor plans and any door, window or finish schedules, and we will read those."
            : "We read the drawings but could not find any rooms on them. Floor plans are the sheets we measure from, so add those and try again.",
        );
        trackEvent(PLAN_EVENTS.analysisFailed, {
          reason: read.looksLikePlans ? "no-rooms" : "not-plans",
        });
        return;
      }

      goTo("measure");
    } catch {
      setError("Something went wrong sending those drawings. Try again.");
      trackEvent(PLAN_EVENTS.analysisFailed, { reason: "network" });
    } finally {
      setBusy(false);
    }
  }

  function confirmMeasurements() {
    const total = Number(totalSqFt.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(total) || total <= 0) {
      setError("We need the total finished square footage of the home. It is the number we check our read against.");
      return;
    }
    if (rooms.filter((r) => r.inScope).length === 0) {
      setError("Keep at least one room in the project.");
      return;
    }
    trackEvent(PLAN_EVENTS.totalSqFtSupplied, { total_sqft: total, prefilled: Boolean(extraction?.statedTotalSqFt) });
    trackEvent(PLAN_EVENTS.measurementsConfirmed, {
      rooms_in_scope: rooms.filter((r) => r.inScope).length,
      project_type: projectType,
      finish_level: finishLevel,
    });
    goTo("contact");
  }

  async function submit() {
    if (!name.trim() || !address.trim()) {
      setError("We need your name and the property address.");
      return;
    }
    if (preferredContact === "email" && !email.trim()) {
      setError("Add an email address, or change your preferred contact method.");
      return;
    }
    if (preferredContact !== "email" && !phone.trim()) {
      setError("Add a phone number, or change your preferred contact method.");
      return;
    }

    setBusy(true);
    setError(null);
    trackEvent(PLAN_EVENTS.contactSubmitted, { preferred_contact: preferredContact });
    try {
      const res = await fetch("/api/plans/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: rooms.map((r) => ({
            name: r.name,
            areaSqFt: r.areaSqFt,
            areaSource: r.areaSource,
            dimensionText: r.dimensionText,
            ceilingHeightFt: r.ceilingHeightFt,
            sheet: r.sheet,
            // Phase and level decide scope server-side, so they have to travel.
            // Without them every room defaults to "new" and an existing plan
            // would be priced alongside the new one it duplicates.
            phase: r.phase,
            level: r.level,
            inScope: r.inScope,
          })),
          // The whole job, not just the floor area. Excluded items travel too:
          // they are what the customer would otherwise assume is in the price.
          scopeItems: extraction?.scopeItems ?? [],
          scopeFacts: extraction?.scopeFacts,
          projectType,
          finishLevel,
          statedTotalSqFt: Number(totalSqFt.replace(/[^0-9.]/g, "")),
          looksLikePlans: extraction?.looksLikePlans,
          extractionProjectType: extraction?.projectType,
          // These travel so the team sees what the extractor flagged. Without
          // them a lead arrives with no record of what was uncertain.
          warnings: extraction?.warnings ?? [],
          sheetsUsed: extraction?.sheetsUsed ?? [],
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          preferredContact,
          propertyAddress: address.trim(),
          timeline: timeline.trim() || undefined,
          notes: notes.trim() || undefined,
          documents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // A bare "Invalid request" names nothing the reader can change. Field
        // errors are written for a human, so show those when they exist.
        const fieldErrors: Record<string, string[] | undefined> = data.errors?.fieldErrors ?? {};
        const detail = Object.values(fieldErrors)
          .flatMap((m) => m ?? [])
          .filter(Boolean);
        setError(detail.length > 0 ? detail.join(" ") : (data.message ?? "We could not build your range."));
        trackEvent(PLAN_EVENTS.analysisFailed, {
          reason: "estimate-rejected",
          fields: Object.keys(fieldErrors).join(",") || String(res.status),
        });
        return;
      }

      const estimate = data as EstimateResponse;
      setResult(estimate);
      trackEvent(PLAN_EVENTS.estimateGenerated, {
        value: Math.round((estimate.low + estimate.high) / 2),
        currency: "USD",
        priced_from_drawings: estimate.pricedFromDrawings,
      });
      // Email and phone go server-side only, hashed there, never to the Pixel.
      trackMetaEvent(
        "Lead",
        {
          content_name: "Plan set estimate",
          value: Math.round((estimate.low + estimate.high) / 2),
          currency: "USD",
        },
        { email: email.trim() || undefined, phone: phone.trim() || undefined },
      );
      if (estimate.emailed) trackEvent(PLAN_EVENTS.estimateEmailed);

      goTo("result");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const inScope = rooms.filter((r) => r.inScope);
  const measuredRooms = inScope.filter((r) => r.areaSqFt && r.areaSqFt > 0);
  const measuredArea = measuredRooms.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  const unmeasured = inScope.filter((r) => !(r.areaSqFt && r.areaSqFt > 0));
  const scopeItems = (extraction?.scopeItems ?? []).filter((s) => s.inContract);
  const excludedScope = (extraction?.scopeItems ?? []).filter((s) => !s.inContract);

  const fieldClass =
    "w-full min-h-11 rounded-md border bg-inverse-foreground/5 px-3 text-[16px] text-inverse-foreground " +
    "placeholder:text-inverse-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-legible border-inverse-foreground/25";
  const labelClass = "block text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-1.5";

  return (
    <Section id="plans-estimator" variant="inverse" divider>
      <div className="container mx-auto max-w-3xl scroll-mt-24 px-4" ref={setWizardRefs}>
        {step !== "result" ? (
          <WizardProgress steps={STEP_METAS} currentIndex={stepIndex} />
        ) : null}

        <WizardError message={error} />

        {/* ------------------------------------------------------- 1. upload */}
        {step === "upload" ? (
          <div>
            <StepHeading
              eyebrow="Plan-set estimator"
              title="Send your plans and get a range built from your own drawings"
              description="Upload the floor plans and any door, window or finish schedules. We read the room areas and dimensions, show you what we measured, and you correct it before anything is priced."
              help={
                <>
                  If you have a full permit set, send the floor plans and the schedules rather than
                  every sheet - those are the ones we price from.
                </>
              }
            />
            <UploadField
              files={files}
              onAdd={addFiles}
              onRemove={removeFile}
              accept={UPLOAD_ACCEPT}
              acceptLabel={`PDFs. ${READABLE_FORMATS_LABEL} read automatically.`}
              limitLabel={`Up to ${MAX_UPLOAD_FILES} files, ${Math.round(MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024))} MB total.`}
              headline="Add your drawings"
              allowCamera={false}
              disabled={busy}
            />
            <StickyStepNav
              onNext={analyze}
              nextLabel="Read my plans"
              nextDisabled={files.length === 0}
              busy={busy}
              busyLabel="Reading your drawings..."
              nextTestId="button-plans-analyze"
              hint="No contact details needed yet. A large set can take a couple of minutes to read."
            />
          </div>
        ) : null}

        {/* ------------------------------------------------------ 2. measure */}
        {step === "measure" && extraction ? (
          <div>
            <StepHeading
              title="Here is what we measured. Is it right?"
              description="Take out anything that is not part of this project. Then tell us the total finished square footage of the home, which is how we check our read."
            />

            {attachedOnly.length > 0 ? (
              <div
                className="mb-6 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-plans-attached-only"
              >
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
                  {attachedOnly.join(", ")} {attachedOnly.length === 1 ? "is" : "are"} attached for
                  our team but {attachedOnly.length === 1 ? "was" : "were"} not read automatically.
                  Nothing in {attachedOnly.length === 1 ? "it" : "them"} is in the list below.
                </p>
              </div>
            ) : null}

            {/* THE SQUARE FOOTAGE QUESTION. First, prominent, and explained.
                It is the only thing standing between a good read and a price
                built on it, and a field somebody skips is worth nothing. */}
            <div className="mb-7 rounded-md border border-accent-legible/40 bg-accent-legible/[0.07] p-5">
              <TextField
                id="plans-total-sqft"
                label="Total finished square footage"
                required
                value={totalSqFt}
                onChange={setTotalSqFt}
                inputMode="numeric"
                placeholder="e.g. 2,400"
                testId="input-plans-total-sqft"
                help={
                  extraction.statedTotalSqFt
                    ? "Your drawings state this. Correct it if it is wrong."
                    : "Your drawings do not state a total, and we cannot get one reliably off the dimensions. Yours is the number we compare our room measurements against, so we can catch a misread before it reaches your price."
                }
              />
              <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-accent-legible/90">
                <Ruler className="h-3 w-3" aria-hidden="true" /> The one number that catches a misread
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-7">
              <div>
                <label htmlFor="plans-project-type" className={labelClass}>
                  What are we pricing?
                </label>
                <select
                  id="plans-project-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as typeof projectType)}
                  className={fieldClass}
                  data-testid="select-plans-project-type"
                >
                  {PROJECTS.map((p) => (
                    <option key={p.value} value={p.value} className="text-foreground">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="plans-finish-level" className={labelClass}>
                  Finish level
                </label>
                <select
                  id="plans-finish-level"
                  value={finishLevel}
                  onChange={(e) => setFinishLevel(e.target.value as typeof finishLevel)}
                  className={fieldClass}
                  data-testid="select-plans-finish-level"
                >
                  {FINISHES.map((f) => (
                    <option key={f.value} value={f.value} className="text-foreground">
                      {f.label} - {f.hint}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-[13px] text-inverse-muted">
                <span className="text-inverse-foreground">{measuredRooms.length}</span> rooms measured,{" "}
                <span className="text-inverse-foreground">
                  {Math.round(measuredArea).toLocaleString("en-US")}
                </span>{" "}
                sq ft
              </p>
              {unmeasured.length > 0 ? (
                <p className="text-[13px] text-inverse-muted">
                  {unmeasured.length} with no printed area
                </p>
              ) : null}
            </div>

            <ul className="space-y-2" data-testid="list-plan-rooms">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className={
                    "rounded-md border p-4 transition-colors " +
                    (r.inScope
                      ? "border-inverse-foreground/15 bg-inverse-foreground/[0.05]"
                      : "border-inverse-foreground/10 bg-transparent opacity-60")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] text-inverse-foreground leading-snug">{r.name}</p>
                      <p className="mt-1 text-[12.5px] text-inverse-muted">
                        {r.areaSqFt && r.areaSqFt > 0
                          ? `${Math.round(r.areaSqFt).toLocaleString("en-US")} sq ft`
                          : "No printed area on the sheet"}
                        {r.sheet ? ` · ${r.sheet}` : ""}
                        {r.areaSqFt && r.areaSource !== "printed" && r.areaSource !== "derived"
                          ? ` · ${r.areaSource}, not used`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setRooms((prev) => prev.map((p) => (p.id === r.id ? { ...p, inScope: !p.inScope } : p)))
                      }
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-inverse-foreground/25 text-inverse-muted transition-colors hover:text-inverse-foreground"
                      aria-label={r.inScope ? `Remove ${r.name}` : `Add back ${r.name}`}
                      data-testid="button-plans-toggle-room"
                    >
                      {r.inScope ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* ------------------------------------------------ the scope of work
                FLOOR AREA IS NOT THE JOB. Everything the drawings ask for that
                is not a room area used to be read and then thrown away, so a
                gas fireplace, a structural beam and a driveway widening all
                priced as nothing. Shown here so the customer can see we read it
                and say if we missed something. */}
            {scopeItems.length > 0 ? (
              <div className="mt-8">
                <p className="text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-3">
                  Work we read off your drawings ({scopeItems.length})
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2" data-testid="list-plan-scope">
                  {scopeItems.map((s, i) => (
                    <li key={i} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                      <span className="text-inverse-muted">{s.category}</span> · {s.description}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* LOUDER THAN THE REST, because this is what someone assumes is in
                the price. The Squier patio deck is marked "separate permit" on
                the sheet; the Gambardella greenhouse and swim spa are "by
                others". Quoting them would be as wrong as omitting real work. */}
            {excludedScope.length > 0 ? (
              <div
                className="mt-6 rounded-md border border-inverse-foreground/25 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-plans-excluded-scope"
              >
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed mb-2">
                  Your drawings give this work to someone else, so it will not be in your price:
                </p>
                <ul className="space-y-1">
                  {excludedScope.map((s, i) => (
                    <li key={i} className="text-[12.5px] text-inverse-muted leading-relaxed">
                      {s.description}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[12.5px] text-inverse-muted leading-relaxed">
                  If you want us to price any of it, say so in the notes on the next step.
                </p>
              </div>
            ) : null}

            {/* Named rather than dropped. A room that vanished without
                explanation is exactly the failure the RE-10 flow shipped once. */}
            {unmeasured.length > 0 ? (
              <p className="mt-4 text-[12.5px] text-inverse-muted leading-relaxed">
                {unmeasured.map((r) => r.name).join(", ")}{" "}
                {unmeasured.length === 1 ? "carries" : "carry"} no printed area on your drawings, so{" "}
                {unmeasured.length === 1 ? "it is" : "they are"} not in the measured figure. Mention{" "}
                {unmeasured.length === 1 ? "its size" : "their sizes"} in the notes on the next step
                and we will fold {unmeasured.length === 1 ? "it" : "them"} in.
              </p>
            ) : null}

            <StickyStepNav
              onBack={() => goTo("upload")}
              backLabel="Add more sheets"
              onNext={confirmMeasurements}
              nextLabel="These look right"
              nextTestId="button-plans-confirm"
            />
          </div>
        ) : null}

        {/* ------------------------------------------------------ 3. contact */}
        {step === "contact" ? (
          <div>
            <StepHeading
              title="Where should we send it?"
              description="Your range appears on the next screen. We will email you a copy with what we measured, so you can check it against your own drawings."
            />
            <div className="space-y-4">
              <TextField label="Your name" required value={name} onChange={setName} autoComplete="name" testId="input-plans-name" />
              <TextField label="Property address" required value={address} onChange={setAddress} autoComplete="street-address" testId="input-plans-address" />

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Best way to reach you</p>
                <SegmentedControl
                  label="Best way to reach you"
                  options={[
                    { value: "email", label: "Email" },
                    { value: "phone", label: "Phone" },
                    { value: "text", label: "Text" },
                  ]}
                  value={preferredContact}
                  onChange={setPreferredContact}
                  columns={3}
                  testIdPrefix="plans-preferred"
                />
              </div>

              <TextField
                label="Email"
                required={preferredContact === "email"}
                optionalHint={preferredContact !== "email"}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                testId="input-plans-email"
              />
              <TextField
                label="Phone"
                required={preferredContact !== "email"}
                optionalHint={preferredContact === "email"}
                type="tel"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                testId="input-plans-phone"
              />
              <TextField
                label="Timeline"
                optionalHint
                value={timeline}
                onChange={setTimeline}
                placeholder="e.g. start in spring"
                testId="input-plans-timeline"
              />

              <div>
                <label htmlFor="plans-notes" className="mb-1.5 flex items-baseline justify-between text-[12.5px] text-inverse-muted">
                  <span>Anything we should know</span>
                  <span className="text-inverse-muted/70">Optional</span>
                </label>
                <textarea
                  id="plans-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-inverse-foreground/25 bg-inverse-foreground/5 px-3 py-2.5 text-[16px] text-inverse-foreground focus:outline-none focus:ring-2 focus:ring-accent-legible"
                  data-testid="input-plans-notes"
                />
              </div>
            </div>

            <StickyStepNav
              onBack={() => goTo("measure")}
              backLabel="Back to measurements"
              onNext={submit}
              nextLabel="Show my range"
              busy={busy}
              busyLabel="Building your range..."
              nextTestId="button-plans-submit"
            />
          </div>
        ) : null}

        {/* ------------------------------------------------------- 4. result */}
        {step === "result" && result ? (
          <PlansResult
            result={result}
            documents={documents}
            onEditScope={() => goTo("measure")}
            onUploadMore={() => goTo("upload")}
            onRequestConsult={() => {
              trackEvent(PLAN_EVENTS.consultationRequested);
              openConsult();
            }}
          />
        ) : null}
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   RESULT
══════════════════════════════════════════════════════════════════════ */

function PlansResult({
  result,
  documents,
  onEditScope,
  onUploadMore,
  onRequestConsult,
}: {
  result: EstimateResponse;
  documents: { filename: string; url: string }[];
  onEditScope: () => void;
  onUploadMore: () => void;
  onRequestConsult: () => void;
}) {
  const notInThisRange = [...result.disclosure.excluded, ...result.disclosure.optional];

  return (
    <div data-testid="plans-result" className="space-y-4">
      {/* Overview */}
      <ResultCard testId="plans-overview">
        <PriceHeadline
          label="Planning range"
          price={result.range}
          category={result.propertyAddress}
        />
        {result.emailed ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-inverse-foreground/85">
            <Mail className="h-4 w-4 text-accent-legible" aria-hidden="true" />
            A copy is on its way to your inbox.
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-inverse-foreground/85">
            Call us and we will walk through it with you.
          </p>
        )}
      </ResultCard>

      {/* Where the number came from, said plainly either way. A range built
          from measured drawings and one built from a figure someone typed
          are different products, and letting them look identical would be
          the quiet kind of dishonesty this flow exists to avoid. */}
      <ResultCard title="Where this range came from" testId="plans-provenance">
        {result.pricedFromDrawings && result.measurements ? (
          <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
            Priced from your drawings: {result.measurements.sqft.toLocaleString("en-US")} sq ft
            across {result.measurements.measuredRooms} rooms, with{" "}
            {result.measurements.interiorPerimeterFt.toLocaleString("en-US")} linear feet of interior
            wall
            {result.measurements.ceilingHeight !== null
              ? ` and ${result.measurements.ceilingHeight.toFixed(1)} foot ceilings`
              : ""}
            .
          </p>
        ) : (
          <>
            <p className="text-[13.5px] text-inverse-foreground leading-relaxed mb-2">
              We read your drawings, but they did not carry enough measurement for us to price from
              them directly, so this range is built from the total area you gave us.
            </p>
            <DetailList items={result.blockers} />
          </>
        )}
        {result.notMeasured.length > 0 ? (
          <p className="mt-3 text-[13px] text-inverse-muted leading-relaxed">
            Not in the measured area: {result.notMeasured.join(", ")}. These carry no printed size on
            your drawings. Send us their dimensions and we will fold them in.
          </p>
        ) : null}
      </ResultCard>

      {/* What this covers, ordered as the drawings read */}
      {result.scopeItems.length > 0 ? (
        <ResultCard title={`What this covers (${result.scopeItems.length})`} icon={FileText} testId="plans-covers">
          <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
            {result.scopeItems.map((s, i) => (
              <li key={i} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-muted">{s.category}</span> · {s.description}
              </li>
            ))}
          </ul>
        </ResultCard>
      ) : null}

      {/* Repeated on the result screen on purpose. Someone who skimmed the
          confirmation step still has to leave knowing what is not in the
          number they are about to plan around. */}
      {result.excludedScope.length > 0 ? (
        <ResultCard title="Not included, given to someone else" testId="plans-result-excluded">
          <p className="mb-2 text-[13.5px] text-inverse-foreground leading-relaxed">
            Your drawings give this work to someone else, so it is not in your range:
          </p>
          <DetailList marker="cross" items={result.excludedScope.map((s) => s.description)} />
        </ResultCard>
      ) : null}

      {/* What we used */}
      <ResultCard title="What we used" testId="plans-selections">
        <ul className="space-y-1.5">
          {result.selections.map((s, i) => (
            <li key={i} className="text-[13.5px] text-inverse-foreground/85">
              <span className="text-inverse-muted">{s.label}:</span> {s.value}
            </li>
          ))}
        </ul>
      </ResultCard>

      {/* Confidence statement */}
      <ResultCard title="How to read this range" testId="plans-confidence">
        <p className="text-[13.5px] leading-relaxed text-inverse-muted">
          {CONFIDENCE_COPY[result.disclosure.confidence]}
        </p>
      </ResultCard>

      {/* ------------------------------------------------ the disclosure
          EVERY SECTION BELOW IS GENERATED FROM THIS ESTIMATE. Nothing renders
          unless the calculation produced it, so a missing section means the
          thing genuinely does not apply rather than that we forgot to write
          it. Collapsed by default so the result screen is scannable instead
          of a wall of always-open text. */}
      {result.disclosure.assumptions.length > 0 ? (
        <ResultDisclosure title="What we assumed to price this" count={result.disclosure.assumptions.length} testId="plans-assumptions">
          <DetailList items={result.disclosure.assumptions} />
        </ResultDisclosure>
      ) : null}

      {result.disclosure.included.length > 0 ? (
        <ResultDisclosure title="In this range" count={result.disclosure.included.length} testId="plans-included">
          <ul className="space-y-1.5">
            {result.disclosure.included.map((i, k) => (
              <li key={k} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-foreground">{i.label}.</span>{" "}
                <span className="text-inverse-muted">{i.detail}</span>
              </li>
            ))}
          </ul>
        </ResultDisclosure>
      ) : null}

      {result.disclosure.allowances.length > 0 ? (
        <ResultDisclosure title="Carried at an allowance" count={result.disclosure.allowances.length} testId="plans-allowances">
          <ul className="space-y-1.5">
            {result.disclosure.allowances.map((i, k) => (
              <li key={k} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-foreground">{i.label}.</span>{" "}
                <span className="text-inverse-muted">{i.detail}</span>
              </li>
            ))}
          </ul>
        </ResultDisclosure>
      ) : null}

      {notInThisRange.length > 0 ? (
        <ResultDisclosure title="Not in this range" count={notInThisRange.length} testId="plans-not-in-range">
          <ul className="space-y-1.5">
            {notInThisRange.map((i, k) => (
              <li key={k} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-foreground">{i.label}.</span>{" "}
                <span className="text-inverse-muted">{i.detail}</span>
              </li>
            ))}
          </ul>
        </ResultDisclosure>
      ) : null}

      {result.disclosure.needsAttention.length > 0 ? (
        <ResultDisclosure title="Priced after someone has seen it" count={result.disclosure.needsAttention.length} testId="plans-needs-attention">
          <ul className="space-y-1.5">
            {result.disclosure.needsAttention.map((i, k) => (
              <li key={k} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-foreground">{i.label}.</span>{" "}
                <span className="text-inverse-muted">{i.detail}</span>
              </li>
            ))}
          </ul>
        </ResultDisclosure>
      ) : null}

      {result.disclosure.missing.length > 0 ? (
        <ResultDisclosure title="What we could not confirm" count={result.disclosure.missing.length} testId="plans-missing">
          <ul className="space-y-1.5">
            {result.disclosure.missing.map((m, k) => (
              <li key={k} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                <span className="text-inverse-foreground">{m.what}</span>{" "}
                <span className="text-inverse-muted">
                  ({m.where}). {m.effect} {m.remedy}
                </span>
              </li>
            ))}
          </ul>
        </ResultDisclosure>
      ) : null}

      {result.disclosure.warnings.length > 0 ? (
        <ResultDisclosure title="Worth knowing before you start" count={result.disclosure.warnings.length} testId="plans-warnings">
          <DetailList items={result.disclosure.warnings} />
        </ResultDisclosure>
      ) : null}

      {result.disclosure.factors.length > 0 ? (
        <ResultDisclosure title="What will move the final number" count={result.disclosure.factors.length} testId="plans-factors">
          <DetailList items={result.disclosure.factors} />
        </ResultDisclosure>
      ) : null}

      {result.disclosure.nextSteps.length > 0 ? (
        <ResultDisclosure title="What happens next" count={result.disclosure.nextSteps.length} testId="plans-next-steps">
          <DetailList items={result.disclosure.nextSteps} />
        </ResultDisclosure>
      ) : null}

      {/* THE ACKNOWLEDGMENT. Only the lines that apply to this estimate, so it
          stays short enough to actually be read - kept open by default since
          it is the shortest, most decision-relevant section. */}
      {result.disclosure.acknowledgments.length > 0 ? (
        <ResultDisclosure
          title="Before you use this number"
          count={result.disclosure.acknowledgments.length}
          defaultOpen
          testId="plans-acknowledgments"
        >
          <DetailList items={result.disclosure.acknowledgments} />
        </ResultDisclosure>
      ) : null}

      {/* Uploaded documents */}
      {documents.length > 0 ? (
        <ResultCard title="Documents you sent" icon={FileText} testId="plans-documents">
          <ul className="space-y-1.5">
            {documents.map((d) => (
              <li key={d.url} className="flex items-center gap-2 text-[12.5px] text-inverse-muted">
                <ClipboardList className="h-3.5 w-3.5 flex-shrink-0 text-accent-legible" aria-hidden="true" />
                <span className="truncate">{d.filename}</span>
              </li>
            ))}
          </ul>
        </ResultCard>
      ) : null}

      <StickyResultActions
        primaryLabel="Schedule a free visit"
        onPrimary={onRequestConsult}
        onEditScope={onEditScope}
        primaryTestId="link-plans-consult"
        secondary={[
          { label: "Print", icon: Printer, onClick: () => window.print(), testId: "plans-print" },
          { label: "Upload more sheets", icon: RefreshCw, onClick: onUploadMore, testId: "plans-upload-more" },
        ]}
      />
    </div>
  );
}
