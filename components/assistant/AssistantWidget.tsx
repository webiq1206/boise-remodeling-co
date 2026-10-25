"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useFormInView } from "@/hooks/use-form-in-view";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { continueAssistantProject } from "@/lib/p5/assistantContinuation";
import { trackEvent } from "@/lib/analytics";
import { isPortalPath } from "@/lib/portalRoutes";
import { ASSISTANT_EVENTS } from "@/shared/assistant/analyticsEvents";

/**
 * The estimating assistant, mounted site-wide.
 *
 * The client is deliberately dumb: it renders text, stores the signed
 * transcript the server hands back, and posts it back verbatim. It never
 * computes, caches, or reformats a price - every number on screen arrived
 * inside a reply the server already ran through the grounding guard.
 *
 * Context pickup sends the current page and any in-progress estimator
 * settings (project / finish / sqft - settings, never prices) with the first
 * message, so "I was just looking at the kitchen calculator" needs no
 * re-explaining.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Local-only presentation flag for service notices (rate limit, offline). */
  notice?: boolean;
}

interface Transcript {
  payload: string;
  signature: string;
}

const STORAGE_KEY = "brc_assistant_chat_v1";
const GREETING =
  "Hi - I can help describe your remodel or repair project, answer questions, and carry your notes into the project estimator.";

function readEstimatorContext(): { project?: string; finish?: string; sqft?: number } | undefined {
  try {
    const raw = sessionStorage.getItem("brc_estimate_progress_v1");
    if (!raw) return undefined;
    const p = JSON.parse(raw);
    if (p?.v !== 1) return undefined;
    const context: { project?: string; finish?: string; sqft?: number } = {};
    if (typeof p.activeProject === "string") context.project = p.activeProject;
    if (typeof p.finish === "string") context.finish = p.finish;
    if (typeof p.sqft === "number" && p.sqft > 0) context.sqft = p.sqft;
    return context.project || context.finish || context.sqft ? context : undefined;
  } catch {
    return undefined;
  }
}

