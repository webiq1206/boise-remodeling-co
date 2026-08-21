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
import { postFormWithProgress, type UploadStatus } from "@/lib/uploadWithProgress";
import { splitForUpload } from "@/lib/planSplitter";
import { mergePlanReads } from "@/shared/plans/merge";
import { assessPlanQuality } from "@/shared/plans/extraction";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { assessReadiness } from "@/shared/documents/readiness";
import { conflicts } from "@/shared/documents/auditTrail";
import { MAX_PLAN_PAGES, describeUploadProgress } from "@/shared/documents/uploadPlan";
import { formatPhoneInput, isValidEmail, isValidPhone } from "@/lib/wizardFormat";
import { useModals } from "@/components/modals/modalsContext";
import {
  ChoiceGrid,
  DetailList,
  OptionCard,
  PriceHeadline,
  ResultCard,
  ResultDisclosure,
  SegmentedControl,
  StepHeading,
  StepTransition,
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
  /* Page-level evidence from the document pipeline. Same shape the RE-10
     wizard consumes; a plan set is the case it was built for. */
  coverage?: DocumentCoverage;
  readiness?: DocumentReadiness;
  conflicts?: PlanConflict[];
  duplicateRoomsMerged?: number;
  coverageSummary?: string;
  auditTrail?: string;
  /** Per-page manifest, in the whole submission's page numbering. */
  pages?: PageManifestEntry[];
}

interface PageManifestEntry {
  index: number;
  filename: string;
  page: number;
  status: string;
  kind: string;
  medium: string;
  sheet: string | null;
  title: string | null;
  deepRead: boolean;
  failureReason: string | null;
}

/**
 * Fold the per-batch reads back into one answer.
 *
 * The merge itself is `mergePlanReads`, the same shared function the server
 * uses when a set arrives in one piece, so a set split into twenty parts and
 * the same set read whole come out identical: rooms deduplicated on identity,
 * existing and demolition phases kept but never summed, contradictions raised
 * rather than resolved. Coverage is summed across batches, and a batch that
 * failed entirely leaves its pages absent - which the totals then report as
 * unread rather than quietly shrinking the denominator.
 *
 * Doing this client-side is safe because it decides nothing: the estimate
 * route re-runs every quality gate server-side on whatever is posted back, and
 * there is nowhere in that request to put a price.
 */
function mergeAnalyzeParts(parts: AnalyzeResponse[], expectedPages: number): AnalyzeResponse {
  const merged = mergePlanReads(
    parts.map((p, i) => ({
      result: p as unknown as PlanExtractionResult,
      pageIndices: (p.pages ?? []).map((pg) => pg.index),
      filename: p.pages?.[0]?.filename ?? `batch-${i + 1}`,
      sheet: p.pages?.[0]?.sheet ?? null,
    })),
  );

  const pages = parts.flatMap((p) => p.pages ?? []).sort((a, b) => a.index - b.index);
  const readPages = pages.filter((p) => p.status === "read").length;
  const coverage: DocumentCoverage = {
    // The DENOMINATOR is what the customer sent, not what came back. A batch
    // that failed outright contributes no page records, and counting only the
    // records we have would report 100% coverage of a partial read.
    totalPages: expectedPages,
    read: readPages,
    failed: expectedPages - readPages,
    deepRead: pages.filter((p) => p.deepRead).length,
    scanned: pages.filter((p) => p.medium === "scanned").length,
    handwritten: pages.filter((p) => p.medium === "handwritten").length,
    everyPageRead: readPages === expectedPages,
    failedPages: pages
      .filter((p) => p.status !== "read")
      .map((p) => ({
        index: p.index,
        filename: p.filename,
        pageInFile: p.page,
        reason: p.failureReason ?? "This sheet could not be read.",
      })),
  };

  /* QUALITY AND READINESS ARE RECOMPUTED FROM THE MERGED SET, never taken
     from a batch. Taking them from parts[0] meant a 103-sheet upload reported
     the quality of its cover sheet: the blockers, the measured-room coverage
     and canTightenPrice all described four pages out of a hundred. The price
     was never affected - the estimate route re-runs assessPlanQuality on the
     server over whatever is posted - but the customer was being shown a
     verdict about the wrong document, which is its own kind of wrong. */
  const mergedResult = merged.result as unknown as AnalyzeResponse;
  const quality = assessPlanQuality(merged.result);
  const readiness = assessReadiness({
    inventory: { pages: [], unpaginated: [] },
    trail: merged.trail,
    hasPriceableContent: merged.result.rooms.length > 0 || merged.result.scopeItems.length > 0,
    missingCriticalInputs:
      merged.result.statedTotalSqFt == null
        ? [
            {
              label: "a stated total floor area",
              question: "What is the total square footage of the area being remodelled?",
              why:
                "No sheet in the set prints a total, so there is nothing to check our room-by-room read against. " +
                "Your number is genuinely independent of our reading of the drawings, which is what makes it useful.",
            },
          ]
        : [],
  });

  return {
    ...mergedResult,
    quality,
    stored: parts.flatMap((p) => p.stored ?? []),
    attachedOnly: parts.flatMap((p) => p.attachedOnly ?? []),
    pages,
    coverage,
    duplicateRoomsMerged: merged.duplicateRoomsMerged,
    conflicts: conflicts(merged.trail).map((c) => ({
      label: c.label,
      unit: c.unit,
      values: (c.competingValues ?? []).map((v) => ({
        value: v.value,
        sheet: v.source.sheet,
        page: v.source.pageIndex,
      })),
    })),
    readiness: {
      canFinalize: readiness.canFinalize,
      confidence: readiness.confidence,
      summary: readiness.summary,
      blockers: readiness.blockers,
      /* Questions from every batch, not just the first: an unmeasured item on
         sheet 90 is exactly as worth asking about as one on sheet 2. */
      questions: [
        ...readiness.questions,
        ...parts.flatMap((p) => p.readiness?.questions ?? []),
      ].filter((q, i, all) => all.findIndex((x) => x.id === q.id) === i),
    },
    coverageSummary:
      `${coverage.read} of ${coverage.totalPages} sheets read` +
      (coverage.deepRead > 0 ? `, ${coverage.deepRead} examined in detail` : "") +
      (coverage.failed > 0 ? `, ${coverage.failed} could NOT be read` : "") +
      ".",
    auditTrail: parts.map((p) => p.auditTrail).filter(Boolean).join("\n\n"),
  };
}

