"use client";

import { useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { TextReplyLine } from "@/components/TextReplyLine";
import { markEstimatorCompleted } from "@/lib/estimatorSession";
import {
  getOrCreateInquiryId,
  rotateInquiryId,
  trackAcceptedInquiry,
  type AcceptedInquiryResponse,
} from "@/lib/inquiryTracking";
import { captureMarketingAttribution } from "@/lib/marketingAttributionBrowser";
import { SITE_CONFIG } from "@/shared/siteConfig";

const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function HeroConversion() {
  const [startedAt] = useState(() => Date.now());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (next.some((existing) => existing.name === file.name && existing.size === file.size)) continue;
      next.push(file);
    }
    setFiles(next);
    setError("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const cleanName = name.trim();
    const cleanNote = note.trim();
    if (cleanName.length < 2 || digits(phone).length < 10 || !email.includes("@") || cleanNote.length < 8) {
      setError("Enter your name, phone, email, and a short note about the work.");
      return;
    }
    if (files.length > MAX_FILES) {
      setError("You can attach up to 4 photos or plans.");
      return;
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      setError("Each photo or plan must be 8 MB or smaller.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("inquiryId", getOrCreateInquiryId());
      body.set("formStartedAt", String(startedAt));
      body.set("website", website);
      body.set("name", cleanName);
      body.set("phone", phone.trim());
      body.set("email", email.trim());
      body.set("message", cleanNote);
      const attribution = captureMarketingAttribution();
      if (attribution) body.set("attribution", JSON.stringify(attribution));
      for (const file of files) body.append("files", file);
      const res = await fetch("/api/consultation", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as (AcceptedInquiryResponse & { message?: string }) | null;
      if (!res.ok || !data?.accepted) {
        setError(data?.message || "We could not send that request. Try again, or call us.");
        setBusy(false);
        return;
      }
      trackAcceptedInquiry(data, "Home repair or remodel");
      markEstimatorCompleted("consultation");
      rotateInquiryId();
      setDone(true);
    } catch {
      setError("We could not send that request. Try again, or call us.");
      setBusy(false);
    }
  }

  return (
    <div className="fold-convert" id="request-form">
      <div className="fold-actions">
        <a className="fold-call" href={SITE_CONFIG.phoneHref}>
          <Phone size={18} aria-hidden="true" />
          Call
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
      {done ? (
        <>
          <p className="fold-success" role="status">
            Request received. We will call you within one business day.
          </p>
          <TextReplyLine className="fold-text-reply" />
        </>
      ) : (
        <form className="fold-form" data-clarity-mask="True" onSubmit={onSubmit} noValidate>
          <p className="fold-form-title">Request a call</p>
          <label>
            <span>Name</span>
            <input
              data-clarity-mask="True"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>What should we look at?</span>
            <input
              data-clarity-mask="True"
              name="message"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Kitchen, bath, a repair list"
              required
              maxLength={1000}
            />
          </label>
          <label className="fold-file">
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
            <ul className="fold-files">
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
          <p className="fold-file-note">JPEG, PNG, WebP, HEIC, or PDF. Up to 4 files, 8 MB each.</p>
          <input
            data-clarity-mask="True"
            className="fold-honeypot"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
          {error && (
            <p className="fold-error" role="alert">
              {error}
            </p>
          )}
          <button className="fold-submit" type="submit" disabled={busy}>
            {busy ? "Sending" : "Send request"}
          </button>
          <a className="fold-secondary" href="#planning-range">
            Prefer a guided planning range?
          </a>
        </form>
      )}
    </div>
  );
}
