"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { TextReplyLine } from "@/components/TextReplyLine";
import { useKeyboardInset } from "@/components/estimate/wizard/useKeyboardInset";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";
import { markEstimatorCompleted } from "@/lib/estimatorSession";
import {
  getOrCreateInquiryId,
  rotateInquiryId,
  trackAcceptedInquiry,
  type AcceptedInquiryResponse,
} from "@/lib/inquiryTracking";
import { captureMarketingAttribution } from "@/lib/marketingAttributionBrowser";
import { SITE_CONFIG } from "@/shared/siteConfig";

const STORAGE_KEY = "brc-estimate-request-v1";
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const STEPS = [
  { id: "project", label: "Project" },
  { id: "contact", label: "Contact" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const PROJECT_TYPES = [
  { id: "kitchen", title: "Kitchen", subtitle: "Full or partial remodel" },
  { id: "bathroom", title: "Bathroom", subtitle: "Primary or hall bath" },
  { id: "whole-home", title: "Whole home", subtitle: "Several rooms together" },
  { id: "other", title: "Other", subtitle: "Addition, outdoor, or repair list" },
] as const;

type ProjectTypeId = (typeof PROJECT_TYPES)[number]["id"];

type Draft = {
  step: number;
  projectType: ProjectTypeId | "";
  name: string;
  phone: string;
  email: string;
  note: string;
  website: string;
};

const EMPTY_DRAFT: Draft = {
  step: 0,
  projectType: "",
  name: "",
  phone: "",
  email: "",
  note: "",
  website: "",
};

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function projectLabel(id: ProjectTypeId | ""): string {
  return PROJECT_TYPES.find((item) => item.id === id)?.title ?? "";
}

function readDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      step: typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), STEPS.length - 1) : 0,
      website: "",
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(draft: Draft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, website: "" }));
  } catch {
    /* private mode */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function EstimateRequestWizard() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const progressId = useId();
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || done) return;
    writeDraft(draft);
  }, [draft, hydrated, done]);

  useEffect(() => {
    const release = requestHideMobileNavBar();
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.dataset.estimateWizard = "true";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      delete body.dataset.estimateWizard;
      release();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [draft.step, done, hydrated]);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input:not(.estimate-honeypot), textarea")) {
        document.body.dataset.estimateKeyboard = "true";
      }
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active?.matches("input:not(.estimate-honeypot), textarea")) {
          delete document.body.dataset.estimateKeyboard;
        }
      }, 0);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      delete document.body.dataset.estimateKeyboard;
    };
  }, []);

  const step = STEPS[draft.step] as (typeof STEPS)[number];
  const progressPct = Math.round(((draft.step + 1) / STEPS.length) * 100);

  const patch = useCallback((partial: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...partial }));
    setError("");
  }, []);

  const canNext = useMemo(() => {
    if (draft.step === 0) return Boolean(draft.projectType);
    if (draft.step === 1) {
      return draft.name.trim().length >= 2 && digits(draft.phone).length >= 10 && draft.email.includes("@");
    }
    if (draft.step === 2) return draft.note.trim().length >= 8;
    return true;
  }, [draft]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (next.some((existing) => existing.name === file.name && existing.size === file.size)) continue;
      if (file.size > MAX_FILE_BYTES) {
        setError("Each photo or plan must be 8 MB or smaller.");
        return;
      }
      next.push(file);
    }
    setFiles(next);
    setError("");
  }

  function goBack() {
    if (draft.step <= 0) return;
    patch({ step: draft.step - 1 });
  }

  function goNext() {
    if (!canNext) {
      if (draft.step === 0) setError("Choose a project type to continue.");
      else if (draft.step === 1) setError("Enter your name, phone, and email.");
      else if (draft.step === 2) setError("Add a short note about the work (at least a sentence).");
      return;
    }
    if (draft.step < STEPS.length - 1) {
      patch({ step: draft.step + 1 });
      return;
    }
    void submit();
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("inquiryId", getOrCreateInquiryId());
      body.set("formStartedAt", String(startedAt));
      body.set("website", draft.website);
      body.set("name", draft.name.trim());
      body.set("phone", draft.phone.trim());
      body.set("email", draft.email.trim());
      const message = [
        `Project type: ${projectLabel(draft.projectType)}`,
        draft.note.trim(),
      ].join("\n\n");
      body.set("message", message);
      const attribution = captureMarketingAttribution();
      if (attribution) body.set("attribution", JSON.stringify(attribution));
      for (const file of files) body.append("files", file);
      const res = await fetch("/api/consultation", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | (AcceptedInquiryResponse & { message?: string })
        | null;
      if (!res.ok || !data?.accepted) {
        setError(data?.message || "We could not send that request. Try again, or call us.");
        setBusy(false);
        return;
      }
      trackAcceptedInquiry(data, projectLabel(draft.projectType) || "Remodel");
      markEstimatorCompleted("consultation");
      rotateInquiryId();
      clearDraft();
      setDone(true);
    } catch {
      setError("We could not send that request. Try again, or call us.");
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    if (target.tagName === "BUTTON") return;
    if (done || busy) return;
    event.preventDefault();
    goNext();
  }

  const summaryChip = [
    projectLabel(draft.projectType),
    draft.name.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="estimate-wizard"
      data-testid="estimate-request-wizard"
      data-keyboard-inset={keyboardInset > 0 ? String(keyboardInset) : undefined}
      style={
        {
          ["--ew-keyboard-inset"]: `${keyboardInset}px`,
        } as CSSProperties
      }
      onKeyDown={onKeyDown}
    >
      <header className="estimate-wizard-header">
        <p className="estimate-wizard-eyebrow">SHORT REQUEST</p>
        <h1 className="estimate-wizard-title">Request a remodel quote</h1>
        {!done && (
          <>
            <div
              className="estimate-wizard-progress"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={draft.step + 1}
              aria-labelledby={progressId}
            >
              <span id={progressId} className="estimate-wizard-progress-label">
                Step {draft.step + 1} of {STEPS.length}: {step.label}
              </span>
              <span className="estimate-wizard-progress-rail" aria-hidden="true">
                <span style={{ width: `${progressPct}%` }} />
              </span>
            </div>
            {summaryChip ? (
              <p className="estimate-wizard-summary-chip" aria-live="polite">
                {summaryChip}
              </p>
            ) : null}
          </>
        )}
      </header>

      <div className="estimate-wizard-body">
        {done ? (
          <div className="estimate-wizard-step" role="status">
            <h2 ref={headingRef} tabIndex={-1} className="estimate-wizard-step-title">
              Request received
            </h2>
            <p className="estimate-wizard-step-copy">
              We reply within one business day with questions or a time to visit. You get a written
              scope before any price.
            </p>
            <TextReplyLine className="estimate-wizard-text-reply" />
            <p className="estimate-wizard-step-copy">
              Prefer to talk now?{" "}
              <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
              . Planning ranges stay in the{" "}
              <Link href="/guides/boise-remodeling-cost-guide">cost guide</Link>.
            </p>
          </div>
        ) : (
          <div className="estimate-wizard-step" key={step.id} data-step={step.id as StepId}>
            {draft.step === 0 && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className="estimate-wizard-step-title">
                  What are you remodeling?
                </h2>
                <p className="estimate-wizard-step-copy">Pick the closest match. You can refine the details next.</p>
                <div className="estimate-choice-grid" role="radiogroup" aria-label="Project type">
                  {PROJECT_TYPES.map((option) => {
                    const selected = draft.projectType === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`estimate-choice-card${selected ? " is-selected" : ""}`}
                        onClick={() => patch({ projectType: option.id })}
                      >
                        <span className="estimate-choice-card-title">{option.title}</span>
                        <span className="estimate-choice-card-sub">{option.subtitle}</span>
                        <span className="estimate-choice-card-check" aria-hidden="true">
                          {selected ? <Check size={14} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {draft.step === 1 && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className="estimate-wizard-step-title">
                  How can we reach you?
                </h2>
                <p className="estimate-wizard-step-copy">
                  We reply within one business day. No obligation.
                </p>
                <div className="estimate-field-stack">
                  <label>
                    <span>Name</span>
                    <input
                      data-clarity-mask="True"
                      name="name"
                      autoComplete="name"
                      value={draft.name}
                      onChange={(event) => patch({ name: event.target.value })}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input
                      data-clarity-mask="True"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={draft.phone}
                      onChange={(event) => patch({ phone: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      data-clarity-mask="True"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={draft.email}
                      onChange={(event) => patch({ email: event.target.value })}
                      required
                    />
                  </label>
                </div>
              </>
            )}

            {draft.step === 2 && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className="estimate-wizard-step-title">
                  What should we look at?
                </h2>
                <p className="estimate-wizard-step-copy">
                  City, room, and what you want changed. Photos help but are optional.
                </p>
                <div className="estimate-field-stack">
                  <label>
                    <span>Project note</span>
                    <textarea
                      data-clarity-mask="True"
                      name="message"
                      rows={3}
                      value={draft.note}
                      onChange={(event) => patch({ note: event.target.value })}
                      placeholder="Kitchen in Meridian, keep layout, new cabinets and counters"
                      required
                      maxLength={1000}
                    />
                  </label>
                  <label className="estimate-file">
                    <span>Photos or plans, optional</span>
                    <input
                      data-clarity-mask="True"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif"
                      multiple
                      onChange={(event) => {
                        addFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {files.length > 0 && (
                    <ul className="estimate-files">
                      {files.map((file) => (
                        <li key={`${file.name}-${file.size}`}>
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="estimate-file-note">JPEG, PNG, WebP, HEIC, or PDF. Up to 4 files, 8 MB each.</p>
                </div>
              </>
            )}

            {draft.step === 3 && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className="estimate-wizard-step-title">
                  Review your request
                </h2>
                <p className="estimate-wizard-step-copy">
                  Confirm the details, then send. Free to request. We reply within one business day.
                </p>
                <dl className="estimate-review">
                  <div>
                    <dt>Project</dt>
                    <dd>
                      {projectLabel(draft.projectType)}
                      <button type="button" className="estimate-edit" onClick={() => patch({ step: 0 })}>
                        Edit
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {draft.name.trim()}
                      <br />
                      {draft.phone.trim()}
                      <br />
                      {draft.email.trim()}
                      <button type="button" className="estimate-edit" onClick={() => patch({ step: 1 })}>
                        Edit
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Details</dt>
                    <dd>
                      {draft.note.trim()}
                      {files.length > 0 ? (
                        <>
                          <br />
                          {files.length} file{files.length === 1 ? "" : "s"} attached
                        </>
                      ) : null}
                      <button type="button" className="estimate-edit" onClick={() => patch({ step: 2 })}>
                        Edit
                      </button>
                    </dd>
                  </div>
                </dl>
              </>
            )}

            <input
              data-clarity-mask="True"
              className="estimate-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={draft.website}
              onChange={(event) => patch({ website: event.target.value })}
            />
          </div>
        )}

        {error ? (
          <p className="estimate-wizard-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {!done && (
        <footer className="estimate-wizard-bar">
          <p className="estimate-wizard-reassure">
            Free to request. Written scope before any price.
          </p>
          <div className="estimate-wizard-bar-actions">
            {draft.step > 0 ? (
              <button type="button" className="estimate-wizard-back" onClick={goBack} disabled={busy}>
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>
            ) : (
              <span className="estimate-wizard-back-spacer" aria-hidden="true" />
            )}
            <button
              type="button"
              className="estimate-wizard-next"
              onClick={goNext}
              disabled={busy || !canNext}
              data-testid="estimate-wizard-next"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="estimate-spin" aria-hidden="true" />
                  Sending
                </>
              ) : draft.step === STEPS.length - 1 ? (
                <>
                  Send request
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
