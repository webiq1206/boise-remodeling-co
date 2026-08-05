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
import {
  classifyUpload,
  MAX_UPLOAD_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  READABLE_FORMATS_LABEL,
} from "@/shared/re10/uploads";
import { RE10_EVENTS } from "@/shared/re10/analyticsEvents";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import {
  ChoiceGrid,
  DetailList,
  OptionCard,
  PriceHeadline,
  ResultCard,
  ResultDisclosure,
  ReviewSection,
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

export function Re10Wizard() {
  const [step, setStep] = useState<Step>("upload");
  const topRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
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
  const [notes, setNotes] = useState("");

  const [result, setResult] = useState<EstimateResponse | null>(null);

  useEffect(() => {
    trackEvent(RE10_EVENTS.started);
  }, []);

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
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/re10/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "We could not read those documents.");
        trackEvent(RE10_EVENTS.analysisFailed, { reason: String(data.error ?? res.status) });
        return;
      }
      const extracted = data as ExtractionResult;
      setExtraction(extracted);
      setDocuments(Array.isArray(data.stored) ? data.stored : []);
      setAttachedOnly(Array.isArray(data.attachedOnly) ? data.attachedOnly : []);
      if (extracted.propertyAddress) setAddress((a) => a || extracted.propertyAddress!);
      if (extracted.closingDate) setClosingDate((d) => d || extracted.closingDate!);
      if (extracted.repairDeadline) setRepairDeadline((d) => d || extracted.repairDeadline!);
      trackEvent(RE10_EVENTS.analysisCompleted, {
        repairs_found: extracted.repairs.length,
        unmapped: extracted.unmapped.length,
      });
      setRepairs(extracted.repairs.map((r, i) => ({ ...r, id: `r${i}`, included: true })));

      if (extracted.repairs.length === 0) {
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
      setError("Something went wrong sending those files. Try again.");
      trackEvent(RE10_EVENTS.analysisFailed, { reason: "network" });
    } finally {
      setBusy(false);
    }
  }

  function validateReview(): boolean {
    if (repairs.filter((r) => r.included).length === 0) {
      setError("Keep at least one repair in the list to get a price.");
      return false;
    }
    return true;
  }

  function validateContact(): boolean {
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name so we know who to send this to.");
      return false;
    }
    if (preferredContact === "email" && !email.trim()) {
      setError("Add an email address, or change your preferred contact method below.");
      return false;
    }
    if (preferredContact !== "email" && !phone.trim()) {
      setError("Add a phone number, or change your preferred contact method below.");
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
      setError("We need your name.");
      goTo("contact");
      return;
    }
    if (!address.trim()) {
      setError("We need the property address.");
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
            quantity: r.quantity ?? null,
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

  const stepIndex = STEP_ORDER.indexOf(step);
  const includedCount = repairs.filter((r) => r.included).length;

  return (
    <Section id="re10-estimator" variant="inverse" divider>
      <div className="container mx-auto max-w-3xl scroll-mt-24 px-4" ref={topRef}>
        {step !== "result" ? (
          <WizardProgress steps={STEP_METAS} currentIndex={stepIndex} />
        ) : null}

        <WizardError message={error} />

        {/* ------------------------------------------------------- 1. upload */}
        {step === "upload" ? (
          <div>
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
            />
            <StickyStepNav
              onNext={analyze}
              nextLabel="Review my repair list"
              nextDisabled={files.length === 0}
              busy={busy}
              busyLabel="Reading your documents..."
              nextTestId="button-re10-analyze"
              hint="No contact details needed yet. You will see the repairs we found first."
            />
          </div>
        ) : null}

        {/* ------------------------------------------------------- 2. review */}
        {step === "review" && extraction ? (
          <div>
            <StepHeading
              title="Here is what we read. Is it right?"
              description="Remove anything that should not be included, and add a measurement where we did not find one. The more you correct here, the more exact your price."
            />

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
                        {r.quantity == null ? "Add a measurement" : "Measurement"}
                      </label>
                      <input
                        id={`qty-${r.id}`}
                        type="text"
                        inputMode="decimal"
                        value={r.quantity ?? ""}
                        placeholder={String(RECIPES[r.kind]?.defaultQty ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, "");
                          const n = raw === "" ? null : Number(raw);
                          setRepairs((prev) =>
                            prev.map((p) =>
                              p.id === r.id ? { ...p, quantity: n != null && Number.isFinite(n) ? n : null } : p,
                            ),
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
          </div>
        ) : null}

        {/* ------------------------------------------------------ 3. contact */}
        {step === "contact" ? (
          <div>
            <StepHeading
              title="Where should we send it?"
              description="Enter your contact information to view your RE-10 repair estimate and receive a copy by your preferred method."
            />
            <div className="space-y-4">
              <TextField label="Full name" required value={name} onChange={setName} autoComplete="name" testId="input-re10-name" />

              <div>
                <p className="mb-1.5 text-[12.5px] text-inverse-muted">Your role</p>
                <ChoiceGrid label="Your role" columns={2} multi>
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
                label="Email"
                required={preferredContact === "email"}
                optionalHint={preferredContact !== "email"}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                testId="input-re10-email"
              />
              <TextField
                label="Phone"
                required={preferredContact !== "email"}
                optionalHint={preferredContact === "email"}
                type="tel"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
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
          </div>
        ) : null}

        {/* ----------------------------------------------------- 4. property */}
        {step === "property" ? (
          <div>
            <StepHeading
              title="The property and your timeline"
              description="We prefill what the RE-10 already told us. Confirm the address and add the repair deadline so we can hold the right price."
            />
            <div className="space-y-4">
              <TextField label="Property address" required value={address} onChange={setAddress} autoComplete="street-address" testId="input-re10-address" />
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
          </div>
        ) : null}

        {/* ------------------------------------------------------- 5. result */}
        {step === "result" && result ? (
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