interface DocumentCoverage {
  totalPages: number;
  read: number;
  failed: number;
  deepRead: number;
  scanned: number;
  handwritten: number;
  everyPageRead: boolean;
  failedPages: { index: number; filename: string; pageInFile: number; reason: string }[];
}

interface DocumentReadiness {
  canFinalize: boolean;
  confidence: number;
  summary: string;
  blockers: { kind: string; message: string; remedy: string; blocking: boolean }[];
  questions: { id: string; question: string; why: string }[];
}

interface PlanConflict {
  label: string;
  unit: string | null;
  values: { value: number | null; sheet: string | null; page: number }[];
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
  /* Live send state for the upload step: a real percentage while the sheets
     travel, then a named processing phase while the server reads them. A plan
     set is the largest thing this site ever uploads, so this is the flow
     where a silent spinner hurt the most. */
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  /* Batch progress across a split upload, and the customer's own brief. */
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [instructions, setInstructions] = useState("");
  /* Sheets seen so far, filled in once the split has counted them. */
  const [filePageEstimate, setFilePageEstimate] = useState(0);
  /* Measurement and scope questions the read raised, asked ONE at a time.
     Rate questions are deliberately absent here: what this company charges is
     not something to ask the customer. Those go to /admin/takeoff. */
  const [askedIndex, setAskedIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [questionDraft, setQuestionDraft] = useState("");
  /* Field-level messages so a missed input is pointed at, not described in a
     banner. Cleared per field the moment that field changes. */
  const [fieldErrors, setFieldErrors] = useState<{
    totalSqFt?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});

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
  /* Set when the building is outside what the instant estimator covers. */
  const [outOfScope, setOutOfScope] = useState<string | null>(null);

  // Fires once on mount. The denominator for every other stage.
  useEffect(() => {
    trackEvent(PLAN_EVENTS.started);
  }, []);

