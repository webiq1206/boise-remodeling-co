"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AttachmentTile } from "@/components/approved/AttachmentTile";
import { trackEvent } from "@/lib/analytics";
import {
  saveRequestDetails,
  uploadRequestFile,
  uploadRequestFiles,
  type FileUpload,
  type RequestFollowUp,
} from "@/lib/requestFollowUp";
import { DETAIL_PROJECT_TYPES, DETAIL_TIMINGS } from "@/shared/requestDetails";
import { SITE_CONFIG } from "@/shared/siteConfig";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Step 2 of the short request, on the success screen: ONE quiet text toggle (a native details,
 * closed, no box), "Add photos, plans or details (optional)". Opened, its fields sit inline with
 * no panel around them and add a few details and files to the SAME lead through
 * /api/consultation/details. Nothing step 1 already asked is asked again (email only appears
 * when step 1 had none), and leaving it closed needs no action.
 *
 * It used to sit open under the confirmation as "Help us prepare (optional)" with a Skip button,
 * and a client read it as the form asking for more before the request counted (11 November
 * 2026). There is no Skip now: leaving the dropdown closed is skipping.
 *
 * A file that fails to upload says so by name and offers "Try again" or texting it; the request
 * itself is already saved and never depends on it.
 */
export function RequestDetailsPanel({
  followUp,
  askEmail,
  askAddress = true,
}: {
  followUp: RequestFollowUp;
  askEmail: boolean;
  /** False when step 1 already has the address: step 2 never re-asks what step 1 has. */
  askAddress?: boolean;
}) {
  const uid = useId();
  const ids = (name: string) => `${uid}-${name}`;
  const [projectType, setProjectType] = useState("");
  const [address, setAddress] = useState("");
  const [timing, setTiming] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [state, setState] = useState<"open" | "saving" | "saved">("open");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  /** Some file did not upload when the details were saved: the saved state lists the files. */
  const [retryable, setRetryable] = useState(false);
  const savedRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state === "saved") savedRef.current?.focus({ preventScroll: true });
  }, [state]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    setMessage("");
    const cleanEmail = email.trim();
    if (cleanEmail && !validEmail(cleanEmail)) {
      setEmailError("Check the email address.");
      return;
    }
    setEmailError("");
    const fields = {
      ...(projectType ? { projectType } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(timing ? { timing } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
    };
    if (!Object.keys(fields).length && !files.length) {
      setMessage("Add a detail or a file above. If you have nothing to add, you are already done.");
      return;
    }
    setState("saving");
    const done = files.length ? await uploadRequestFiles(followUp, files, setUploads) : [];
    const keys = done.flatMap((upload) => (upload.status === "stored" ? [upload.key] : []));
    if (!Object.keys(fields).length && !keys.length) {
      setState("open");
      setMessage("Your files did not upload. Try again, or text them to us.");
      return;
    }
    const result = await saveRequestDetails(followUp, fields, keys);
    if (!result.ok) {
      setState("open");
      setMessage(result.message);
      return;
    }
    // Step 2 is not a second lead: its own event only, never the lead or conversion events,
    // and no personal details.
    if (!result.unchanged) {
      trackEvent("lead_details_added", {
        form: "short_request",
        fields_added: Object.keys(fields).length,
        files_added: keys.length,
      });
    }
    setFiles([]);
    setRetryable(done.some((upload) => upload.status === "failed"));
    setState("saved");
  }

  /** After "Saved": one more try for a file that did not upload, added to the same lead. */
  async function retryFile(index: number) {
    const target = uploads[index];
    if (!target || target.status !== "failed") return;
    const set = (next: FileUpload) => setUploads((current) => current.map((upload, at) => (at === index ? next : upload)));
    set({ file: target.file, status: "uploading" });
    const result = await uploadRequestFile(followUp, target.file);
    if (result.status !== "stored") return set(result);
    const saved = await saveRequestDetails(followUp, {}, [result.key]);
    set(saved.ok ? result : { file: target.file, status: "failed", message: "We could not add it to your request." });
  }

  if (state === "saved") {
    return (
      <div className="fold-details fold-details-saved" data-testid="request-details-saved">
        <p className="fold-details-title" ref={savedRef} tabIndex={-1}>
          Saved. Thank you.
        </p>
        {retryable && (
          <ul className="fold-upload-list" data-testid="request-uploads" aria-live="polite">
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
        )}
      </div>
    );
  }

  return (
    // The panel keeps its test id on the wrapper; the dropdown inside it starts closed.
    <section className="fold-details" data-clarity-mask="True" data-testid="request-details">
      <details className="fold-toggle" data-testid="quote-details-disclosure">
        <summary>
          <Plus size={16} aria-hidden="true" />
          <span id={ids("title")}>Add photos, plans or details (optional)</span>
        </summary>
        <form className="fold-toggle-body" onSubmit={onSave} noValidate aria-labelledby={ids("title")}>
      <fieldset className="fold-reach">
        <legend>Project type</legend>
        <div className="fold-pills fold-pills-wrap">
          {DETAIL_PROJECT_TYPES.map((option) => (
            <label className="fold-pill" key={option.value}>
              <input
                data-clarity-mask="True"
                type="radio"
                name="detailProjectType"
                value={option.value}
                checked={projectType === option.value}
                onChange={() => setProjectType(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {askAddress && (
      <div className="fold-field">
        <label htmlFor={ids("address")}>Address or ZIP code</label>
        <input
          id={ids("address")}
          data-clarity-mask="True"
          name="address"
          autoComplete="street-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          maxLength={300}
        />
      </div>
      )}

      <fieldset className="fold-reach">
        <legend>When would you like to start?</legend>
        <div className="fold-pills fold-pills-wrap">
          {DETAIL_TIMINGS.map((option) => (
            <label className="fold-pill" key={option}>
              <input
                data-clarity-mask="True"
                type="radio"
                name="detailTiming"
                value={option}
                checked={timing === option}
                onChange={() => setTiming(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {askEmail && (
        <div className="fold-field">
          <label htmlFor={ids("email")}>Email (optional)</label>
          <input
            id={ids("email")}
            data-clarity-mask="True"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? ids("email-error") : undefined}
            maxLength={200}
          />
          <p id={ids("email-error")} className="fold-field-error" aria-live="polite">
            {emailError}
          </p>
        </div>
      )}

      <AttachmentTile files={files} onChange={setFiles} testId="request-details-attachments" />

      {state === "saving" && uploads.some((upload) => upload.status === "uploading") && (
        <p className="fold-next" role="status">
          Uploading {uploads.filter((upload) => upload.status !== "uploading").length + 1} of {uploads.length}
        </p>
      )}
      {message && (
        <p className="fold-error" role="alert">
          {message}
        </p>
      )}
      <div className="fold-details-actions">
        <button className="fold-submit" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Saving" : "Save details"}
        </button>
      </div>
        </form>
      </details>
    </section>
  );
}
