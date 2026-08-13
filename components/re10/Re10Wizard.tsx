"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Mail,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { Section } from "@/components/marketing/Section";
import { RECIPES } from "@/shared/costs/re10Repairs";
import { RE10_PRICING_DISCLAIMER } from "@/shared/content/re10Content";
import type { ExtractedRepair, ExtractionResult } from "@/shared/re10/extraction";

/** Coverage and readiness as the analyze route reports them. */
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

interface DuplicateNotice {
  a: number;
  b: number;
  reason: string;
  descriptionA: string;
  descriptionB: string;
}
import {
  classifyUpload,
  MAX_UPLOAD_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  READABLE_FORMATS_LABEL,
} from "@/shared/re10/uploads";
import { RE10_EVENTS } from "@/shared/re10/analyticsEvents";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";
import { useModals } from "@/components/modals/modalsContext";
import { postFormWithProgress, type UploadStatus } from "@/lib/uploadWithProgress";
import { formatPhoneInput, isValidEmail, isValidPhone } from "@/lib/wizardFormat";
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
 * The RE-10 estimator, rebuilt as a guided mobile-first wizard.
 *
 * The order is deliberate and unchanged: upload, confirm what we read, contact
 * details, property and timing, then the firm price. The homeowner sees and
 * corrects the extracted repair list BEFORE giving us anything, so the contact
 * steps are the last part of getting an estimate rather than the price of
 * finding out we misread a document.
 *
 * Every step advances through a sticky Back / Continue bar; nothing is entered
 * twice, and editing the scope from the result returns to the review step with
 * every answer preserved.
 */

type Step = "upload" | "review" | "contact" | "property" | "result";

interface EditableRepair extends ExtractedRepair {
  id: string;
  included: boolean;
  /**
   * The measurement AS TYPED. The field used to bind the parsed number back
   * into the input, which deleted a trailing decimal point on every render -
   * typing "12.5" became "12", then the next keystroke made it "125", a 10x
   * quantity error submitted silently. Text state round-trips faithfully;
   * parsing happens once, at submit.
   */
  quantityText: string;
}

interface ResultDisclosureShape {
  assumptions: string[];
  included: number;
  excluded: { label: string; detail?: string }[];
  needsAttention: { label: string; detail?: string; status: string }[];
  allowances: { label: string; detail?: string }[];
  warnings: string[];
  missing: { what: string; where?: string; effect?: string; remedy?: string }[];
  factors: string[];
  acknowledgments: string[];
  nextSteps: string[];
  confidence: string;
}

interface EstimateResponse {
  price: number;
  validDays: number;
  confidence: "high" | "medium" | "low";
  propertyAddress: string;
  closingDate: string | null;
  repairDeadline: string | null;
  categories: {
    trade: string;
    label: string;
    itemCount: number;
    items: { description: string; label: string; location: string | null; quantityAssumed: boolean; quantity?: number; unit?: string }[];
  }[];
  needsOnsite: { description: string; why: string }[];
  uncertainty: string[];
  assumptions: string[];
  priced: number;
  unpriced: number;
  emailed: boolean;
  disclosure?: ResultDisclosureShape;
}

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const ROLES = [
  { value: "buyer-agent", label: "Buyer's agent" },
  { value: "seller-agent", label: "Seller's agent" },
  { value: "coordinator", label: "Transaction coordinator" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "other", label: "Other" },
] as const;

const FORM_STEPS: { id: Step; meta: WizardStepMeta }[] = [
  { id: "upload", meta: { id: "upload", section: "Documents", label: "Upload your RE-10 and inspection pages" } },
  { id: "review", meta: { id: "review", section: "Confirm", label: "Check the repairs we read" } },
  { id: "contact", meta: { id: "contact", section: "Your details", label: "How we should reach you" } },
  { id: "property", meta: { id: "property", section: "Your details", label: "Property and timing" } },
  { id: "result", meta: { id: "result", section: "Estimate", label: "Your repair price" } },
];
const STEP_METAS = FORM_STEPS.map((s) => s.meta);
const STEP_ORDER: Step[] = FORM_STEPS.map((s) => s.id);

const fileKey = (f: File) => `${f.name}:${f.size}`;

/**
 * Typed measurement -> posted quantity. Empty, zero, or unparseable text all
 * become null, which the pricing engine treats as "use the typical size for
 * this repair" - the same thing that happens when the document itself has no
 * measurement. Capped at the request schema's ceiling so a wild entry cannot
 * turn into a submit-time 400.
 */
function parseQuantity(text: string): number | null {
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 100_000);
}

