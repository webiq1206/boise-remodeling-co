"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { RequestDetailsPanel } from "@/components/approved/RequestDetailsPanel";
import { RequestSteps } from "@/components/approved/RequestSteps";
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
import type { RequestFollowUp } from "@/lib/requestFollowUp";
import { SHORT_REQUEST_PROJECT_TYPE } from "@/shared/requestDetails";
import { SITE_CONFIG, TEXT_REPLY_HOURS } from "@/shared/siteConfig";

/** Filed under this project type, as the short request always has been (GA4 generate_lead, CRM). */
const PROJECT_TYPE = SHORT_REQUEST_PROJECT_TYPE;

type Mode = "request" | "callback";
type Reach = "call" | "text" | "email";
type Field = "note" | "name" | "phone" | "email";
type Errors = Partial<Record<Field, string>>;

/** Text by default: this site has a text line (TextReplyLine) and the backend accepts "text". */
const DEFAULT_REACH: Reach = "text";
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
 * A planning range carried into the request (the consult dialog, components/modals/ConsultDialog).
 * Plain data: this form never imports the estimate engine, so the homepage bundle stays small.
 */
export interface AttachedEstimatePayload {
  project: string;
  [key: string]: unknown;
}

/**
 * The short request: the one form every "Request a quote" lands on (homepage #request-form, the
 * contact page through ConsultationForm variant="short", and the consult dialog).
 *
 * Owner request, 1 November 2026: the easiest form there is. Owner request, 11 November 2026,
 * after a client found a family form confusing because "it just kept asking more questions":
 * nothing optional is shown until asked for, and every step says plainly where the visitor is.
 * Two steps, named above the form by components/approved/RequestSteps.
 *
 * Step 1, "Your request": only what we need to call back.
 *   [Send a request | Have us call you]  (quiet tabs)
 *   What can we help with?
 *   Name, Phone
 *   "Add an email or choose how we reach you (optional)": one closed dropdown holding Email and
 *     How should we reach you
 *   Send request
 *   Prefer to talk? Call, Text us, Chat  (one quiet line)
 *
 * Step 2, on the success screen (components/approved/RequestDetailsPanel): the confirmation that
 * the request is sent and nothing else is needed, then one closed dropdown, "Add photos, plans or
 * project details (optional)", that adds project type, address, timing and files to the SAME lead
 * through the request id and short-lived token step 1 returned. The lead never waits on it.
 *
 * "Have us call you" reduces step 1 to name and phone (plus an optional best time) and posts
 * through the same /api/consultation pipeline, marked as a callback request.
 *
 * Native elements only (no Radix primitives), so nothing here sets state during hydration.
 */
