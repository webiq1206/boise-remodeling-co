"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { EstimatorRecovery } from "@/components/estimate/recovery/EstimatorRecovery";
import { TextReplyLine } from "@/components/TextReplyLine";
import { markEstimatorCompleted } from "@/lib/estimatorSession";
import {
  getOrCreateInquiryId,
  rotateInquiryId,
  trackAcceptedInquiry,
  type AcceptedInquiryResponse,
} from "@/lib/inquiryTracking";
import { hasPassedGate, PREFILL_UPDATED_EVENT, readStoredPrefill } from "@/lib/leadPrefill";
import { captureMarketingAttribution } from "@/lib/marketingAttributionBrowser";
import { CTA_FORM_MICROCOPY } from "@/shared/ctaCopy";
import { SITE_CONFIG, TEXT_REPLY_HOURS } from "@/shared/siteConfig";

const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** Filed under this project type, as the short request always has been (GA4, CRM, p5 intake). */
const PROJECT_TYPE = "Home repair or remodel";

type Mode = "request" | "callback";
type Reach = "call" | "text" | "email";
type Field = "name" | "phone" | "note" | "email" | "files";
type Errors = Partial<Record<Field, string>>;

const REACH_OPTIONS: { value: Reach; label: string }[] = [
  { value: "call", label: "Call me" },
  { value: "text", label: "Text me" },
  { value: "email", label: "Email me" },
];
const BEST_TIMES = ["Any time", "Morning", "Midday", "Afternoon"];
const FIELD_ORDER: Field[] = ["name", "phone", "note", "files", "email"];

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * The short request: the one form every "Request a quote" lands on (homepage #request-form,
 * and the contact page through ConsultationForm variant="short").
 *
 * Owner request, 1 November 2026: the easiest form there is. Name, phone and what they need,
 * photos and email optional, how to reach them, one send. "Have us call you" reduces it to name
 * and phone (plus an optional best time) and posts through the same /api/consultation pipeline,
 * marked as a callback request. Call and text stay beside the send button.
 *
 * Native elements only (no Radix primitives), so nothing here sets state during hydration.
 */
