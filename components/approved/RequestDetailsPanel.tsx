"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AttachmentTile } from "@/components/approved/AttachmentTile";
import { trackEvent } from "@/lib/analytics";
import {
  saveRequestDetails,
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
 * Step 2 of the short request: "Help us prepare (optional)", on the success screen.
 * Everything here is optional and adds to the SAME lead through /api/consultation/details.
 * Nothing step 1 already asked is asked again (email only appears when step 1 had none).
 */
export function RequestDetailsPanel({
  followUp,
  askEmail,
}: {
  followUp: RequestFollowUp;
  askEmail: boolean;
}) {
  const uid = useId();
  const ids = (name: string) => `${uid}-${name}`;
  const [projectType, setProjectType] = useState("");
  const [address, setAddress] = useState("");
  const [timing, setTiming] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [state, setState] = useState<"open" | "saving" | "saved" | "skipped">("open");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const savedRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state === "saved" || state === "skipped") savedRef.current?.focus({ preventScroll: true });
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
      setMessage("Add a detail first, or skip this step.");
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
    setFiles(done.flatMap((upload) => (upload.status === "failed" ? [upload.file] : [])));
    setState("saved");
  }

  const failed = uploads.filter((upload) => upload.status === "failed");

  if (state === "skipped") {
    return (
      <p className="fold-next" ref={savedRef} tabIndex={-1}>
        No problem. We have what we need to get started.
      </p>
    );
  }

  if (state === "saved") {
    return (
      <div className="fold-details fold-details-saved" data-testid="request-details-saved">
        <p className="fold-details-title" ref={savedRef} tabIndex={-1}>
          Saved. Thank you.
        </p>
        {failed.length > 0 && (
          <p className="fold-field-error" role="status">
            {failed.map((upload) => upload.file.name).join(", ")} did not upload.{" "}
            <a className="fold-inline-link" href={SITE_CONFIG.phoneSmsHref}>
              Text it to us
            </a>{" "}
            instead.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="fold-details"
      onSubmit={onSave}
      noValidate
      aria-labelledby={ids("title")}
      data-clarity-mask="True"
      data-testid="request-details"
    >
      <h3 className="fold-details-title" id={ids("title")}>
        Help us prepare (optional)
      </h3>
      <p className="fold-hint">A few details help us give you a closer quote on the first call.</p>

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

      <AttachmentTile files={files} onChange={setFiles} title="Add more photos, plans or files" testId="request-details-attachments" />

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
        <button type="button" className="fold-secondary" onClick={() => setState("skipped")}>
          Skip
        </button>
      </div>
    </form>
  );
}
