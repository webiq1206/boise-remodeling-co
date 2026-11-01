"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { AttachmentTile } from "@/components/approved/AttachmentTile";
import { RequestDetailsPanel } from "@/components/approved/RequestDetailsPanel";
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
import {
  saveRequestDetails,
  uploadRequestFile,
  uploadRequestFiles,
  type FileUpload,
  type RequestFollowUp,
} from "@/lib/requestFollowUp";
import { CTA_FORM_MICROCOPY } from "@/shared/ctaCopy";
import { SHORT_REQUEST_PROJECT_TYPE } from "@/shared/requestDetails";
import { SITE_CONFIG, TEXT_REPLY_HOURS } from "@/shared/siteConfig";

/** Filed under this project type, as the short request always has been (GA4 generate_lead, CRM). */
const PROJECT_TYPE = SHORT_REQUEST_PROJECT_TYPE;

type Mode = "request" | "callback";
type Reach = "call" | "text" | "email";
type Field = "note" | "name" | "phone" | "email";
type Errors = Partial<Record<Field, string>>;

const REACH_OPTIONS: { value: Reach; label: string }[] = [
  { value: "call", label: "Call me" },
  { value: "text", label: "Text me" },
  { value: "email", label: "Email me" },
];
const BEST_TIMES = ["Any time", "Morning", "Midday", "Afternoon"];
/** Step 1 order: the easy, interesting question first, contact details second. */
const FIELD_ORDER: Field[] = ["note", "name", "phone", "email"];

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
 * Owner request, 1 November 2026: the easiest form there is. What they need first, then an
 * optional attachment tile, name, phone, optional email and how to reach them, one send. "Have us
 * call you" reduces it to name and phone (plus an optional best time) and posts through the same
 * /api/consultation pipeline, marked as a callback request. Call and text stay beside the send.
 *
 * Quote form v2 (owner, 1 November 2026: "the more information we have, the better"): two steps.
 * Step 1 above captures the lead and nothing else waits on it. Files upload one by one AFTER the
 * lead is saved, and step 2 ("Help us prepare", on the success screen) adds details to the SAME
 * lead through the request id and short-lived token step 1 returned.
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
  // Text by default: this site has a text line (TextReplyLine) and the backend accepts "text".
  const [reach, setReach] = useState<Reach>("text");
  const [bestTime, setBestTime] = useState(BEST_TIMES[0]);
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitTried, setSubmitTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<{
    firstName: string;
    mode: Mode;
    phone: string;
    emailed: boolean;
    hadEmail: boolean;
    followUp: RequestFollowUp | null;
  } | null>(null);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [attachNote, setAttachNote] = useState("");
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
    return errors;
  }

  const errors = validate();
  const shown = (field: Field) => ((submitTried || touched[field]) && errors[field]) || "";
  const touch = (field: Field) => () => setTouched((current) => ({ ...current, [field]: true }));
  const engaged = Boolean(name || phone || note || email || files.length);

  async function attach(followUp: RequestFollowUp, done: FileUpload[]) {
    const keys = done.flatMap((upload) => (upload.status === "stored" ? [upload.key] : []));
    if (!keys.length) return;
    const saved = await saveRequestDetails(followUp, {}, keys);
    if (!saved.ok) {
      setUploads((current) =>
        current.map((upload) =>
          upload.status === "stored" && keys.includes(upload.key)
            ? { file: upload.file, status: "failed", message: "We could not add it to your request." }
            : upload,
        ),
      );
    }
  }

  async function sendFiles(followUp: RequestFollowUp, list: File[]) {
    const done = await uploadRequestFiles(followUp, list, setUploads);
    await attach(followUp, done);
  }

  async function retryFile(index: number) {
    const followUp = done?.followUp;
    const target = uploads[index];
    if (!followUp || !target) return;
    setUploads((current) => current.map((upload, at) => (at === index ? { file: upload.file, status: "uploading" } : upload)));
    const result = await uploadRequestFile(followUp, target.file);
    setUploads((current) => current.map((upload, at) => (at === index ? result : upload)));
    await attach(followUp, [result]);
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
      }
      // Names only: the files themselves upload after the lead is saved. Files picked before
      // switching to "Have us call you" still go, so nothing chosen silently vanishes.
      if (files.length) body.set("pendingFiles", JSON.stringify(files.map((file) => file.name.slice(0, 120))));
      if (hasPassedGate()) body.set("skipEmail", "1");
      const attribution = captureMarketingAttribution();
      if (attribution) body.set("attribution", JSON.stringify(attribution));
      const res = await fetch("/api/consultation", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | (AcceptedInquiryResponse & { message?: string; requestId?: string; detailsToken?: string })
        | null;
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
      const followUp =
        data.requestId && data.detailsToken ? { requestId: data.requestId, token: data.detailsToken } : null;
      const toUpload = files;
      setDone({
        firstName: name.trim().split(/\s+/)[0] || name.trim(),
        mode,
        phone: phone.trim(),
        // The copy goes out with the internal email; say so only when delivery went through.
        emailed: !callback && Boolean(email.trim()) && data.delivery !== "pending_retry",
        hadEmail: !callback && Boolean(email.trim()),
        followUp,
      });
      // The lead is saved. Files go now, one at a time; a failure costs only that file.
      if (toUpload.length && followUp) void sendFiles(followUp, toUpload);
      else if (toUpload.length) setAttachNote("Your files were not sent from here.");
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
        <div className="fold-done" data-testid="consultation-success" data-clarity-mask="True">
          <div role="status">
            <h2 ref={successRef} tabIndex={-1} className="fold-form-title" data-clarity-mask="True">
              Thanks, {done.firstName}. We have your request.
            </h2>
            <p className="fold-success">
              {done.mode === "callback"
                ? `We will call you at ${done.phone} within one business day.`
                : "We reply within one business day with questions or a time to visit. You get a written scope before any price."}
            </p>
          </div>
          {done.emailed && <p className="fold-next">A copy of your request is on its way to your inbox.</p>}
          <p className="fold-next">
            Need us sooner? <a className="fold-inline-link" href={SITE_CONFIG.phoneHref}>Call {SITE_CONFIG.phone}</a>
          </p>
          <TextReplyLine className="fold-text-reply" />

          {uploads.length > 0 && (
            <div className="fold-uploads" data-testid="request-uploads" aria-live="polite">
              <p className="fold-details-title">
                {uploads.some((upload) => upload.status === "uploading")
                  ? `Adding your files (${uploads.filter((upload) => upload.status !== "uploading").length} of ${uploads.length})`
                  : uploads.every((upload) => upload.status === "stored")
                    ? `${uploads.length === 1 ? "Your file is" : `All ${uploads.length} files are`} on your request.`
                    : "Some files did not upload."}
              </p>
              <ul className="fold-upload-list">
                {uploads.map((upload, index) => (
                  <li key={`${upload.file.name}-${index}`} data-status={upload.status}>
                    <span className="fold-chip-name" data-clarity-mask="True">
                      {upload.file.name}
                    </span>
                    <span className="fold-upload-state">
                      {upload.status === "uploading" ? "Uploading" : upload.status === "stored" ? "Added" : "Did not upload"}
                    </span>
                    {upload.status === "failed" && (
                      <span className="fold-upload-fail">
                        {upload.message}{" "}
                        <button type="button" className="fold-secondary" onClick={() => void retryFile(index)}>
                          Try again<span className="sr-only"> {upload.file.name}</span>
                        </button>{" "}
                        or{" "}
                        <a className="fold-inline-link" href={SITE_CONFIG.phoneSmsHref}>
                          text it to us
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {attachNote && (
            <p className="fold-field-error" role="status">
              {attachNote}{" "}
              <a className="fold-inline-link" href={SITE_CONFIG.phoneSmsHref}>
                Text them to {SITE_CONFIG.phone}
              </a>
              .
            </p>
          )}

          {done.followUp && <RequestDetailsPanel followUp={done.followUp} askEmail={!done.hadEmail} />}
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
            {callback ? "Request a call" : "Request a quote"}
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
                data-testid="request-mode-request"
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

          {!callback && (
            <>
              <div className="fold-field">
                <label htmlFor={ids("note")}>What can we help with?</label>
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
                  placeholder="For example: new kitchen cabinets and counters, or a tub turned into a walk-in shower"
                  aria-required="true"
                  aria-invalid={shown("note") ? true : undefined}
                  aria-describedby={describedBy("note")}
                  maxLength={1000}
                />
                {fieldError("note")}
              </div>

              <AttachmentTile files={files} onChange={setFiles} />
            </>
          )}

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
                data-testid="select-best-time"
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
                We call during business hours ({TEXT_REPLY_HOURS}). You can add photos or details after you send.
              </p>
            </div>
          ) : (
            <>
              <div className="fold-field">
                <label htmlFor={ids("email")}>Email (optional)</label>
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
                  For a written copy of your request.
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
                        data-testid={`contact-preference-${option.value}`}
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
              <button className="fold-submit" type="submit" disabled={busy} data-testid="button-send-request">
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