export function HeroConversion({
  blockId = "request-form",
  recovery = false,
}: {
  /** Id of the form block. The homepage keeps "request-form" (scripts/verify-p5-mobile-seo.mjs). */
  blockId?: string;
  /** Report progress like the consultation form does (contact page). */
  recovery?: boolean;
} = {}) {
  const uid = useId();
  const ids = (name: string) => `${uid}-${name}`;
  const [startedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<Mode>("request");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [reach, setReach] = useState<Reach>("call");
  const [bestTime, setBestTime] = useState(BEST_TIMES[0]);
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitTried, setSubmitTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<{ firstName: string; mode: Mode; phone: string; emailed: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const callback = mode === "callback";

  // A Meta lead-form click or an earlier form on this visit may already know who this is.
  useEffect(() => {
    const apply = () => {
      const prefill = readStoredPrefill();
      if (prefill.name) setName((value) => value || prefill.name || "");
      if (prefill.phone) setPhone((value) => value || prefill.phone || "");
      if (prefill.email) setEmail((value) => value || prefill.email || "");
    };
    apply();
    try {
      const context = sessionStorage.getItem("brc_consult_context");
      if (context) setNote((value) => value || context.slice(0, 1000));
    } catch {
      /* storage unavailable: nothing to prefill */
    }
    window.addEventListener(PREFILL_UPDATED_EVENT, apply);
    return () => window.removeEventListener(PREFILL_UPDATED_EVENT, apply);
  }, []);

  useEffect(() => {
    if (done) successRef.current?.focus({ preventScroll: true });
  }, [done]);

  function validate(): Errors {
    const errors: Errors = {};
    if (name.trim().length < 2) errors.name = "Enter your name.";
    const phoneDigits = digits(phone).length;
    if (phoneDigits < 10 || phoneDigits > 15) errors.phone = "Enter a phone number with the area code.";
    if (callback) return errors;
    if (note.trim().length < 8) errors.note = "Tell us in a few words what we should look at.";
    const cleanEmail = email.trim();
    if (cleanEmail && !validEmail(cleanEmail)) errors.email = "Check the email address.";
    else if (!cleanEmail && reach === "email") errors.email = "Add your email so we can email you back.";
    if (files.length > MAX_FILES) errors.files = "You can add up to 4 photos or plans.";
    else if (files.some((file) => file.size > MAX_FILE_BYTES)) errors.files = "Each photo or plan must be 8 MB or smaller.";
    return errors;
  }

  const errors = validate();
  const shown = (field: Field) => ((submitTried || touched[field]) && errors[field]) || "";
  const touch = (field: Field) => () => setTouched((current) => ({ ...current, [field]: true }));
  const engaged = Boolean(name || phone || note || email || files.length);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (next.some((existing) => existing.name === file.name && existing.size === file.size)) continue;
      next.push(file);
    }
    setFiles(next);
    setTouched((current) => ({ ...current, files: true }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSubmitTried(true);
    setServerError("");
    const found = validate();
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("inquiryId", getOrCreateInquiryId());
      body.set("formStartedAt", String(startedAt));
      body.set("website", website);
      body.set("name", name.trim());
      body.set("phone", phone.trim());
      if (callback) {
        body.set("callback", "1");
        body.set("contactPreference", "call");
        body.set("bestTime", bestTime);
      } else {
        body.set("email", email.trim());
        body.set("message", note.trim());
        body.set("contactPreference", reach);
        for (const file of files) body.append("files", file);
      }
      if (hasPassedGate()) body.set("skipEmail", "1");
      const attribution = captureMarketingAttribution();
      if (attribution) body.set("attribution", JSON.stringify(attribution));
      const res = await fetch("/api/consultation", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as (AcceptedInquiryResponse & { message?: string }) | null;
      if (!res.ok || !data?.accepted) {
        setServerError(data?.message || "We could not send that. Try again, or call us.");
        setBusy(false);
        return;
      }
      trackAcceptedInquiry(data, PROJECT_TYPE);
      markEstimatorCompleted("consultation");
      rotateInquiryId();
      try {
        sessionStorage.removeItem("brc_consult_context");
      } catch {
        /* storage unavailable */
      }
      setDone({
        firstName: name.trim().split(/\s+/)[0] || name.trim(),
        mode,
        phone: phone.trim(),
        // The copy goes out with the internal email; say so only when delivery went through.
        emailed: !callback && Boolean(email.trim()) && data.delivery !== "pending_retry",
      });
    } catch {
      setServerError("We could not send that. Try again, or call us.");
      setBusy(false);
    }
  }

  const describedBy = (field: Field, hint?: string) =>
    [hint, shown(field) ? ids(`${field}-error`) : ""].filter(Boolean).join(" ") || undefined;
  const fieldError = (field: Field) => (
    <p id={ids(`${field}-error`)} className="fold-field-error" aria-live="polite">
      {shown(field)}
    </p>
  );

  const talk = (
    <div className="fold-talk">
      <p className="fold-talk-title">Prefer to talk?</p>
      <div className="fold-talk-actions">
        <a className="fold-call" href={SITE_CONFIG.phoneHref}>
          <Phone size={18} aria-hidden="true" />
          Call {SITE_CONFIG.phone}
        </a>
        <a className="fold-text" href={SITE_CONFIG.phoneSmsHref}>
          Text us
        </a>
        <button
          type="button"
          className="fold-chat"
          onClick={() => window.dispatchEvent(new Event("p5:assistant-open"))}
        >
          <MessageSquare size={18} aria-hidden="true" />
          Chat
        </button>
      </div>
    </div>
  );

  return (
    <div className="fold-convert" id={blockId}>
      {recovery && (
        <EstimatorRecovery
          flow="consultation"
          currentStep={engaged ? "filling" : "form"}
          currentStepIndex={engaged ? 1 : 0}
          totalSteps={2}
          lastCompletedStep={engaged ? "form" : undefined}
          selections={{ project_type: callback ? "Callback request" : PROJECT_TYPE }}
          validationErrors={Object.keys(submitTried ? errors : {})}
          engaged={engaged}
          submitted={Boolean(done)}
        />
      )}
      {done ? (
        <div className="fold-done" role="status" data-testid="consultation-success">
          <h2 ref={successRef} tabIndex={-1} className="fold-form-title" data-clarity-mask="True">
            Thanks, {done.firstName}. We have your request.
          </h2>
          <p className="fold-success">
            {done.mode === "callback"
              ? `We will call you at ${done.phone} within one business day.`
              : "We reply within one business day with questions or a time to visit. You get a written scope before any price."}
          </p>
          {done.emailed && <p className="fold-next">A copy of your request is on its way to your inbox.</p>}
          <p className="fold-next">
            Need us sooner? <a className="fold-inline-link" href={SITE_CONFIG.phoneHref}>Call {SITE_CONFIG.phone}</a>
          </p>
          <TextReplyLine className="fold-text-reply" />
        </div>
      ) : (
        <form
          ref={formRef}
          className="fold-form"
          data-clarity-mask="True"
          data-request-mode={mode}
          onSubmit={onSubmit}
          noValidate
          aria-labelledby={ids("title")}
        >
          <h2 className="fold-form-title" id={ids("title")}>
            Request a quote
          </h2>

          <fieldset className="fold-mode">
            <legend className="sr-only">How do you want to start?</legend>
            <label className="fold-pill">
              <input
                data-clarity-mask="True"
                type="radio"
                name="requestMode"
                value="request"
                checked={!callback}
                onChange={() => setMode("request")}
              />
              <span>Send a request</span>
            </label>
            <label className="fold-pill">
              <input
                data-clarity-mask="True"
                type="radio"
                name="requestMode"
                value="callback"
                checked={callback}
                onChange={() => setMode("callback")}
                data-testid="request-mode-callback"
              />
              <span>Have us call you</span>
            </label>
          </fieldset>

          <div className="fold-field">
            <label htmlFor={ids("name")}>Name</label>
            <input
              id={ids("name")}
              data-field="name"
              data-clarity-mask="True"
              data-testid="input-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={touch("name")}
              aria-required="true"
              aria-invalid={shown("name") ? true : undefined}
              aria-describedby={describedBy("name")}
              maxLength={100}
            />
            {fieldError("name")}
          </div>

          <div className="fold-field">
            <label htmlFor={ids("phone")}>Phone</label>
            <input
              id={ids("phone")}
              data-field="phone"
              data-clarity-mask="True"
              data-testid="input-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onBlur={touch("phone")}
              aria-required="true"
              aria-invalid={shown("phone") ? true : undefined}
              aria-describedby={describedBy("phone")}
              maxLength={30}
            />
            {fieldError("phone")}
          </div>

          {callback ? (
            <div className="fold-field">
              <label htmlFor={ids("best-time")}>Best time to call (optional)</label>
              <select
                id={ids("best-time")}
                data-clarity-mask="True"
                name="bestTime"
                value={bestTime}
                onChange={(event) => setBestTime(event.target.value)}
              >
                {BEST_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <p className="fold-hint">
                We call during business hours ({TEXT_REPLY_HOURS}).
              </p>
            </div>
          ) : (
            <>
              <div className="fold-field">
                <label htmlFor={ids("note")}>What should we look at?</label>
                <textarea
                  id={ids("note")}
                  data-field="note"
                  data-clarity-mask="True"
                  data-testid="textarea-message"
                  name="message"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onBlur={touch("note")}
                  placeholder="A kitchen, a bath, a whole floor, a list of repairs"
                  aria-required="true"
                  aria-invalid={shown("note") ? true : undefined}
                  aria-describedby={describedBy("note")}
                  maxLength={1000}
                />
                {fieldError("note")}
              </div>

              <div className="fold-field fold-file">
                <label htmlFor={ids("files")}>Add photos (optional)</label>
                <input
                  id={ids("files")}
                  data-field="files"
                  data-clarity-mask="True"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif"
                  multiple
                  aria-describedby={describedBy("files", ids("files-hint"))}
                  aria-invalid={shown("files") ? true : undefined}
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <p className="fold-hint" id={ids("files-hint")}>
                  Photos or plans: JPEG, PNG, WebP, HEIC or PDF. Up to 4 files, 8 MB each.
                </p>
                {files.length > 0 && (
                  <ul className="fold-files">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                        >
                          Remove<span className="sr-only"> {file.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {fieldError("files")}
              </div>

              <div className="fold-field">
                <label htmlFor={ids("email")}>Email</label>
                <input
                  id={ids("email")}
                  data-field="email"
                  data-clarity-mask="True"
                  data-testid="input-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={touch("email")}
                  aria-invalid={shown("email") ? true : undefined}
                  aria-describedby={describedBy("email", ids("email-hint"))}
                  maxLength={200}
                />
                <p className="fold-hint" id={ids("email-hint")}>
                  Optional. For a written copy of your request.
                </p>
                {fieldError("email")}
              </div>

              <fieldset className="fold-reach">
                <legend>How should we reach you?</legend>
                <div className="fold-pills">
                  {REACH_OPTIONS.map((option) => (
                    <label className="fold-pill" key={option.value}>
                      <input
                        data-clarity-mask="True"
                        type="radio"
                        name="contactPreference"
                        value={option.value}
                        checked={reach === option.value}
                        onChange={() => setReach(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <input
            data-clarity-mask="True"
            className="fold-honeypot"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />

          {serverError ? (
            <p className="fold-error" role="alert">
              {serverError}
            </p>
          ) : submitTried && Object.keys(errors).length > 0 ? (
            <p className="fold-error" role="alert">
              Check the {Object.keys(errors).length === 1 ? "field" : "fields"} marked above.
            </p>
          ) : null}
          <div className="fold-send">
            {talk}
            <div className="fold-send-main">
              <button className="fold-submit" type="submit" disabled={busy}>
                {busy ? "Sending" : callback ? "Request a call" : "Send request"}
              </button>
              <p className="fold-next">
                {callback ? "We call you back within one business day." : CTA_FORM_MICROCOPY}
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