  /* ── Progress survives a refresh ─────────────────────────────────────
     Everything except the raw File objects (which a browser cannot persist)
     is mirrored to sessionStorage: the step, the read we showed, the room
     corrections, and the contact answers. A reload resumes where the visitor
     was instead of asking them to re-upload a 20 MB plan set.

     The one restore rule: a step is never restored beyond what its data
     supports, and the result screen only ever exists after contact
     submission, so restoring it can never skip the gate. */
  const PROGRESS_KEY = "brc_plans_wizard_v1";
  /* State, not a ref: flipping it is batched into the same commit as the
     restored values, so the save effect cannot fire in between with
     pre-restore defaults and clobber the record it was about to load. */
  const [progressRestored, setProgressRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.v !== 1) return;
      if (p.extraction) setExtraction(p.extraction);
      if (Array.isArray(p.rooms)) setRooms(p.rooms);
      if (Array.isArray(p.documents)) setDocuments(p.documents);
      if (Array.isArray(p.attachedOnly)) setAttachedOnly(p.attachedOnly);
      if (typeof p.totalSqFt === "string") setTotalSqFt(p.totalSqFt);
      if (PROJECTS.some((x) => x.value === p.projectType)) setProjectType(p.projectType);
      if (FINISHES.some((x) => x.value === p.finishLevel)) setFinishLevel(p.finishLevel);
      if (typeof p.name === "string") setName(p.name);
      if (typeof p.email === "string") setEmail(p.email);
      if (typeof p.phone === "string") setPhone(formatPhoneInput(p.phone));
      if (p.preferredContact === "email" || p.preferredContact === "phone" || p.preferredContact === "text") {
        setPreferredContact(p.preferredContact);
      }
      if (typeof p.address === "string") setAddress(p.address);
      if (typeof p.timeline === "string") setTimeline(p.timeline);
      if (typeof p.notes === "string") setNotes(p.notes);
      if (p.result) setResult(p.result);