export function HeroConversion({
  blockId = "request-form",
  recovery = false,
  showTitle = true,
  intro,
  estimate = null,
  onAccepted,
}: {
  /** Id of the form block. The homepage keeps "request-form" (scripts/verify-p5-mobile-seo.mjs). */
  blockId?: string;
  /** Report progress like the consultation form does (contact page). */
  recovery?: boolean;
  /** False where the surface already shows its own heading (the consult dialog title). */
  showTitle?: boolean;
  /** Shown above the first field, in both modes (the dialog's "Planning range attached" chip). */
  intro?: ReactNode;
  /** A planning range to send with this request; the server recomputes it before storing it. */
  estimate?: AttachedEstimatePayload | null;
  /** Called once the request is accepted (the dialog clears its carried range). */
  onAccepted?: () => void;
} = {}) {
  const uid = useId();
  const ids = (name: string) => `${uid}-${name}`;
  const [startedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<Mode>("request");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [reach, setReach] = useState<Reach>(DEFAULT_REACH);
  /** The step 1 dropdown of optional fields (email, how to reach you); closed until asked for. */
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [bestTime, setBestTime] = useState(BEST_TIMES[0]);
  const [website, setWebsite] = useState("");
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
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const callback = mode === "callback";

  // A Meta lead-form click or an earlier form on this visit may already know who this is.
  useEffect(() => {
    const apply = () => {
      const prefill = readStoredPrefill();
      if (prefill.name) setName((value) => value || prefill.name || "");
      if (prefill.phone) setPhone((value) => value || prefill.phone || "");
      if (prefill.email) {
        setEmail((value) => value || prefill.email || "");
        // Anything already entered in the optional dropdown is shown, never hidden.
        setOptionsOpen(true);
      }
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
  const engaged = Boolean(name || phone || note || email);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSubmitTried(true);
    setServerError("");
    const found = validate();
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      const focusFirst = () => formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      if (first === "email" && !optionsOpen) {
        // The email sits in the optional dropdown: open it, then focus the field.
        setOptionsOpen(true);
        window.requestAnimationFrame(focusFirst);
      } else focusFirst();
      return;
    }
    setBusy(true);
    try {
      const attribution = captureMarketingAttribution();
      let res: Response;
      if (estimate) {
        // A carried planning range rides the JSON side of the same route, as a short request.
        // The notes are built the way the route builds them for the multipart short request.
        const reachLabel = REACH_OPTIONS.find((option) => option.value === reach)?.label;
        const message = callback
          ? `CALLBACK REQUEST: call ${name.trim()} at ${phone.trim()}. Best time: ${bestTime || "Any time"}.`
          : [note.trim(), reachLabel ? `Preferred contact: ${reachLabel}` : ""].filter(Boolean).join("\n\n");
        res = await fetch("/api/consultation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestKind: "short",
            inquiryId: getOrCreateInquiryId(),
            formStartedAt: startedAt,
            website,
            name: name.trim(),
            phone: phone.trim(),
            email: callback ? "" : email.trim(),
            projectType: estimate.project,
            message,
            contactPreference: callback ? "call" : reach,
            ...(callback ? { callback: true, bestTime } : {}),
            estimate,
            ...(hasPassedGate() ? { skipEmail: true } : {}),
            ...(attribution ? { attribution } : {}),
          }),
        });
      } else {
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
        // Files are added on step 2, after the lead is saved; step 1 sends none.
        if (hasPassedGate()) body.set("skipEmail", "1");
        if (attribution) body.set("attribution", JSON.stringify(attribution));
        res = await fetch("/api/consultation", { method: "POST", body });
      }
      const data = (await res.json().catch(() => null)) as
        | (AcceptedInquiryResponse & { message?: string; requestId?: string; detailsToken?: string })
        | null;
      if (!res.ok || !data?.accepted) {
        setServerError(data?.message || "We could not send that. Try again, or call us.");
        setBusy(false);
        return;
      }
      trackAcceptedInquiry(data, estimate?.project || PROJECT_TYPE);
      markEstimatorCompleted("consultation");
      rotateInquiryId();
      try {
        sessionStorage.removeItem("brc_consult_context");
      } catch {
        /* storage unavailable */
      }
      onAccepted?.();
      const followUp =
        data.requestId && data.detailsToken ? { requestId: data.requestId, token: data.detailsToken } : null;
      setDone({
        firstName: name.trim().split(/\s+/)[0] || name.trim(),
        mode,
        phone: phone.trim(),
        // The copy goes out with the internal email; say so only when delivery went through.
        emailed: !callback && Boolean(email.trim()) && data.delivery !== "pending_retry",
        hadEmail: !callback && Boolean(email.trim()),
        followUp,
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

  // One quiet line under the send button. They were three outlined buttons stacked above it,
  // and a client could not tell which button sent the request.
  const talk = (
    <p className="fold-talk">
      <span className="fold-talk-title">Prefer to talk?</span>
      <a className="fold-call" href={SITE_CONFIG.phoneHref}>
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
        Chat
      </button>
    </p>
  );

  return (
    // data-family-bar-yield: the family mobile bar steps aside while the form, its success
    // screen or Step 2 is on screen (components/family/MobileActionBar.tsx).
    <div className="fold-convert" id={blockId} data-family-bar-yield="">
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
          <RequestSteps sent />
          <div role="status">
            <h2 ref={successRef} tabIndex={-1} className="fold-form-title fold-sent-title" data-clarity-mask="True">
              <span className="fold-tick" aria-hidden="true">
                <Check size={18} />
              </span>
              <span>Thanks, {done.firstName}. We have your request.</span>
            </h2>
            <p className="fold-success">
              {done.mode === "callback"
                ? `We will call you at ${done.phone} during business hours.`
                : "We will answer your questions and help you find a time to visit. You get a written scope before any price."}
            </p>
            <p className="fold-all-set" data-testid="quote-all-set">
              You are all set. Nothing else is needed.
            </p>
          </div>
          {done.emailed && <p className="fold-next">A copy of your request is on its way to your inbox.</p>}
          <p className="fold-next">
            Prefer to talk now? <a className="fold-inline-link" href={SITE_CONFIG.phoneHref}>Call {SITE_CONFIG.phone}</a>
          </p>
          <TextReplyLine className="fold-text-reply" />

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
          aria-labelledby={showTitle ? ids("title") : undefined}
          aria-label={showTitle ? undefined : callback ? "Request a call" : "Request a quote"}
        >
          {showTitle && (
            <h2 className="fold-form-title" id={ids("title")}>
              {callback ? "Request a call" : "Request a quote"}
            </h2>
          )}
          <RequestSteps sent={false} />

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

          {intro}

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
            // Everything optional lives in this one closed dropdown.
            <details
              className="fold-disclosure"
              open={optionsOpen}
              onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
              data-testid="quote-options"
            >
              <summary>
                <span>
                  Add an email or choose how we reach you <span className="fold-optional-mark">(optional)</span>
                </span>
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
              <div className="fold-disclosure-body">
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
                  aria-required={reach === "email" ? "true" : undefined}
                  aria-invalid={shown("email") ? true : undefined}
                  aria-describedby={describedBy("email", ids("email-hint"))}
                  maxLength={200}
                />
                <p className="fold-hint" id={ids("email-hint")}>
                  {reach === "email" ? "Needed so we can email you back." : "For a written copy of your request."}
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
              </div>
            </details>
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
            <button className="fold-submit" type="submit" disabled={busy} data-testid="button-send-request">
              {busy ? "Sending" : callback ? "Request a call" : "Send request"}
            </button>
            <p className="fold-next fold-send-note">
              {callback
                ? "We call you back during business hours."
                : "That is all we need. You can add photos or plans after you send."}
            </p>
            {talk}
          </div>
        </form>
      )}
    </div>
  );
}
