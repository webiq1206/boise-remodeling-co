"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Check, X, ArrowRight, Loader2, FileText, Ruler } from "lucide-react";
import { Section } from "@/components/marketing/Section";
import { Button } from "@/components/ui/button";
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

/**
 * The plan-set estimator wizard.
 *
 * FOUR STEPS, SAME SHAPE AS THE RE-10 WIZARD AND FOR THE SAME REASON. Upload,
 * confirm what we measured, contact details, range. The customer sees and
 * corrects our read BEFORE giving us anything, so the contact form is the last
 * step of getting their estimate rather than the price of finding out we
 * misread their drawings.
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
}

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

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload plans",
  measure: "Confirm measurements",
  contact: "Your details",
  result: "Your range",
};
const STEP_ORDER: Step[] = ["upload", "measure", "contact", "result"];

export function PlansWizard() {
  const [step, setStep] = useState<Step>("upload");
  const topRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // Nested children fire dragleave as the pointer crosses them, so a boolean
  // set on the events alone flickers the whole box. Count enter/leave instead.
  const dragDepth = useRef(0);
  const pickerRef = useRef<HTMLInputElement>(null);
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

  const fileKey = (f: File) => `${f.name}:${f.size}`;

  /**
   * Add rather than replace, and name everything turned away.
   *
   * Plan sets arrive in pieces: the architectural set, then the structural
   * sheets, then a revised floor plan. Replacing on each interaction would
   * silently throw away the earlier ones and the only sign would be a short
   * room list.
   */
  function addFiles(incoming: File[], method: "picker" | "drop") {
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
    "w-full rounded-sm border border-inverse-foreground/20 bg-inverse-foreground/[0.06] px-3 py-2.5 " +
    "text-[14.5px] text-inverse-foreground placeholder:text-inverse-muted/70 " +
    "focus:outline-none focus:border-accent-legible";
  const labelClass = "block text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-1.5";

  return (
    <Section id="plans-estimator" variant="inverse" divider>
      {/* scroll-mt clears the sticky header; without it every step change lands
          the heading behind the navigation. */}
      <div className="container px-4 max-w-3xl mx-auto scroll-mt-24" ref={topRef}>
        <ol className="flex flex-wrap gap-x-2 gap-y-1 mb-8" aria-label="Progress">
          {STEP_ORDER.map((s, i) => (
            <li
              key={s}
              className={
                "text-[12px] tracking-[0.08em] uppercase " +
                (i === stepIndex
                  ? "text-inverse-foreground"
                  : i < stepIndex
                    ? "text-accent-legible"
                    : "text-inverse-muted/60")
              }
            >
              {i > 0 && <span className="mr-2 text-inverse-muted/40">/</span>}
              {i < stepIndex && <Check className="inline h-3 w-3 mr-1" aria-hidden="true" />}
              {STEP_LABELS[s]}
            </li>
          ))}
        </ol>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-sm border border-red-400/40 bg-red-500/10 p-4 text-[13.5px] text-inverse-foreground leading-relaxed"
          >
            {error}
          </div>
        )}

        {/* ------------------------------------------------------- 1. upload */}
        {step === "upload" && (
          <div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-inverse-foreground mb-3">
              Send your plans and get a range built from your own drawings
            </h2>
            <p className="text-sm md:text-base text-inverse-foreground/80 leading-relaxed mb-7">
              Upload the floor plans and any door, window or finish schedules. We read the room
              areas and dimensions, show you what we measured, and you correct it before anything
              is priced.
            </p>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                dragDepth.current += 1;
                setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragDepth.current = 0;
                setIsDragging(false);
                addFiles(Array.from(e.dataTransfer?.files ?? []), "drop");
              }}
              data-testid="dropzone-plan-files"
              className={
                "rounded-sm border border-dashed p-7 sm:p-8 text-center transition-colors " +
                (isDragging
                  ? "border-accent-legible bg-accent-legible/10"
                  : "border-inverse-foreground/30 bg-inverse-foreground/[0.04]")
              }
            >
              <Upload className="h-6 w-6 mx-auto mb-3 text-inverse-muted" aria-hidden="true" />
              <span className="hidden [@media(pointer:fine)]:block text-[15px] text-inverse-foreground mb-1">
                {isDragging ? "Drop them here" : "Drag your drawings here"}
              </span>
              <span className="[@media(pointer:fine)]:hidden block text-[15px] text-inverse-foreground mb-1">
                Add your drawings
              </span>

              {/* THE SIZE ADVICE IS SPECIFIC BECAUSE THE CEILING IS REAL AND IS
                  NOT MEASURED IN MEGABYTES. A 27-sheet scanned permit set goes
                  through where 5 sheets of vector CAD does not, so "send the
                  floor plans and schedules" is the only advice that reliably
                  works. Better said here than after a two-minute wait. */}
              <span className="block text-[12.5px] text-inverse-muted mb-5 max-w-md mx-auto leading-relaxed">
                PDFs. If you have a full permit set, send the floor plans and the schedules rather
                than every sheet - those are the ones we price from.
              </span>

              <Button
                type="button"
                variant="heroGhost"
                className="w-full sm:w-auto"
                onClick={() => pickerRef.current?.click()}
                data-testid="button-plans-choose-files"
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden [@media(pointer:fine)]:inline">Browse files</span>
                <span className="[@media(pointer:fine)]:hidden">Choose files</span>
              </Button>

              <input
                ref={pickerRef}
                id="plan-files"
                type="file"
                multiple
                accept={UPLOAD_ACCEPT}
                className="sr-only"
                data-testid="input-plan-files"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []), "picker");
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-4 space-y-1.5" data-testid="list-plan-files">
                {files.map((f) => (
                  <li key={fileKey(f)} className="flex items-center gap-2 text-[13px] text-inverse-muted">
                    <Check className="h-3.5 w-3.5 text-accent-legible flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(f)}
                      className="ml-auto flex-shrink-0 p-1 -m-1 text-inverse-muted hover:text-inverse-foreground transition-colors"
                      aria-label={`Remove ${f.name}`}
                      data-testid="button-plans-remove-file"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="brand"
              className="mt-7 w-full sm:w-auto"
              disabled={busy}
              onClick={analyze}
              data-testid="button-plans-analyze"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading your drawings...
                </>
              ) : (
                <>
                  Read my plans <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="mt-4 text-[12px] text-inverse-muted leading-relaxed">
              No contact details needed yet. A large set can take a couple of minutes to read.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------ 2. measure */}
        {step === "measure" && extraction && (
          <div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-inverse-foreground mb-3">
              Here is what we measured. Is it right?
            </h2>
            <p className="text-sm text-inverse-foreground/80 leading-relaxed mb-7">
              Take out anything that is not part of this project. Then tell us the total finished
              square footage of the home, which is how we check our read.
            </p>

            {attachedOnly.length > 0 && (
              <div
                className="mb-6 rounded-sm border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-plans-attached-only"
              >
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
                  {attachedOnly.join(", ")} {attachedOnly.length === 1 ? "is" : "are"} attached for
                  our team but {attachedOnly.length === 1 ? "was" : "were"} not read automatically.
                  Nothing in {attachedOnly.length === 1 ? "it" : "them"} is in the list below.
                </p>
              </div>
            )}

            {/* THE SQUARE FOOTAGE QUESTION. First, prominent, and explained.
                It is the only thing standing between a good read and a price
                built on it, and a field somebody skips is worth nothing. */}
            <div className="mb-7 rounded-sm border border-accent-legible/40 bg-accent-legible/[0.07] p-5">
              <label htmlFor="plans-total-sqft" className={labelClass}>
                <Ruler className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" aria-hidden="true" />
                Total finished square footage
              </label>
              <input
                id="plans-total-sqft"
                type="text"
                inputMode="numeric"
                value={totalSqFt}
                onChange={(e) => setTotalSqFt(e.target.value)}
                placeholder="e.g. 2,400"
                className={fieldClass + " max-w-[220px]"}
                data-testid="input-plans-total-sqft"
              />
              <p className="mt-2.5 text-[12.5px] text-inverse-foreground/75 leading-relaxed">
                {extraction.statedTotalSqFt
                  ? "Your drawings state this. Correct it if it is wrong."
                  : "Your drawings do not state a total, and we cannot get one reliably off the dimensions. Yours is the number we compare our room measurements against, so we can catch a misread before it reaches your price."}
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
              {unmeasured.length > 0 && (
                <p className="text-[13px] text-inverse-muted">
                  {unmeasured.length} with no printed area
                </p>
              )}
            </div>

            <ul className="space-y-2" data-testid="list-plan-rooms">
              {rooms.map((r) => (
                <li
                  key={r.id}
                  className={
                    "rounded-sm border px-4 py-3 transition-colors " +
                    (r.inScope
                      ? "border-inverse-foreground/15 bg-inverse-foreground/[0.05]"
                      : "border-inverse-foreground/10 bg-transparent opacity-50")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] text-inverse-foreground leading-snug truncate">{r.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-inverse-muted">
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
                      className="flex-shrink-0 rounded-sm border border-inverse-foreground/25 px-2.5 py-1 text-[12px] text-inverse-muted hover:text-inverse-foreground hover:border-inverse-foreground/50 transition-colors"
                      data-testid="button-plans-toggle-room"
                      aria-pressed={r.inScope}
                    >
                      {r.inScope ? "In project" : "Not included"}
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
            {scopeItems.length > 0 && (
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
            )}

            {/* LOUDER THAN THE REST, because this is what someone assumes is in
                the price. The Squier patio deck is marked "separate permit" on
                the sheet; the Gambardella greenhouse and swim spa are "by
                others". Quoting them would be as wrong as omitting real work. */}
            {excludedScope.length > 0 && (
              <div
                className="mt-6 rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] p-4"
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
            )}

            {/* Named rather than dropped. A room that vanished without
                explanation is exactly the failure the RE-10 flow shipped once. */}
            {unmeasured.length > 0 && (
              <p className="mt-4 text-[12.5px] text-inverse-muted leading-relaxed">
                {unmeasured.map((r) => r.name).join(", ")}{" "}
                {unmeasured.length === 1 ? "carries" : "carry"} no printed area on your drawings, so{" "}
                {unmeasured.length === 1 ? "it is" : "they are"} not in the measured figure. Mention{" "}
                {unmeasured.length === 1 ? "its size" : "their sizes"} in the notes on the next step
                and we will fold {unmeasured.length === 1 ? "it" : "them"} in.
              </p>
            )}

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button variant="brand" onClick={confirmMeasurements} data-testid="button-plans-confirm">
                These look right <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="heroGhost" onClick={() => goTo("upload")} data-testid="button-plans-back-upload">
                Add more sheets
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ 3. contact */}
        {step === "contact" && (
          <div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-inverse-foreground mb-3">
              Where should we send it?
            </h2>
            <p className="text-sm text-inverse-foreground/80 leading-relaxed mb-7">
              Your range appears on the next screen. We will email you a copy with what we measured,
              so you can check it against your own drawings.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="plans-name" className={labelClass}>Your name</label>
                <input id="plans-name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} data-testid="input-plans-name" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="plans-address" className={labelClass}>Property address</label>
                <input id="plans-address" value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} data-testid="input-plans-address" />
              </div>
              <div>
                <label htmlFor="plans-email" className={labelClass}>Email</label>
                <input id="plans-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} data-testid="input-plans-email" />
              </div>
              <div>
                <label htmlFor="plans-phone" className={labelClass}>Phone</label>
                <input id="plans-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} data-testid="input-plans-phone" />
              </div>
              <div>
                <label htmlFor="plans-preferred" className={labelClass}>Best way to reach you</label>
                <select
                  id="plans-preferred"
                  value={preferredContact}
                  onChange={(e) => setPreferredContact(e.target.value as typeof preferredContact)}
                  className={fieldClass}
                  data-testid="select-plans-preferred"
                >
                  <option value="email" className="text-foreground">Email</option>
                  <option value="phone" className="text-foreground">Phone</option>
                  <option value="text" className="text-foreground">Text</option>
                </select>
              </div>
              <div>
                <label htmlFor="plans-timeline" className={labelClass}>Timeline (optional)</label>
                <input id="plans-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. start in spring" className={fieldClass} data-testid="input-plans-timeline" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="plans-notes" className={labelClass}>Anything we should know? (optional)</label>
                <textarea id="plans-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} data-testid="input-plans-notes" />
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button variant="brand" disabled={busy} onClick={submit} data-testid="button-plans-submit">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your range...
                  </>
                ) : (
                  <>
                    Show my range <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button variant="heroGhost" onClick={() => goTo("measure")} data-testid="button-plans-back-measure">
                Back to measurements
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- 4. result */}
        {step === "result" && result && (
          <div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-inverse-foreground mb-2">
              Your planning range
            </h2>
            <p className="text-3xl md:text-4xl font-light text-inverse-foreground tracking-tight mb-2" data-testid="text-plans-range">
              {result.range}
            </p>
            <p className="text-[13px] text-inverse-muted mb-7">{result.propertyAddress}</p>

            {/* WHERE THE NUMBER CAME FROM, SAID PLAINLY EITHER WAY. A range
                built from measured drawings and one built from a figure someone
                typed are different products, and letting them look identical
                would be the quiet kind of dishonesty this flow exists to avoid. */}
            <div
              className="mb-6 rounded-sm border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
              data-testid="notice-plans-provenance"
            >
              {result.pricedFromDrawings && result.measurements ? (
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
                  Priced from your drawings: {result.measurements.sqft.toLocaleString("en-US")} sq ft
                  across {result.measurements.measuredRooms} rooms, with{" "}
                  {result.measurements.interiorPerimeterFt.toLocaleString("en-US")} linear feet of
                  interior wall
                  {result.measurements.ceilingHeight !== null
                    ? ` and ${result.measurements.ceilingHeight.toFixed(1)} foot ceilings`
                    : ""}
                  .
                </p>
              ) : (
                <>
                  <p className="text-[13.5px] text-inverse-foreground leading-relaxed mb-2">
                    We read your drawings, but they did not carry enough measurement for us to price
                    from them directly, so this range is built from the total area you gave us.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {result.blockers.map((b, i) => (
                      <li key={i} className="text-[12.5px] text-inverse-muted leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {result.notMeasured.length > 0 && (
              <div className="mb-6 rounded-sm border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4">
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
                  Not in the measured area: {result.notMeasured.join(", ")}. These carry no printed
                  size on your drawings. Send us their dimensions and we will fold them in.
                </p>
              </div>
            )}

            {result.scopeItems.length > 0 && (
              <div className="mb-6">
                <p className="text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-2.5">
                  What this covers ({result.scopeItems.length} items read from your drawings)
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
                  {result.scopeItems.map((s, i) => (
                    <li key={i} className="text-[13px] text-inverse-foreground/85 leading-relaxed">
                      <span className="text-inverse-muted">{s.category}</span> · {s.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Repeated on the result screen on purpose. Someone who skimmed
                the confirmation step still has to leave knowing what is not in
                the number they are about to plan around. */}
            {result.excludedScope.length > 0 && (
              <div
                className="mb-6 rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-plans-result-excluded"
              >
                <p className="text-[13.5px] text-inverse-foreground leading-relaxed mb-2">
                  Not included, because your drawings give it to someone else:
                </p>
                <ul className="space-y-1">
                  {result.excludedScope.map((s, i) => (
                    <li key={i} className="text-[12.5px] text-inverse-muted leading-relaxed">
                      {s.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6">
              <p className="text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-2.5">What we used</p>
              <ul className="space-y-1.5">
                {result.selections.map((s, i) => (
                  <li key={i} className="text-[13.5px] text-inverse-foreground/85">
                    <span className="text-inverse-muted">{s.label}:</span> {s.value}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-7">
              <p className="text-[12.5px] uppercase tracking-[0.08em] text-inverse-muted mb-2.5">What this is</p>
              <ul className="space-y-2">
                {result.disclaimers.map((d, i) => (
                  <li key={i} className="text-[13px] text-inverse-muted leading-relaxed">
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[13.5px] text-inverse-foreground leading-relaxed">
              {result.emailed
                ? "We have emailed you a copy with everything we measured."
                : "Call us and we will walk through it with you."}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