      const wanted: Step = STEP_ORDER.includes(p.step) ? p.step : "upload";
      const supported: Step =
        wanted === "result" && !p.result
          ? p.extraction ? "contact" : "upload"
          : wanted !== "upload" && !p.extraction
            ? "upload"
            : wanted;
      setStep(supported);
    } catch {
      /* A corrupt record just means starting fresh. */
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
          step, extraction, rooms, documents, attachedOnly,
          totalSqFt, projectType, finishLevel,
          name, email, phone, preferredContact, address, timeline, notes, result,
        }),
      );
    } catch {
      /* Private mode / quota: the visitor simply loses refresh recovery. */
    }
  }, [
    progressRestored,
    step, extraction, rooms, documents, attachedOnly,
    totalSqFt, projectType, finishLevel,
    name, email, phone, preferredContact, address, timeline, notes, result,
  ]);

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
    setUploadStatus({ phase: "uploading", percent: 0 });
    try {
      /* SPLIT FIRST, IN THE BROWSER. A real commercial set is 100+ sheets and
         well over 100MB, which no single request should ever carry. Each part
         is a handful of sheets, so progress is honest and one bad part costs
         that part. See lib/planSplitter.ts. */
      const split = await splitForUpload(files, (done, total) => {
        setFilePageEstimate(total);
        setUploadStatus({ phase: "uploading", percent: Math.round((done / Math.max(1, total)) * 40) });
      });
      if (!split.ok) {
        setError(split.error ?? "We could not open those drawings.");
        trackEvent(PLAN_EVENTS.analysisFailed, { reason: "split-failed" });
        return;
      }
      setBatchTotal(split.parts.length);
      setFilePageEstimate(split.totalPages);

      const partReads: AnalyzeResponse[] = [];
      const failure: { message: string; error?: string }[] = [];
      let completed = 0;

      /* BATCHES RUN CONCURRENTLY, BUT NOT ALL AT ONCE.
         Measured at roughly 68 seconds per batch of four 30x42 sheets, so a
         103-sheet set read one batch at a time is over half an hour of
         staring at a progress bar. The server already reads several sheets in
         parallel within a batch, so the client cap stays deliberately low:
         enough to cut the wall clock by two thirds, not so much that one
         visitor saturates the account's rate limit and starts failing their
         own batches. */
      const UPLOAD_CONCURRENCY = 3;
      let cursor = 0;

      const runOne = async (part: (typeof split.parts)[number], i: number) => {
        const form = new FormData();
        form.append("files", new File([part.blob], part.filename, { type: "application/pdf" }));
        form.append("pageOffset", String(part.pageOffset));
        if (instructions.trim()) form.append("instructions", instructions.trim());

        try {
          const res = await postFormWithProgress("/api/plans/analyze", form, () => {});
          const data = (res.data ?? {}) as AnalyzeResponse & { message?: string; error?: string };
          if (!res.ok) {
            /* One failed batch is NOT the end of the set. Record it, keep
               going, and report it as unread pages rather than throwing away
               every sheet that did read. */
            if (failure.length === 0) failure.push({ message: data.message ?? "", error: data.error });
            console.warn(`[plans] batch ${i + 1} of ${split.parts.length} failed:`, data.error);
            return;
          }
          partReads.push(data);
        } catch {
          if (failure.length === 0) failure.push({ message: "", error: "network" });
          console.warn(`[plans] batch ${i + 1} of ${split.parts.length} could not be sent`);
        } finally {
          completed += 1;
          setBatchDone(completed);
          // Splitting owns the first 40% of the bar, uploading the rest.
          setUploadStatus({
            phase: "processing",
            percent: 40 + Math.round((completed / split.parts.length) * 60),
          });
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, split.parts.length) }, async () => {
          for (;;) {
            const i = cursor++;
            if (i >= split.parts.length) return;
            await runOne(split.parts[i], i);
          }
        }),
      );
      setBatchDone(split.parts.length);

      if (partReads.length === 0) {
        setError(failure[0]?.message || "We could not read those drawings.");
        trackEvent(PLAN_EVENTS.analysisFailed, { reason: String(failure[0]?.error ?? "all-batches-failed") });
        return;
      }

      const read = mergeAnalyzeParts(partReads, split.totalPages);
      setExtraction(read);
      setDocuments(Array.isArray(read.stored) ? read.stored : []);
      setAttachedOnly(Array.isArray(read.attachedOnly) ? read.attachedOnly : []);
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
        // Page coverage is a different fact from measurement coverage: one
        // says how much of the DOCUMENT we read, the other how much of the
        // floor area carried a printed dimension. Both matter, separately.
        pages_total: read.coverage?.totalPages ?? 0,
        pages_failed: read.coverage?.failed ?? 0,
        sheet_conflicts: read.conflicts?.length ?? 0,
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
      setError("Something went wrong sending those drawings. Your sheets are still attached below, so just try again.");
      trackEvent(PLAN_EVENTS.analysisFailed, { reason: "network" });
    } finally {
      setBusy(false);
      setUploadStatus(null);
    }
  }

  function confirmMeasurements() {
    const total = Number(totalSqFt.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(total) || total <= 0) {
      setFieldErrors((p) => ({
        ...p,
        totalSqFt: "We need the total finished square footage of the home. It is the number we check our read against.",
      }));
      document.getElementById("plans-total-sqft")?.focus();
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
    /* Field-level checks, focus on the first field that needs attention. An
       email is validated for shape even when it is not the preferred channel:
       a mistyped address silently loses the written copy of the range. */
    const next: typeof fieldErrors = {};
    if (!name.trim()) {
      next.name = "We need your name.";
    }
    if (!address.trim()) {
      next.address = "We need the property address.";
    }
    if (preferredContact === "email" && !email.trim()) {
      next.email = "Add an email address, or change your preferred contact method.";
    } else if (email.trim() && !isValidEmail(email)) {
      next.email = "That email address does not look complete. Check it and try again.";
    }
    if (preferredContact !== "email" && !phone.trim()) {
      next.phone = "Add a phone number, or change your preferred contact method.";
    } else if (phone.trim() && !isValidPhone(phone)) {
      next.phone = "Please enter a valid 10-digit phone number.";
    }
    if (Object.keys(next).length > 0) {
      setFieldErrors((p) => ({ ...p, ...next }));
      const first = (["name", "address", "email", "phone"] as const).find((k) => next[k]);
      if (first) document.getElementById(`plans-${first}`)?.focus();
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
          coverageSummary: extraction?.coverageSummary,
          auditTrail: extraction?.auditTrail,
          /* Asking and then discarding the answer would be worse than not
             asking. These ride into the internal notes beside the drawings. */
          clarifications: Object.entries(questionAnswers).map(([id, answer]) => {
            const q = (extraction?.readiness?.questions ?? []).find((x) => x.id === id);
            return { question: q?.question ?? id, answer };
          }),
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

      /* OUT OF SCOPE IS NOT AN ERROR AND NOT A RANGE. A building outside the
         engine's calibrated size gets no number - showing one would be a
         residential figure for a job the calibration has never seen - but the
         read is real and the customer should see that we did the work and are
         handing it to a person. Fires the funnel event as a blocked narrowing
         rather than a generated estimate, so this does not read as a priced
         lead in the numbers. */
      if ((data as { outOfScope?: boolean }).outOfScope) {
        setOutOfScope((data as { message?: string }).message ?? null);
        trackEvent(PLAN_EVENTS.narrowingBlocked, { reason: "outside-calibrated-size" });
        goTo("result");
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

  const labelClass = "block text-body-sm uppercase tracking-[0.08em] text-inverse-muted mb-1.5";

  return (
    /* scroll-mt-16 clears the 61px sticky header when hero CTAs jump here via
       the #plans-estimator hash. The inner topRef div's own scroll-mt only
       protects in-wizard step transitions, not this anchor landing. */
    <Section id="plans-estimator" variant="inverse" divider className="scroll-mt-16">
      <div className="container mx-auto max-w-3xl scroll-mt-24 px-4" ref={setWizardRefs}>
        {step !== "result" ? (
          <WizardProgress steps={STEP_METAS} currentIndex={stepIndex} />
        ) : null}

        <WizardError message={error} />

        {/* ------------------------------------------------------- 1. upload */}
        {step === "upload" ? (
          <StepTransition>
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
              limitLabel={`Up to ${MAX_PLAN_PAGES} sheets. Large sets are split and uploaded automatically, so file size is not a limit.`}
              headline="Add your drawings"
              allowCamera={false}
              disabled={busy}
              status={uploadStatus}
              processingLabel={
                batchTotal > 1
                  ? describeUploadProgress(batchDone, batchTotal, filePageEstimate)
                  : "Reading your drawings..."
              }
            />

            {/* THE CUSTOMER'S OWN BRIEF. A full commercial set is read very
                differently depending on what is being asked for: "all of the
                millwork" wants casework details and interior elevations, and
                a whole-home remodel wants room areas. Guessing which is being
                asked produces a confident answer to the wrong question. */}
            <div className="mt-6">
              <label
                htmlFor="plans-instructions"
                className="block text-body-sm font-semibold uppercase tracking-wide text-inverse-foreground/80"
              >
                What should we focus on? <span className="font-normal normal-case opacity-70">(optional)</span>
              </label>
              <p className="mt-1 text-body-sm leading-relaxed text-inverse-muted">
                Tell us in your own words. For example: &quot;all of the millwork and casework only&quot;, or
                &quot;just the kitchen and the two bathrooms&quot;. We read every sheet either way; this
                changes what we look for while reading.
              </p>
              <textarea
                id="plans-instructions"
                data-testid="plans-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={2000}
                rows={3}
                disabled={busy}
                placeholder="e.g. Estimate all of the millwork only"
                className="mt-2 w-full resize-y rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] px-3 py-2 text-body text-inverse-foreground placeholder:text-inverse-muted focus:outline-none focus:ring-2 focus:ring-accent-legible"
              />
            </div>
            <StickyStepNav
              onNext={analyze}
              nextLabel="Read my plans"
              nextDisabled={files.length === 0}
              busy={busy}
              busyLabel="Reading your drawings..."
              nextTestId="button-plans-analyze"
              hint="No contact details needed yet. A large set can take a couple of minutes to read."
            />
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------ 2. measure */}
        {step === "measure" && extraction ? (
          <StepTransition>
            <StepHeading
              title="Here is what we measured. Is it right?"
              description="Take out anything that is not part of this project. Then tell us the total finished square footage of the home, which is how we check our read."
            />

            {/* HOW MUCH OF THE SET WE READ, as a fact. On a hundred-sheet
                permit set this is the first thing worth knowing, and the
                honest answer to what the customer is really asking when they
                upload one. Distinct from measurement coverage below. */}
            {extraction.coverage && extraction.coverage.totalPages > 0 ? (
              <div
                className={`mb-6 rounded-md border p-4 ${
                  extraction.coverage.everyPageRead
                    ? "border-inverse-foreground/20 bg-inverse-foreground/[0.06]"
                    : "border-amber-400/40 bg-amber-400/[0.08]"
                }`}
                data-testid="plans-coverage"
              >
                <p className="text-body leading-relaxed text-inverse-foreground">
                  {extraction.coverage.everyPageRead
                    ? `We read all ${extraction.coverage.totalPages} sheet${extraction.coverage.totalPages === 1 ? "" : "s"} you sent`
                    : `We read ${extraction.coverage.read} of ${extraction.coverage.totalPages} sheets`}
                  {extraction.coverage.deepRead > 0
                    ? `, and examined ${extraction.coverage.deepRead} of them in detail because they carry measurements`
                    : ""}
                  {extraction.coverage.scanned > 0 ? `. ${extraction.coverage.scanned} were scanned` : ""}
                  {extraction.coverage.handwritten > 0 ? `, ${extraction.coverage.handwritten} carry handwriting` : ""}.
                  {typeof extraction.duplicateRoomsMerged === "number" && extraction.duplicateRoomsMerged > 0
                    ? ` ${extraction.duplicateRoomsMerged} room${extraction.duplicateRoomsMerged === 1 ? " was" : "s were"} shown on more than one sheet and counted once.`
                    : ""}
                </p>
                {extraction.coverage.failedPages.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {extraction.coverage.failedPages.map((f) => (
                      <li key={f.index} className="text-body-sm text-inverse-muted">
                        Could not read {f.filename} page {f.pageInFile}: {f.reason} Anything shown
                        only on that sheet is NOT in this estimate.
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {/* Values two sheets disagree about. Asked, never resolved behind
                the customer's back: a superseded sheet and a current one look
                identical to a reader that has only the numbers. */}
            {extraction.conflicts && extraction.conflicts.length > 0 ? (
              <div
                className="mb-6 rounded-md border border-amber-400/40 bg-amber-400/[0.08] p-4"
                data-testid="plans-conflicts"
              >
                <p className="text-body font-semibold text-inverse-foreground">
                  {extraction.conflicts.length === 1
                    ? "Two sheets disagree on one measurement"
                    : `Sheets disagree on ${extraction.conflicts.length} measurements`}
                </p>
                <ul className="mt-2 space-y-2">
                  {extraction.conflicts.map((c, i) => (
                    <li key={i} className="text-body-sm leading-relaxed text-inverse-muted">
                      <span className="text-inverse-foreground/90">{c.label}</span>:{" "}
                      {c.values
                        .map((v) => `${v.value ?? "not stated"}${c.unit ? ` ${c.unit}` : ""}${v.sheet ? ` on ${v.sheet}` : ""}`)
                        .join(" versus ")}
                      . We have not assumed either. Correct it below and we will price that one.
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* What stands between this read and a tightened price, each with
                something the customer can actually do. */}
            {extraction.readiness && !extraction.readiness.canFinalize &&
            extraction.readiness.blockers.some((b) => b.blocking) ? (
              <div
                className="mb-6 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="plans-blockers"
              >
                <p className="text-body font-semibold text-inverse-foreground">
                  Before we can price this from the drawings
                </p>
                <ul className="mt-2 space-y-2">
                  {extraction.readiness.blockers
                    .filter((b) => b.blocking)
                    .map((b, i) => (
                      <li key={i} className="text-body-sm leading-relaxed text-inverse-muted">
                        <span className="text-inverse-foreground/90">{b.message}</span> {b.remedy}
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-body-sm text-inverse-muted">
                  You can still carry on. We will build a range from the total you give us and say
                  plainly that the drawings were not used.
                </p>
              </div>
            ) : null}

            {/* ONE QUESTION AT A TIME. A read of a hundred sheets can raise a
                dozen things it could not measure; a dozen fields is a form
                somebody abandons, and one question with the sheet it came from
                is a thing somebody answers. Answers ride to the team with the
                lead so the estimator sees them beside the drawings. */}
            {(() => {
              const asks = (extraction.readiness?.questions ?? []).filter(
                (q) => !String(q.id).startsWith("rate:"),
              );
              if (asks.length === 0 || askedIndex >= asks.length) return null;
              const q = asks[askedIndex];
              return (
                <div
                  className="mb-6 rounded-md border border-accent-legible/40 bg-accent-legible/[0.07] p-4"
                  data-testid="plans-question"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-label font-semibold uppercase tracking-wide text-inverse-muted">
                      One quick question
                    </span>
                    <span className="text-label text-inverse-muted" data-testid="plans-question-counter">
                      {askedIndex + 1} of {asks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-body font-semibold leading-snug text-inverse-foreground">
                    {q.question}
                  </p>
                  <p className="mt-1 text-body-sm leading-relaxed text-inverse-muted">{q.why}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      data-testid="plans-question-input"
                      value={questionDraft}
                      onChange={(e) => setQuestionDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (!questionDraft.trim()) return;
                        setQuestionAnswers((prev) => ({ ...prev, [q.id]: questionDraft.trim() }));
                        setQuestionDraft("");
                        setAskedIndex((i) => i + 1);
                      }}
                      placeholder="Your answer"
                      className="flex-1 rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] px-3 py-2 text-body text-inverse-foreground placeholder:text-inverse-muted focus:outline-none focus:ring-2 focus:ring-accent-legible"
                      aria-label={q.question}
                    />
                    <button
                      type="button"
                      data-testid="plans-question-next"
                      onClick={() => {
                        if (questionDraft.trim()) {
                          setQuestionAnswers((prev) => ({ ...prev, [q.id]: questionDraft.trim() }));
                        }
                        setQuestionDraft("");
                        setAskedIndex((i) => i + 1);
                      }}
                      className="rounded-sm bg-inverse-foreground px-3 py-2 text-body-sm font-medium text-inverse"
                    >
                      {questionDraft.trim() ? "Next" : "Skip"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {attachedOnly.length > 0 ? (
              <div
                className="mb-6 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-plans-attached-only"
              >
                <p className="text-body text-inverse-foreground leading-relaxed">
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
                onChange={(v) => {
                  setTotalSqFt(v);
                  setFieldErrors((p) => (p.totalSqFt ? { ...p, totalSqFt: undefined } : p));
                }}
                inputMode="numeric"
                placeholder="e.g. 2,400"
                error={fieldErrors.totalSqFt}
                testId="input-plans-total-sqft"
                help={
                  extraction.statedTotalSqFt
                    ? "Your drawings state this. Correct it if it is wrong."
                    : "Your drawings do not state a total, and we cannot get one reliably off the dimensions. Yours is the number we compare our room measurements against, so we can catch a misread before it reaches your price."
                }
              />
              <p className="mt-2.5 flex items-center gap-1.5 text-label text-accent-legible/90">
                <Ruler className="h-3 w-3" aria-hidden="true" /> The one number that catches a misread
              </p>
            </div>

            {/* The same selection cards the other estimators use, not dropdowns:
                every option is visible, every target is thumb-sized, and the
                selected state reads at a glance. */}
            <div className="mb-7 space-y-5">
              <div>
                <p className={labelClass}>What are we pricing?</p>
                <ChoiceGrid label="What are we pricing?" columns={2}>
                  {PROJECTS.map((p) => (
                    <OptionCard
                      key={p.value}
                      selected={projectType === p.value}
                      onSelect={() => setProjectType(p.value)}
                      title={p.label}
                      testId={`select-plans-project-type-${p.value}`}
                    />
                  ))}
                </ChoiceGrid>
              </div>
              <div>
                <p className={labelClass}>Finish level</p>
                <SegmentedControl
                  label="Finish level"
                  options={FINISHES.map((f) => ({ value: f.value, label: f.label, sub: f.hint }))}
                  value={finishLevel}
                  onChange={setFinishLevel}
                  columns={2}
                  testIdPrefix="select-plans-finish-level"
                />
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-body-sm text-inverse-muted">
                <span className="text-inverse-foreground">{measuredRooms.length}</span> rooms measured,{" "}
                <span className="text-inverse-foreground">
                  {Math.round(measuredArea).toLocaleString("en-US")}
                </span>{" "}
                sq ft
              </p>
              {unmeasured.length > 0 ? (
                <p className="text-body-sm text-inverse-muted">
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
                      <p className="text-body text-inverse-foreground leading-snug">{r.name}</p>
                      <p className="mt-1 text-body-sm text-inverse-muted">
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
                <p className="text-body-sm uppercase tracking-[0.08em] text-inverse-muted mb-3">
                  Work we read off your drawings ({scopeItems.length})
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2" data-testid="list-plan-scope">
                  {scopeItems.map((s, i) => (
                    <li key={i} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
                <p className="text-body text-inverse-foreground leading-relaxed mb-2">
                  Your drawings give this work to someone else, so it will not be in your price:
                </p>
                <ul className="space-y-1">
                  {excludedScope.map((s, i) => (
                    <li key={i} className="text-body-sm text-inverse-muted leading-relaxed">
                      {s.description}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-body-sm text-inverse-muted leading-relaxed">
                  If you want us to price any of it, say so in the notes on the next step.
                </p>
              </div>
            ) : null}

            {/* Named rather than dropped. A room that vanished without
                explanation is exactly the failure the RE-10 flow shipped once. */}
            {unmeasured.length > 0 ? (
              <p className="mt-4 text-body-sm text-inverse-muted leading-relaxed">
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
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------ 3. contact */}
        {step === "contact" ? (
          <StepTransition>
            <StepHeading
              title="Where should we send it?"
              description="Your range appears on the next screen. We will email you a copy with what we measured, so you can check it against your own drawings."
            />
            <div className="space-y-4">
              <TextField
                id="plans-name"
                label="Your name"
                required
                value={name}
                onChange={(v) => {
                  setName(v);
                  setFieldErrors((p) => (p.name ? { ...p, name: undefined } : p));
                }}
                autoComplete="name"
                error={fieldErrors.name}
                testId="input-plans-name"
              />
              <TextField
                id="plans-address"
                label="Property address"
                required
                value={address}
                onChange={(v) => {
                  setAddress(v);
                  setFieldErrors((p) => (p.address ? { ...p, address: undefined } : p));
                }}
                autoComplete="street-address"
                error={fieldErrors.address}
                testId="input-plans-address"
              />

              <div>
                <p className="mb-1.5 text-body-sm text-inverse-muted">Best way to reach you</p>
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
                id="plans-email"
                label="Email"
                required={preferredContact === "email"}
                optionalHint={preferredContact !== "email"}
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setFieldErrors((p) => (p.email ? { ...p, email: undefined } : p));
                }}
                autoComplete="email"
                inputMode="email"
                error={fieldErrors.email}
                testId="input-plans-email"
              />
              <TextField
                id="plans-phone"
                label="Phone"
                required={preferredContact !== "email"}
                optionalHint={preferredContact === "email"}
                type="tel"
                value={phone}
                onChange={(v) => {
                  setPhone(formatPhoneInput(v));
                  setFieldErrors((p) => (p.phone ? { ...p, phone: undefined } : p));
                }}
                autoComplete="tel"
                inputMode="tel"
                placeholder="(208) 555-0123"
                error={fieldErrors.phone}
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
                <label htmlFor="plans-notes" className="mb-1.5 flex items-baseline justify-between text-body-sm text-inverse-muted">
                  <span>Anything we should know</span>
                  <span className="text-inverse-muted/70">Optional</span>
                </label>
                <textarea
                  id="plans-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-inverse-foreground/25 bg-inverse-foreground/5 px-3 py-2.5 text-body-lg text-inverse-foreground focus:outline-none focus:ring-2 focus:ring-accent-legible"
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
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------- 4. result */}
        {/* A building we do not price instantly. Says what we DID do, why there
            is no number, and hands over to a person - rather than a blank
            screen or, far worse, a residential range for a restaurant. */}
        {step === "result" && outOfScope ? (
          <StepTransition>
            <div
              className="rounded-md border border-accent-legible/40 bg-accent-legible/[0.07] p-6"
              data-testid="plans-out-of-scope"
            >
              <h2 className="text-title-sm font-semibold text-inverse-foreground">
                We read your drawings. This one needs an estimator, not an instant number.
              </h2>
              <p className="mt-3 text-body leading-relaxed text-inverse-muted">{outOfScope}</p>
              <p className="mt-3 text-body leading-relaxed text-inverse-muted">
                Your details and everything we measured have gone to our team. We would rather hand you
                a real price than a fast one built for a different size of job.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`tel:${SITE_CONFIG.phoneTel}`}
                  className="rounded-sm bg-inverse-foreground px-4 py-2 text-body font-medium text-inverse"
                >
                  Call {SITE_CONFIG.phone}
                </a>
                <a
                  href="/contact"
                  className="rounded-sm border border-inverse-foreground/30 px-4 py-2 text-body text-inverse-foreground"
                >
                  Send a message instead
                </a>
              </div>
            </div>
          </StepTransition>
        ) : null}

        {step === "result" && result ? (
          <StepTransition>
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
          </StepTransition>
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
          <p className="mt-3 flex items-center gap-2 text-body-sm text-inverse-foreground/85">
            <Mail className="h-4 w-4 text-accent-legible" aria-hidden="true" />
            A copy is on its way to your inbox.
          </p>
        ) : (
          <p className="mt-3 text-body-sm text-inverse-foreground/85">
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
          <p className="text-body text-inverse-foreground leading-relaxed">
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
            <p className="text-body text-inverse-foreground leading-relaxed mb-2">
              We read your drawings, but they did not carry enough measurement for us to price from
              them directly, so this range is built from the total area you gave us.
            </p>
            <DetailList items={result.blockers} />
          </>
        )}
        {result.notMeasured.length > 0 ? (
          <p className="mt-3 text-body-sm text-inverse-muted leading-relaxed">
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
              <li key={i} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
          <p className="mb-2 text-body text-inverse-foreground leading-relaxed">
            Your drawings give this work to someone else, so it is not in your range:
          </p>
          <DetailList marker="cross" items={result.excludedScope.map((s) => s.description)} />
        </ResultCard>
      ) : null}

      {/* What we used */}
      <ResultCard title="What we used" testId="plans-selections">
        <ul className="space-y-1.5">
          {result.selections.map((s, i) => (
            <li key={i} className="text-body text-inverse-foreground/85">
              <span className="text-inverse-muted">{s.label}:</span> {s.value}
            </li>
          ))}
        </ul>
      </ResultCard>

      {/* Confidence statement */}
      <ResultCard title="How to read this range" testId="plans-confidence">
        <p className="text-body leading-relaxed text-inverse-muted">
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
              <li key={k} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
              <li key={k} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
              <li key={k} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
              <li key={k} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
              <li key={k} className="text-body-sm text-inverse-foreground/85 leading-relaxed">
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
              <li key={d.url} className="flex items-center gap-2 text-body-sm text-inverse-muted">
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