export function AssistantWidget() {
  const pathname = usePathname();
  const formInView = useFormInView(pathname, true);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [sheet, setSheet] = useState({ top: 0, height: 0 });
  useEffect(() => {
    const openFromBar = () => setOpen(true);
    window.addEventListener("p5:assistant-open", openFromBar);
    return () => window.removeEventListener("p5:assistant-open", openFromBar);
  }, []);
  useEffect(() => setPortalReady(true), []);
  useEffect(() => {
    if (!open) return;
    const phoneQuery = window.matchMedia("(max-width: 1179px)");
    const apply = () => {
      const viewport = window.visualViewport;
      setSheet({
        top: viewport?.offsetTop ?? 0,
        height: viewport?.height ?? window.innerHeight,
      });
      if (phoneQuery.matches) {
        document.body.dataset.assistantOpen = "true";
        document.body.style.overflow = "hidden";
      } else {
        delete document.body.dataset.assistantOpen;
        document.body.style.overflow = "";
      }
    };
    apply();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    phoneQuery.addEventListener("change", apply);
    return () => {
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      phoneQuery.removeEventListener("change", apply);
      delete document.body.dataset.assistantOpen;
      document.body.style.overflow = "";
    };
  }, [open]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [offerEstimator, setOfferEstimator] = useState(false);
  const [restored, setRestored] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentAnyRef = useRef(false);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.v === 1) {
          if (Array.isArray(p.messages)) setMessages(p.messages);
          if (p.transcript?.payload && p.transcript?.signature) setTranscript(p.transcript);
          if (p.offerEstimator === true) setOfferEstimator(true);
          sentAnyRef.current = Array.isArray(p.messages) && p.messages.some((m: ChatMessage) => m.role === "user");
        }
      }
    } catch {
      /* Corrupt record: start fresh. */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, messages, transcript, offerEstimator }));
    } catch {
      /* Private mode / quota: the visitor loses refresh recovery only. */
    }
  }, [restored, messages, transcript, offerEstimator]);

  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [open, messages, busy]);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    trackEvent(ASSISTANT_EVENTS.messageSent, {});

    try {
      const isFirst = !sentAnyRef.current;
      sentAnyRef.current = true;
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          transcript: transcript ?? undefined,
          ...(isFirst
            ? { context: { page: pathname ?? undefined, estimator: readEstimatorContext() } }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.transcript?.payload && data.transcript?.signature) setTranscript(data.transcript);
        trackEvent(ASSISTANT_EVENTS.replyReceived, {});
        if (data.lastEstimate) {
          trackEvent(ASSISTANT_EVENTS.estimatePresented, { kind: data.lastEstimate.kind });
          if (data.lastEstimate.kind === "remodel") setOfferEstimator(true);
        }
        if (data.leadCaptured) trackEvent(ASSISTANT_EVENTS.leadCaptured, {});
      } else if (res.status === 409) {
        // Signature/shape rejection: the conversation restarts, honestly.
        setTranscript(null);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", notice: true, content: data?.message ?? "That conversation expired - say that again and we'll start fresh." },
        ]);
      } else {
        if (data?.unavailable || res.status === 503) trackEvent(ASSISTANT_EVENTS.unavailable, { status: res.status });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            notice: true,
            content:
              data?.message ??
              "Something went wrong on our end. Try again in a moment, or continue your project in the estimator.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", notice: true, content: "We couldn't reach the assistant. Check your connection and try again." },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [draft, busy, transcript, pathname]);

  // Chat has no place over the client portal or admin surfaces.
  if (!pathname || isPortalPath(pathname) || pathname.startsWith("/admin")) return null;

  /* NOR OVER A WIZARD THAT OWNS THE BOTTOM OF THE SCREEN. The launcher floats
     bottom-right at exactly the height of the estimator's fixed Back/Continue
     bar, so on a phone it covered the primary action of the step. The
     estimator and the RE-10 wizard already hide the site-wide Call/Text bar
     for the same reason; the launcher follows the same rule and comes back
     everywhere else. */
  const wizardOwnsBottom =
    (pathname === "/estimate" || pathname === "/estimate/p5-preview") ||
    pathname.startsWith("/re-10") ||
    pathname.startsWith("/remodel-plans");
  if (wizardOwnsBottom && !open) return null;

  const estimatorHref = pathname === "/" ? "/#calculator" : "/estimate";

  return (
    <>
      {!open && !formInView && (
        <button
          type="button"
          data-testid="assistant-launcher"
          onClick={() => {
            setOpen(true);
            trackEvent(ASSISTANT_EVENTS.opened, { page: pathname });
          }}
          aria-label="Chat with the estimating assistant"
          className="fixed z-[90] bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6 hidden min-[1180px]:flex h-13 w-13 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-105 transition-transform p-3.5"
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
        </button>
      )}

      {open && portalReady && createPortal(
        <div
          data-testid="assistant-panel"
          data-clarity-mask="true"
          role="dialog"
          aria-modal="true"
          aria-label="Estimating assistant chat"
          className="assistant-sheet"
          style={sheet.height > 0 ? ({
            "--assistant-top": `${sheet.top}px`,
            "--assistant-height": `${sheet.height}px`,
          } as React.CSSProperties) : undefined}
        >
          <div className="assistant-sheet-bar">
            <div>
              <p className="assistant-sheet-title">Estimating assistant</p>
              <p className="assistant-sheet-sub">Project guidance, in plain English</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="assistant-sheet-close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div ref={logRef} role="log" aria-live="polite" data-clarity-mask="True" className="assistant-log">
            <Bubble role="assistant" content={GREETING} />
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} notice={m.notice} />
            ))}
            {busy && (
              <div className="assistant-typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            )}
            <button type="button" disabled={busy} data-testid="button-assistant-continue" className="assistant-continue" onClick={()=>{
              try {continueAssistantProject(messages,draft);trackEvent(ASSISTANT_EVENTS.handoffEstimator,{});window.location.assign('/estimate');}
              catch(error){setMessages(prev=>[...prev,{role:'assistant',notice:true,content:error instanceof Error?error.message:'Your project could not be saved. Please retry.'}]);}
            }}>Continue project</button>
          </div>

          <form
            data-clarity-mask="True"
            className="assistant-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              data-clarity-mask="True"
              ref={inputRef}
              data-testid="assistant-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask about your project..."
              aria-label="Message the estimating assistant"
              className="assistant-field"
            />
            <button
              type="submit"
              data-testid="assistant-send"
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="assistant-send"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}

function Bubble({ role, content, notice }: { role: "user" | "assistant"; content: string; notice?: boolean }) {
  const tone = role === "user" ? "assistant-bubble-user" : notice ? "assistant-bubble-notice" : "assistant-bubble-assistant";
  return (
    <div className={role === "user" ? "assistant-row-user" : "assistant-row-assistant"}>
      <div className={tone}>{content}</div>
    </div>
  );
}