export function Re10Wizard() {
  const [step, setStep] = useState<Step>("upload");
  const topRef = useRef<HTMLDivElement | null>(null);
  /* The wizard body, watched so the site-wide Call / Text bar steps aside while
     the estimator (and its own sticky Back / Continue) owns the bottom of the
     screen, then returns once the visitor scrolls away. */
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const setWizardRefs = (el: HTMLDivElement | null) => {
    topRef.current = el;
    sectionRef.current = el;
  };

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Live send state for the upload step: a real percentage while the files
     travel, then a named processing phase while the server reads them. */
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  /* Field-level messages so a missed input is pointed at, not described in a
     banner. Cleared per field the moment that field changes. */
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  /* Page-by-page coverage and the readiness verdict from the analyze step.
     These answer "did you read all of it?" with a fact rather than a
     reassurance, and they gate how confidently the result is presented. */
  const [coverage, setCoverage] = useState<DocumentCoverage | null>(null);
  const [readiness, setReadiness] = useState<DocumentReadiness | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateNotice[]>([]);
  /* Provenance strings from the analyze step, carried to the lead so an
     estimator can trace any figure back to a sheet. Never displayed. */
  const [provenance, setProvenance] = useState<{ coverageSummary?: string; auditTrail?: string }>({});
  const [attachedOnly, setAttachedOnly] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ filename: string; url: string }[]>([]);
  const [repairs, setRepairs] = useState<EditableRepair[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState<"email" | "phone" | "text">("email");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("buyer-agent");
  const [brokerage, setBrokerage] = useState("");
  const [address, setAddress] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [repairDeadline, setRepairDeadline] = useState("");
  const [occupancy, setOccupancy] = useState<"occupied" | "vacant" | "unknown">("unknown");
  /* The engine has always priced an access uplift (limited/difficult), but no
     client ever asked the question, so every estimate silently priced as
     "standard". Asking is the fix - this is exactly the "collect what
     actually affects price" rule. */
  const [access, setAccess] = useState<"standard" | "limited" | "difficult">("standard");
  const [notes, setNotes] = useState("");

  const [result, setResult] = useState<EstimateResponse | null>(null);
  /* True when the last analysis stored the files but priced nothing - the
     dead-end that used to produce zero lead and zero notification. */
  const [unpriceable, setUnpriceable] = useState(false);
  const { openConsult } = useModals();

  /* The hand-off from the dead end. The files ARE stored by the analyze step;
     what used to be missing was any way for a lead to exist. The consult form
     is the canonical lead path, so the context (what was asked for, where the
     documents live) rides into its note field rather than a new lead system. */
  function sendUnpriceableToTeam() {
    const parts: string[] = ["RE-10 uploaded but nothing was automatically priceable - please price by hand."];
    if (extraction && extraction.unmapped.length > 0) {
      parts.push("Requests read from the document:");
      // Every request, not the first twenty. This note IS the lead when
      // nothing was priceable, and a silent truncation here is the whole
      // reason the customer contacted us disappearing into a slice().
      for (const u of extraction.unmapped) parts.push(`- ${u.verbatim}`);
    }
    if (documents.length > 0) {
      parts.push("Uploaded documents:");
      for (const d of documents) parts.push(`- ${d.filename}: ${d.url}`);
    }
    try {
      sessionStorage.setItem("brc_consult_context", parts.join("\n"));
    } catch {
      /* storage unavailable - the modal still opens; they can describe it */
    }
    trackEvent(RE10_EVENTS.onsiteRequested, { from: "unpriceable-upload" });
    openConsult();
  }

  useEffect(() => {
    trackEvent(RE10_EVENTS.started);
  }, []);

  /* ── Progress survives a refresh ─────────────────────────────────────
     Everything except the raw File objects (which a browser cannot persist)
     is mirrored to sessionStorage: the step, the read we showed, the
     corrections made to it, and the contact answers. A reload resumes where
     the visitor was instead of asking them to re-upload and start over.

     The one restore rule: a step is never restored beyond what its data
     supports, so "result" without a stored result (or "review" without an
     extraction) falls back to the last step that can actually render. The
     result screen itself only ever exists after contact submission, so
     restoring it can never skip the gate. */
  const PROGRESS_KEY = "brc_re10_wizard_v1";
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
      if (Array.isArray(p.attachedOnly)) setAttachedOnly(p.attachedOnly);
      if (p.coverage) setCoverage(p.coverage);
      if (p.readiness) setReadiness(p.readiness);
      if (Array.isArray(p.duplicates)) setDuplicates(p.duplicates);
      if (p.provenance) setProvenance(p.provenance);
      if (Array.isArray(p.documents)) setDocuments(p.documents);
      if (Array.isArray(p.repairs)) {
        // A record saved before quantityText existed restores without it;
        // derive the text from the stored numeric quantity.
        setRepairs(
          p.repairs.map((r: EditableRepair) => ({
            ...r,
            quantityText:
              typeof r.quantityText === "string"
                ? r.quantityText
                : r.quantity != null
                  ? String(r.quantity)
                  : "",
          })),
        );
      }
      if (typeof p.name === "string") setName(p.name);
      if (typeof p.email === "string") setEmail(p.email);
      if (typeof p.phone === "string") setPhone(formatPhoneInput(p.phone));
      if (p.preferredContact === "email" || p.preferredContact === "phone" || p.preferredContact === "text") {
        setPreferredContact(p.preferredContact);
      }
      if (typeof p.role === "string" && ROLES.some((r) => r.value === p.role)) setRole(p.role);
      if (typeof p.brokerage === "string") setBrokerage(p.brokerage);
      if (typeof p.address === "string") setAddress(p.address);
      if (typeof p.closingDate === "string") setClosingDate(p.closingDate);
      if (typeof p.repairDeadline === "string") setRepairDeadline(p.repairDeadline);
      if (p.occupancy === "occupied" || p.occupancy === "vacant" || p.occupancy === "unknown") {
        setOccupancy(p.occupancy);
      }
      if (p.access === "standard" || p.access === "limited" || p.access === "difficult") {
        setAccess(p.access);
      }
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
          step, extraction, attachedOnly, documents, repairs, coverage, readiness, duplicates, provenance,
          name, email, phone, preferredContact, role, brokerage,
          address, closingDate, repairDeadline, occupancy, access, notes, result,
        }),
      );
    } catch {
      /* Private mode / quota: the visitor simply loses refresh recovery. */
    }
  }, [
    progressRestored,
    step, extraction, attachedOnly, documents, repairs, coverage, readiness, duplicates, provenance,
    name, email, phone, preferredContact, role, brokerage,
    address, closingDate, repairDeadline, occupancy, access, notes, result,
  ]);

  // A file dropped anywhere except the box must not navigate the page away.
  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

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
      problems.length > 0
        ? `We can read ${READABLE_FORMATS_LABEL}. Left out: ${problems.join("; ")}.`
        : null,
    );
    if (added > 0) {
      trackEvent(RE10_EVENTS.documentUploaded, { file_count: next.length, added, method });
    }
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
      setError("Attach your RE-10, the inspection pages, or photos to get started.");
      return;
    }
    setBusy(true);
    setError(null);
    setUploadStatus({ phase: "uploading", percent: 0 });
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await postFormWithProgress("/api/re10/analyze", form, setUploadStatus);
      const data = (res.data ?? {}) as ExtractionResult & { message?: string; error?: string; stored?: unknown; attachedOnly?: unknown };
      if (!res.ok) {
        setError(data.message ?? "We could not read those documents.");
        trackEvent(RE10_EVENTS.analysisFailed, { reason: String(data.error ?? res.status) });
        return;
      }
      const extracted = data as ExtractionResult;
      setUnpriceable(false);
      setExtraction(extracted);
      const withEvidence = data as typeof data & {
        coverage?: DocumentCoverage;
        readiness?: DocumentReadiness;
        duplicates?: DuplicateNotice[];
      };
      setCoverage(withEvidence.coverage ?? null);
      setReadiness(withEvidence.readiness ?? null);
      setDuplicates(Array.isArray(withEvidence.duplicates) ? withEvidence.duplicates : []);
      const prov = data as typeof data & { coverageSummary?: string; auditTrail?: string };
      setProvenance({ coverageSummary: prov.coverageSummary, auditTrail: prov.auditTrail });
      setDocuments(Array.isArray(data.stored) ? data.stored : []);
      setAttachedOnly(Array.isArray(data.attachedOnly) ? data.attachedOnly : []);
      if (extracted.propertyAddress) setAddress((a) => a || extracted.propertyAddress!);
      if (extracted.closingDate) setClosingDate((d) => d || extracted.closingDate!);
      if (extracted.repairDeadline) setRepairDeadline((d) => d || extracted.repairDeadline!);
      trackEvent(RE10_EVENTS.analysisCompleted, {
        repairs_found: extracted.repairs.length,
        unmapped: extracted.unmapped.length,
        pages_total: withEvidence.coverage?.totalPages ?? 0,
        pages_failed: withEvidence.coverage?.failed ?? 0,
        can_finalize: withEvidence.readiness?.canFinalize ?? true,
      });
      setRepairs(
        extracted.repairs.map((r, i) => ({
          ...r,
          id: `r${i}`,
          included: true,
          quantityText: r.quantity != null ? String(r.quantity) : "",
        })),
      );

      if (extracted.repairs.length === 0) {
        setUnpriceable(true);
        const reason = !extracted.looksLikeRe10
          ? "not-a-re10"
          : extracted.unmapped.length > 0
            ? "none-priceable"
            : "no-repairs-found";
        setError(
          reason === "not-a-re10"
            ? "This does not look like an RE-10 or an inspection response - we could not find a repair list in it. Send the RE-10 itself, or the inspection report pages that list the repairs, and we will read those."
            : reason === "none-priceable"
              ? `We read ${extracted.unmapped.length} request${extracted.unmapped.length === 1 ? "" : "s"}, but none of them are the kind we can price automatically. Call us and we will price this list by hand - it is the sort of thing we do every week.`
              : "We read the document but could not find any repair requests in it. If the repair list is on another page, add that page and try again.",
        );
        trackEvent(RE10_EVENTS.analysisFailed, { reason });
        return;
      }

      goTo("review");
    } catch {
      setError("Something went wrong sending those files. Your documents are still attached below, so just try again.");
      trackEvent(RE10_EVENTS.analysisFailed, { reason: "network" });
    } finally {
      setBusy(false);
      setUploadStatus(null);
    }
  }

  function validateReview(): boolean {
    if (repairs.filter((r) => r.included).length === 0) {
      setError("Keep at least one repair in the list to get a price.");
      return false;
    }
    return true;
  }

  /* Field-level checks. An email is validated for shape even when it is not
     the preferred channel: a mistyped address silently loses the written copy
     of the estimate. Focus lands on the first field that needs attention. */
  function validateContact(): boolean {
    const next: typeof fieldErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      next.name = "Please enter your full name so we know who to send this to.";
    }
    if (preferredContact === "email" && !email.trim()) {
      next.email = "Add an email address, or change your preferred contact method below.";
    } else if (email.trim() && !isValidEmail(email)) {
      next.email = "That email address does not look complete. Check it and try again.";
    }
    if (preferredContact !== "email" && !phone.trim()) {
      next.phone = "Add a phone number, or change your preferred contact method below.";
    } else if (phone.trim() && !isValidPhone(phone)) {
      next.phone = "Please enter a valid 10-digit phone number.";
    }
    setFieldErrors((p) => ({ ...next, address: p.address }));
    const first = (["name", "email", "phone"] as const).find((k) => next[k]);
    if (first) {
      document.getElementById(`re10-${first}`)?.focus();
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validateReview()) {
      goTo("review");
      return;
    }
    if (!name.trim()) {
      setFieldErrors((p) => ({ ...p, name: "We need your name." }));
      goTo("contact");
      return;
    }
    if (!address.trim()) {
      setFieldErrors((p) => ({ ...p, address: "We need the property address." }));
      document.getElementById("re10-address")?.focus();
      return;
    }

    const included = repairs.filter((r) => r.included);
    setBusy(true);
    setError(null);
    trackEvent(RE10_EVENTS.contactSubmitted, { preferred_contact: preferredContact, role });
    try {
      const res = await fetch("/api/re10/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairs: included.map((r) => ({
            id: r.id,
            description: r.verbatim,
            kind: r.kind,
            location: r.location,
            // Parsed once here from the typed text. Garbage, "0", and empty
            // all become null, which the engine prices at the typical size -
            // never a submit-time 400 the visitor cannot trace to a field.
            quantity: parseQuantity(r.quantityText),
            sourceRef: r.sourceRef,
            needsReview: r.needsReview,
          })),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          preferredContact,
          role,
          brokerage: brokerage.trim() || undefined,
          propertyAddress: address.trim(),
          closingDate: closingDate || undefined,
          repairDeadline: repairDeadline || undefined,
          occupancy,
          hasInspectionReport: files.length > 1,
          documents,
          unmapped: extraction?.unmapped ?? [],
          documentNotes: extraction?.documentNotes ?? [],
          notes: notes.trim() || undefined,
          // The customer's own removals travel too - anything not in the
          // price is named, including the things they excluded themselves.
          excluded: repairs
            .filter((r) => !r.included)
            .map((r) => ({ description: r.verbatim })),
          looksLikeRe10: extraction?.looksLikeRe10,
          attachedOnly,
          access,
          coverageSummary: provenance.coverageSummary,
          auditTrail: provenance.auditTrail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fieldErrors: Record<string, string[] | undefined> = data.errors?.fieldErrors ?? {};
        const detail = Object.values(fieldErrors)
          .flatMap((messages) => messages ?? [])
          .filter(Boolean);
        setError(detail.length > 0 ? detail.join(" ") : (data.message ?? "We could not build your price."));
        trackEvent(RE10_EVENTS.analysisFailed, {
          reason: "estimate-rejected",
          fields: Object.keys(fieldErrors).join(",") || String(res.status),
        });
        return;
      }
      const estimate = data as EstimateResponse;
      setResult(estimate);

      trackEvent(RE10_EVENTS.estimateGenerated, {
        value: estimate.price,
        currency: "USD",
        confidence: estimate.confidence,
        priced_items: estimate.priced,
        onsite_items: estimate.unpriced,
      });
      trackMetaEvent(
        "Lead",
        { content_name: "RE-10 repair estimate", value: estimate.price, currency: "USD" },
        { email: email.trim() || undefined, phone: phone.trim() || undefined },
      );
      if (estimate.emailed) trackEvent(RE10_EVENTS.estimateEmailed);

      goTo("result");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step === "contact") trackEvent(RE10_EVENTS.contactViewed);
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

  const stepIndex = STEP_ORDER.indexOf(step);
  const includedCount = repairs.filter((r) => r.included).length;

  return (
    /* scroll-mt-16 clears the 61px sticky header when hero CTAs jump here via
       the #re10-estimator hash. The inner topRef div's own scroll-mt only
       protects in-wizard step transitions, not this anchor landing. */
    <Section id="re10-estimator" variant="inverse" divider className="scroll-mt-16">
      <div className="container mx-auto max-w-3xl scroll-mt-24 px-4" ref={setWizardRefs}>
        {step !== "result" ? (
          <WizardProgress steps={STEP_METAS} currentIndex={stepIndex} />
        ) : null}

        <WizardError message={error} />

        {/* ------------------------------------------------------- 1. upload */}
        {step === "upload" ? (
          <StepTransition>
            <StepHeading
              eyebrow="RE-10 repair estimator"
              title="Upload your RE-10 and get a firm price"
              description="Send the RE-10, the inspection report pages, and any photos. We read the repair list, show you what we found, and you correct it before anything is priced. No contact details needed yet."
              help={
                <>
                  A phone photo of a printed form works. If your repair list is on separate
                  inspection pages, add those too. We confirm each file below once it is attached,
                  and you can remove anything before continuing.
                </>
              }
            />
            <UploadField
              files={files}
              onAdd={addFiles}
              onRemove={removeFile}
              accept={UPLOAD_ACCEPT}
              acceptLabel={`PDFs, photos or scans. ${READABLE_FORMATS_LABEL} read automatically.`}
              limitLabel={`Up to ${MAX_UPLOAD_FILES} files, ${Math.round(MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024))} MB total.`}
              headline="Add your RE-10"
              disabled={busy}
              status={uploadStatus}
              processingLabel="Reading your documents..."
            />

            {unpriceable ? (
              <div
                className="mt-5 rounded-md border border-accent-legible/40 bg-accent-legible/[0.07] p-4"
                data-testid="notice-re10-unpriceable"
              >
                <p className="text-[13.5px] leading-relaxed text-inverse-foreground mb-3">
                  Your documents are stored with us either way. Leave your details and our team
                  will price the list by hand - usually within one business day.
                </p>
                <button
                  type="button"
                  onClick={sendUnpriceableToTeam}
                  data-testid="button-re10-send-to-team"
                  className="inline-flex min-h-11 items-center rounded-md border border-accent-legible/50 bg-inverse-foreground/[0.06] px-4 text-[14px] text-inverse-foreground transition-colors hover:border-accent-legible hover:bg-inverse-foreground/[0.1]"
                >
                  Send this to our team
                </button>
              </div>
            ) : null}

            <StickyStepNav
              onNext={analyze}
              nextLabel="Review my repair list"
              nextDisabled={files.length === 0}
              busy={busy}
              busyLabel="Reading your documents..."
              nextTestId="button-re10-analyze"
              hint="No contact details needed yet. You will see the repairs we found first."
            />
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------- 2. review */}
        {step === "review" && extraction ? (
          <StepTransition>
            <StepHeading
              title="Here is what we read. Is it right?"
              description="Remove anything that should not be included, and add a measurement where we did not find one. The more you correct here, the more exact your price."
            />

            {/* WHAT WE ACTUALLY READ, stated as a fact. On a long document this
                is the first thing worth knowing, and until now the only
                evidence was that some repairs came back. */}
            {coverage && coverage.totalPages > 0 ? (
              <div
                className={`mb-5 rounded-md border p-4 ${
                  coverage.everyPageRead
                    ? "border-inverse-foreground/20 bg-inverse-foreground/[0.06]"
                    : "border-amber-400/40 bg-amber-400/[0.08]"
                }`}
                data-testid="re10-coverage"
              >
                <p className="text-[13.5px] leading-relaxed text-inverse-foreground">
                  {coverage.everyPageRead
                    ? `We read all ${coverage.totalPages} page${coverage.totalPages === 1 ? "" : "s"} you sent`
                    : `We read ${coverage.read} of ${coverage.totalPages} pages`}
                  {coverage.scanned > 0 ? `, ${coverage.scanned} of them scanned` : ""}
                  {coverage.handwritten > 0 ? `, ${coverage.handwritten} with handwriting` : ""}.
                </p>
                {coverage.failedPages.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {coverage.failedPages.map((f) => (
                      <li key={f.index} className="text-[12.5px] text-inverse-muted">
                        Could not read {f.filename} page {f.pageInFile}: {f.reason} Anything on it is
                        NOT in your price.
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {/* Anything that would make a tightened price a guess, said plainly,
                each with something the customer can actually do about it. */}
            {readiness && !readiness.canFinalize && readiness.blockers.length > 0 ? (
              <div
                className="mb-5 rounded-md border border-amber-400/40 bg-amber-400/[0.08] p-4"
                data-testid="re10-blockers"
              >
                <p className="text-[13.5px] font-semibold text-inverse-foreground">
                  Before we can price this tightly
                </p>
                <ul className="mt-2 space-y-2">
                  {readiness.blockers
                    .filter((b) => b.blocking)
                    .map((b, i) => (
                      <li key={i} className="text-[12.5px] leading-relaxed text-inverse-muted">
                        <span className="text-inverse-foreground/90">{b.message}</span> {b.remedy}
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-[12.5px] text-inverse-muted">
                  You can still carry on. We will price what we could read and say plainly what was
                  left out.
                </p>
              </div>
            ) : null}

            {/* Possible restatements. ASKED, never merged behind their back:
                dropping one silently would lose real scope, and pricing both
                charges twice for one job. */}
            {duplicates.length > 0 ? (
              <div
                className="mb-5 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="re10-duplicates"
              >
                <p className="text-[13.5px] font-semibold text-inverse-foreground">
                  {duplicates.length === 1
                    ? "One of these may be listed twice"
                    : `${duplicates.length} of these may be listed twice`}
                </p>
                <ul className="mt-2 space-y-2">
                  {duplicates.map((d, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-inverse-muted">
                      <span className="text-inverse-foreground/90">{d.descriptionA}</span>
                      {" and "}
                      <span className="text-inverse-foreground/90">{d.descriptionB}</span>. {d.reason}{" "}
                      If it is one job, untick one of them below.
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!extraction.looksLikeRe10 ? (
              <div className="mb-5 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4">
                <p className="text-[13.5px] leading-relaxed text-inverse-foreground">
                  This did not read like an RE-10 or inspection response. Check you sent the right
                  pages, or carry on and we will review it by hand.
                </p>
              </div>
            ) : null}

            {attachedOnly.length > 0 ? (
              <div
                className="mb-5 rounded-md border border-inverse-foreground/20 bg-inverse-foreground/[0.06] p-4"
                data-testid="notice-re10-attached-only"
              >
                <p className="text-[13.5px] leading-relaxed text-inverse-foreground">
                  {attachedOnly.join(", ")} {attachedOnly.length === 1 ? "is" : "are"} attached for
                  our team but {attachedOnly.length === 1 ? "was" : "were"} not read automatically.
                  Mention anything in {attachedOnly.length === 1 ? "it" : "them"} in the notes, or we
                  will catch it when we review.
                </p>
              </div>
            ) : null}

            <ul className="space-y-3" data-testid="list-re10-repairs">
              {repairs.map((r) => (
                <li
                  key={r.id}
                  className={
                    "rounded-md border p-4 transition-colors " +
                    (r.included
                      ? "border-inverse-foreground/15 bg-inverse-foreground/[0.05]"
                      : "border-inverse-foreground/10 bg-transparent opacity-60")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14.5px] leading-relaxed text-inverse-foreground">{r.verbatim}</p>
                      <p className="mt-1 text-[12.5px] text-inverse-muted">
                        {RECIPES[r.kind]?.label ?? r.kind}
                        {r.location ? ` / ${r.location}` : ""}
                        {r.confidence !== "high" ? ` / ${r.confidence} confidence` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setRepairs((prev) =>
                          prev.map((p) => (p.id === r.id ? { ...p, included: !p.included } : p)),
                        )
                      }
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-inverse-foreground/25 text-inverse-muted transition-colors hover:text-inverse-foreground"
                      aria-label={r.included ? `Remove ${r.verbatim}` : `Add back ${r.verbatim}`}
                    >
                      {r.included ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>

                  {r.needsReview ? (
                    <p className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-inverse-foreground/75">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-legible" aria-hidden="true" />
                      Needs an onsite look. We will list it separately rather than guess at a price.
                    </p>
                  ) : null}

                  {r.included ? (
                    <div className="mt-3 flex items-center gap-2">
                      <label htmlFor={`qty-${r.id}`} className="whitespace-nowrap text-[12.5px] text-inverse-muted">
                        {parseQuantity(r.quantityText) == null ? "Add a measurement" : "Measurement"}
                      </label>
                      <input
                        id={`qty-${r.id}`}
                        type="text"
                        inputMode="decimal"
                        value={r.quantityText}
                        placeholder={String(RECIPES[r.kind]?.defaultQty ?? "")}
                        onChange={(e) => {
                          // Store what was typed (digits and one decimal point);
                          // parse only at submit so a trailing "." survives.
                          const raw = e.target.value.replace(/[^\d.]/g, "");
                          setRepairs((prev) =>
                            prev.map((p) => (p.id === r.id ? { ...p, quantityText: raw } : p)),
                          );
                        }}
                        className="min-h-11 w-24 rounded-md border border-inverse-foreground/25 bg-inverse-foreground/5 px-3 text-[16px] text-inverse-foreground placeholder:text-inverse-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-legible"
                      />
                      <span className="text-[12.5px] text-inverse-muted">
                        {RECIPES[r.kind]?.unit === "SF" ? "sq ft" : RECIPES[r.kind]?.unit === "LF" ? "linear ft" : "count"}
                      </span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            {extraction.unmapped.length > 0 ? (
              <div className="mt-5 rounded-md border border-inverse-foreground/15 p-4">
                <p className="mb-2 text-[13px] text-inverse-foreground">
                  We could not categorise these, so a person will look at them:
                </p>
                <ul className="space-y-1.5">
                  {extraction.unmapped.map((u) => (
                    <li key={u.verbatim} className="text-[12.5px] leading-relaxed text-inverse-muted">
                      {u.verbatim} <span className="text-inverse-muted/70">({u.reason})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <StickyStepNav
              onBack={() => goTo("upload")}
              backLabel="Add documents"
              onNext={() => {
                if (!validateReview()) return;
                trackEvent(RE10_EVENTS.repairsConfirmed, {
                  kept: repairs.filter((r) => r.included).length,
                  removed: repairs.filter((r) => !r.included).length,
                });
                goTo("contact");
              }}
              nextLabel="These look right"
              nextTestId="button-re10-confirm"
              hint={`${includedCount} repair${includedCount === 1 ? "" : "s"} will be priced.`}
            />
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------ 3. contact */}
        {step === "contact" ? (
          <StepTransition>
            <StepHeading
              title="Where should we send it?"
              description="Enter your contact information to view your RE-10 repair estimate and receive a copy by your preferred method."
            />
            <div className="space-y-4">
              <TextField
                id="re10-name"
                label="Full name"
                required
                value={name}
                onChange={(v) => {
                  setName(v);
                  setFieldErrors((p) => (p.name ? { ...p, name: undefined } : p));
                }}
                autoComplete="name"
                error={fieldErrors.name}
                testId="input-re10-name"
              />

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Your role</p>
                <ChoiceGrid label="Your role" columns={2}>
                  {ROLES.map((r) => (
                    <OptionCard
                      key={r.value}
                      selected={role === r.value}
                      onSelect={() => setRole(r.value)}
                      title={r.label}
                      testId={`re10-role-${r.value}`}
                    />
                  ))}
                </ChoiceGrid>
              </div>

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Preferred contact method</p>
                <SegmentedControl
                  label="Preferred contact method"
                  options={[
                    { value: "email", label: "Email" },
                    { value: "phone", label: "Phone" },
                    { value: "text", label: "Text" },
                  ]}
                  value={preferredContact}
                  onChange={setPreferredContact}
                  columns={3}
                  testIdPrefix="re10-contact-method"
                />
              </div>

              <TextField
                id="re10-email"
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
                testId="input-re10-email"
              />
              <TextField
                id="re10-phone"
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
                testId="input-re10-phone"
              />
            </div>

            <StickyStepNav
              onBack={() => goTo("review")}
              onNext={() => {
                if (!validateContact()) return;
                goTo("property");
              }}
              nextLabel="Continue"
              nextTestId="button-re10-contact-next"
            />
          </StepTransition>
        ) : null}

        {/* ----------------------------------------------------- 4. property */}
        {step === "property" ? (
          <StepTransition>
            <StepHeading
              title="The property and your timeline"
              description="We prefill what the RE-10 already told us. Confirm the address and add the repair deadline so we can hold the right price."
            />
            <div className="space-y-4">
              <TextField
                id="re10-address"
                label="Property address"
                required
                value={address}
                onChange={(v) => {
                  setAddress(v);
                  setFieldErrors((p) => (p.address ? { ...p, address: undefined } : p));
                }}
                autoComplete="street-address"
                error={fieldErrors.address}
                testId="input-re10-address"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Repair deadline" optionalHint type="date" value={repairDeadline} onChange={setRepairDeadline} />
                <TextField label="Closing date" optionalHint type="date" value={closingDate} onChange={setClosingDate} />
              </div>
              <TextField label="Brokerage or company" optionalHint value={brokerage} onChange={setBrokerage} />

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Property is</p>
                <SegmentedControl
                  label="Property is"
                  options={[
                    { value: "vacant", label: "Vacant" },
                    { value: "occupied", label: "Occupied" },
                    { value: "unknown", label: "Not sure" },
                  ]}
                  value={occupancy}
                  onChange={setOccupancy}
                  columns={3}
                  testIdPrefix="re10-occupancy"
                />
              </div>

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Getting our crews in is</p>
                <SegmentedControl
                  label="Getting our crews in is"
                  options={[
                    { value: "standard", label: "Straightforward", sub: "Lockbox or someone home" },
                    { value: "limited", label: "Limited windows", sub: "Showings, tenants" },
                    { value: "difficult", label: "Tricky", sub: "Restricted or coordinated" },
                  ]}
                  value={access}
                  onChange={setAccess}
                  columns={3}
                  testIdPrefix="re10-access"
                />
              </div>

              <div>
                <label htmlFor="re10-notes" className="mb-1.5 flex items-baseline justify-between text-[12.5px] text-inverse-muted">
                  <span>Anything else we should know</span>
                  <span className="text-inverse-muted/70">Optional</span>
                </label>
                <textarea
                  id="re10-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-inverse-foreground/25 bg-inverse-foreground/5 px-3 py-2.5 text-[16px] text-inverse-foreground focus:outline-none focus:ring-2 focus:ring-accent-legible"
                />
              </div>
            </div>

            <StickyStepNav
              onBack={() => goTo("contact")}
              onNext={submit}
              nextLabel="See my repair price"
              busy={busy}
              busyLabel="Building your price..."
              nextTestId="button-re10-submit"
            />
          </StepTransition>
        ) : null}

        {/* ------------------------------------------------------- 5. result */}
        {step === "result" && result ? (
          <StepTransition>
          <Re10Result
            result={result}
            documents={documents}
            onEditScope={() => goTo("review")}
            onUploadMore={() => {
              trackEvent(RE10_EVENTS.additionalDocuments, { from: "result" });
              goTo("upload");
            }}
            onRequestOnsite={() => trackEvent(RE10_EVENTS.onsiteRequested)}
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

function Re10Result({
  result,
  documents,
  onEditScope,
  onUploadMore,
  onRequestOnsite,
}: {
  result: EstimateResponse;
  documents: { filename: string; url: string }[];
  onEditScope: () => void;
  onUploadMore: () => void;
  onRequestOnsite: () => void;
}) {
  const disclosure = result.disclosure;
  const assumptions = disclosure?.assumptions?.length ? disclosure.assumptions : result.assumptions;
  const contextLine = [
    result.propertyAddress,
    result.repairDeadline ? `repairs due ${result.repairDeadline}` : null,
    result.closingDate ? `closing ${result.closingDate}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const confidenceLabel =
    result.confidence === "high" ? "High confidence" : result.confidence === "medium" ? "Medium confidence" : "Preliminary";

  return (
    <div data-testid="re10-result" className="space-y-4">
      {/* Overview */}
      <ResultCard testId="re10-overview">
        <PriceHeadline
          label="Price for the repairs below"
          price={usd(result.price)}
          category="RE-10 repair estimate"
          statusChips={[
            { label: confidenceLabel, tone: "muted" },
            { label: `Held ${result.validDays} days`, tone: "accent" },
          ]}
        />
        {contextLine ? <p className="mt-3 text-[13px] text-inverse-muted">{contextLine}</p> : null}
        {result.emailed ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-inverse-foreground/85">
            <Mail className="h-4 w-4 text-accent-legible" aria-hidden="true" />
            A copy is on its way to your inbox.
          </p>
        ) : null}
      </ResultCard>

      {/* Pricing notes */}
      <ResultCard title="How to read this price" icon={ShieldCheck}>
        <p className="text-[13px] leading-relaxed text-inverse-muted">{RE10_PRICING_DISCLAIMER}</p>
        {result.uncertainty.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[12.5px] text-inverse-foreground/90">What would firm this up</p>
            <DetailList items={result.uncertainty} />
          </div>
        ) : null}
      </ResultCard>

      {/* What this covers, ordered as the document reads */}
      <ResultCard title="What this price covers" icon={Wrench} testId="re10-covers">
        <ul className="space-y-3">
          {result.categories.map((c) => (
            <li key={c.trade} className="rounded-md bg-inverse-foreground/[0.05] p-3.5">
              <p className="mb-1.5 text-[14px] text-inverse-foreground">
                {c.label} <span className="text-inverse-muted">({c.itemCount} {c.itemCount === 1 ? "item" : "items"})</span>
              </p>
              <ul className="space-y-1">
                {c.items.map((i, n) => (
                  <li key={n} className="text-[12.5px] leading-relaxed text-inverse-muted">
                    {i.description}
                    {i.location ? ` (${i.location})` : ""}
                    {i.quantityAssumed && i.quantity ? ` - priced for ${i.quantity} ${i.unit ?? ""}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </ResultCard>

      {/* Needs onsite */}
      {result.needsOnsite.length > 0 ? (
        <ResultCard title="Priced after an onsite look" icon={AlertTriangle} testId="re10-onsite">
          <p className="mb-3 text-[12.5px] leading-relaxed text-inverse-muted">
            These are in your document but not in the number above. We price them after seeing them.
          </p>
          <ul className="space-y-2.5">
            {result.needsOnsite.map((n, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed text-inverse-muted">
                <span className="text-inverse-foreground/90">{n.description}</span> - {n.why}
              </li>
            ))}
          </ul>
        </ResultCard>
      ) : null}

      {/* Assumptions */}
      {assumptions.length > 0 ? (
        <ResultDisclosure title="Assumptions we made" count={assumptions.length} testId="re10-assumptions">
          <DetailList items={assumptions} />
        </ResultDisclosure>
      ) : null}

      {/* Exclusions */}
      {disclosure && disclosure.excluded.length > 0 ? (
        <ResultDisclosure title="Not included" count={disclosure.excluded.length} testId="re10-exclusions">
          <DetailList
            marker="cross"
            items={disclosure.excluded.map((e) => (
              <span key={e.label}>
                <span className="text-inverse-foreground/90">{e.label}</span>
                {e.detail ? ` - ${e.detail}` : ""}
              </span>
            ))}
          />
        </ResultDisclosure>
      ) : null}

      {/* Allowances */}
      {disclosure && disclosure.allowances.length > 0 ? (
        <ResultDisclosure title="Standard allowances" count={disclosure.allowances.length} testId="re10-allowances">
          <DetailList
            items={disclosure.allowances.map((a) => (
              <span key={a.label}>
                <span className="text-inverse-foreground/90">{a.label}</span>
                {a.detail ? ` - ${a.detail}` : ""}
              </span>
            ))}
          />
        </ResultDisclosure>
      ) : null}

      {/* Needs attention: named, and NOT in the price. Computed since the
          disclosure was written and rendered nowhere until now - which is
          exactly the silent-vanish this codebase keeps having to close. */}
      {disclosure && disclosure.needsAttention.length > 0 ? (
        <ResultDisclosure
          title="In your document, not in this price"
          count={disclosure.needsAttention.length}
          testId="re10-needs-attention"
        >
          <DetailList
            marker="cross"
            items={disclosure.needsAttention.map((n) => (
              <span key={n.label}>
                <span className="text-inverse-foreground/90">{n.label}</span>
                {n.detail ? ` - ${n.detail}` : ""}
              </span>
            ))}
          />
        </ResultDisclosure>
      ) : null}

      {/* What we could not read. On a scan this is the single most useful
          thing on the screen, and it was reaching the admin email only. */}
      {disclosure && disclosure.missing.length > 0 ? (
        <ResultDisclosure
          title="What we could not read"
          count={disclosure.missing.length}
          testId="re10-missing"
        >
          <DetailList
            items={disclosure.missing.map((m, i) => (
              <span key={`${m.what}-${i}`}>
                <span className="text-inverse-foreground/90">{m.what}</span>
                {m.effect ? ` - ${m.effect}` : ""}
                {m.remedy ? ` ${m.remedy}` : ""}
              </span>
            ))}
          />
        </ResultDisclosure>
      ) : null}

      {/* Warnings about the read itself. */}
      {disclosure && disclosure.warnings.length > 0 ? (
        <ResultDisclosure title="Worth knowing" count={disclosure.warnings.length} testId="re10-warnings">
          <DetailList items={disclosure.warnings} />
        </ResultDisclosure>
      ) : null}

      {/* What could change the price */}
      {disclosure && disclosure.factors.length > 0 ? (
        <ResultDisclosure title="What could change the price" count={disclosure.factors.length} testId="re10-factors">
          <DetailList items={disclosure.factors} />
        </ResultDisclosure>
      ) : null}

      {/* Uploaded documents */}
      {documents.length > 0 ? (
        <ResultCard title="Documents you sent" icon={FileText} testId="re10-documents">
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
        primaryLabel="Request an onsite evaluation"
        onPrimary={() => {
          onRequestOnsite();
          window.location.href = "/contact#consult";
        }}
        onEditScope={onEditScope}
        primaryTestId="link-re10-onsite"
        secondary={[
          { label: "Print", icon: Printer, onClick: () => window.print(), testId: "re10-print" },
          { label: "Upload more documents", icon: RefreshCw, onClick: onUploadMore, testId: "re10-upload-more" },
        ]}
      />
    </div>
  );
}
