"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Phone, PhoneCall } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { trackEvent } from "@/lib/analytics";
import { deviceCategory, getEstimatorSessionId, recordRecoveryAction, type EstimatorFlow } from "@/lib/estimatorSession";
import type { ExitMethod } from "./useAbandonmentRecovery";

export interface AbandonmentPromptProps {
  open: boolean;
  flow: EstimatorFlow;
  method: ExitMethod | null;
  /** True when a link click was intercepted: "continue" resumes that navigation. */
  leaving: boolean;
  onStay: () => void;
  onContinue: () => void;
}

type CallbackState = "idle" | "sending" | "sent" | "error";

/**
 * "Prefer to talk instead?" - shown once when a visitor is about to leave an
 * incomplete estimator. Call, text, or leave a number for a callback; or simply
 * continue. It is a helper, not a wall: Escape and the backdrop dismiss it, and
 * dismissal is remembered for the session.
 */
export function AbandonmentPrompt({ open, flow, method, leaving, onStay, onContinue }: AbandonmentPromptProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<CallbackState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const key = `${flow}:${method}`;
    if (shownFor.current === key) return;
    shownFor.current = key;
    recordRecoveryAction(flow, { shown: true }, method ?? undefined);
    trackEvent("estimator_recovery_prompt", { flow, method: method ?? "unknown", action: "shown" });
  }, [open, flow, method]);

  const dismiss = (how: "stay" | "continue") => {
    recordRecoveryAction(flow, { dismissed: true });
    trackEvent("estimator_recovery_prompt", { flow, action: how === "continue" ? "continue_leaving" : "stay" });
    if (how === "continue") onContinue();
    else onStay();
  };

  const onCall = () => { recordRecoveryAction(flow, { call: true }); trackEvent("estimator_recovery_prompt", { flow, action: "call" }); };
  const onText = () => { recordRecoveryAction(flow, { text: true }); trackEvent("estimator_recovery_prompt", { flow, action: "text" }); };

  async function submitCallback(event: FormEvent) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setState("error"); setMessage("Please enter a 10-digit phone number."); return; }
    setState("sending"); setMessage(null);
    try {
      const res = await fetch("/api/recovery/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getEstimatorSessionId(), flow, phone: digits, name: name.trim() || undefined, pagePath: window.location.pathname, device: deviceCategory() }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setState("error");
        setMessage(json.message ?? `We could not save that. Please call ${SITE_CONFIG.phone}.`);
        return;
      }
      setState("sent");
      trackEvent("estimator_recovery_prompt", { flow, action: "callback_requested" });
    } catch {
      setState("error");
      setMessage(`We could not reach the server. Please call ${SITE_CONFIG.phone}.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss("stay"); }}>
      <DialogContent
        className="max-w-md rounded-sm border border-inverse-foreground/15 bg-[hsl(var(--inverse))] p-6 text-inverse-foreground sm:p-7"
        data-testid="abandonment-prompt"
        aria-describedby="abandonment-prompt-desc"
      >
        <p className="ed-eyebrow !mb-2" style={{ color: "var(--ed-accent)" }}>
          {leaving ? "Before you go" : "Need a hand?"}
        </p>
        <DialogTitle className="ed-h3 !leading-tight">
          {state === "sent" ? "We will call you back." : "Prefer to talk it through instead?"}
        </DialogTitle>
        <DialogDescription id="abandonment-prompt-desc" className="ed-body mt-2 text-[0.9375rem] text-inverse-muted">
          {state === "sent"
            ? "Thanks. Someone from the team will call within one business day. You can keep going here or close this window."
            : `A quick call or text answers most questions in a minute. Or leave a number and we will call you back within one business day.`}
        </DialogDescription>

        {state !== "sent" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <a
                href={SITE_CONFIG.phoneHref}
                onClick={onCall}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-inverse-foreground/70 bg-inverse-foreground/[0.08] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-inverse-foreground transition-colors hover:bg-inverse-foreground hover:text-inverse"
                data-testid="recovery-call"
              >
                <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Call
              </a>
              <a
                href={SITE_CONFIG.phoneSmsHref}
                onClick={onText}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-inverse-foreground/70 bg-inverse-foreground/[0.08] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-inverse-foreground transition-colors hover:bg-inverse-foreground hover:text-inverse"
                data-testid="recovery-text"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Text
              </a>
            </div>

            <form onSubmit={submitCallback} noValidate className="mt-5 border-t border-inverse-foreground/[0.12] pt-5" data-testid="recovery-callback-form">
              <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-inverse-muted">Or request a callback</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <label className="sr-only" htmlFor="recovery-phone">Your phone number</label>
                <input
                  id="recovery-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(208) 555-0100"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (state === "error") setState("idle"); }}
                  className="h-12 w-full rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] px-3 text-base text-inverse-foreground placeholder:text-inverse-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible"
                  aria-invalid={state === "error" || undefined}
                  aria-describedby={message ? "recovery-callback-msg" : undefined}
                  data-testid="recovery-phone"
                />
                <Button type="submit" variant="brand" className="min-h-12 px-5" disabled={state === "sending"} data-testid="recovery-callback-submit">
                  <PhoneCall className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  {state === "sending" ? "Sending…" : "Call me"}
                </Button>
              </div>
              <label className="sr-only" htmlFor="recovery-name">Your name (optional)</label>
              <input
                id="recovery-name"
                type="text"
                autoComplete="name"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full rounded-sm border border-inverse-foreground/25 bg-inverse-foreground/[0.06] px-3 text-sm text-inverse-foreground placeholder:text-inverse-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible"
              />
              {message && (
                <p id="recovery-callback-msg" role="alert" className="mt-2 text-[0.8125rem] text-red-300">
                  {message}
                </p>
              )}
            </form>
          </>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => dismiss(leaving ? "continue" : "stay")}
            className="min-h-11 text-left text-[0.8125rem] text-inverse-muted underline underline-offset-4 hover:text-inverse-foreground"
            data-testid="recovery-dismiss"
          >
            {leaving ? "No thanks, continue" : "No thanks"}
          </button>
          {state !== "sent" ? (
            <button
              type="button"
              onClick={() => dismiss("stay")}
              className="min-h-11 text-[0.8125rem] font-semibold text-inverse-foreground underline underline-offset-4"
              data-testid="recovery-stay"
            >
              Keep going with my estimate
            </button>
          ) : (
            <Button type="button" variant="brandOutline" className="min-h-11 border-inverse-foreground/70 text-inverse-foreground" onClick={() => (leaving ? onContinue() : onStay())}>
              {leaving ? "Continue" : "Close"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
