"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useFormInView } from "@/hooks/use-form-in-view";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
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
  "Hi - I can work up a planning range for a remodel, price an inspection repair list, or answer questions about how we work. What are you thinking about?";

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
  const formInView = useFormInView(pathname);
  const [open, setOpen] = useState(false);
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
              "Something went wrong on our end. Try again in a moment, or use the project estimator - it prices instantly.",
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
    pathname === "/estimate" ||
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
          className="fixed z-[90] bottom-20 right-4 md:bottom-6 md:right-6 flex h-13 w-13 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-105 transition-transform p-3.5"
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
        </button>
      )}

      {open && (
        <div
          data-testid="assistant-panel"
          role="dialog"
          aria-label="Estimating assistant chat"
          className="fixed z-[95] bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto md:w-[400px] flex flex-col rounded-t-lg md:rounded-lg border border-border bg-background shadow-2xl max-h-[85vh] md:max-h-[600px] h-[70vh] md:h-[600px]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <div>
              <p className="font-semibold text-sm">Estimating assistant</p>
              <p className="text-xs text-muted-foreground">Real engine pricing, in plain English</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div ref={logRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <Bubble role="assistant" content={GREETING} />
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} notice={m.notice} />
            ))}
            {busy && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm pl-1" aria-label="Assistant is typing">
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            {offerEstimator && !busy && (
              <div className="pt-1">
                <Link
                  href={estimatorHref}
                  onClick={() => trackEvent(ASSISTANT_EVENTS.handoffEstimator, {})}
                  className="inline-block rounded-sm border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Fine-tune this in the estimator
                </Link>
              </div>
            )}
          </div>

          <form
            className="border-t border-border p-3 flex items-end gap-2 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
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
              className="flex-1 resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-28"
            />
            <button
              type="submit"
              data-testid="assistant-send"
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="rounded-sm bg-foreground text-background p-2.5 disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, content, notice }: { role: "user" | "assistant"; content: string; notice?: boolean }) {
  return (
    <div className={role === "user" ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          role === "user"
            ? "max-w-[85%] rounded-lg bg-foreground text-background px-3.5 py-2.5 text-sm whitespace-pre-wrap"
            : notice
              ? "max-w-[85%] rounded-lg border border-border bg-muted/60 text-muted-foreground px-3.5 py-2.5 text-sm whitespace-pre-wrap"
              : "max-w-[85%] rounded-lg bg-muted px-3.5 py-2.5 text-sm whitespace-pre-wrap"
        }
      >
        {content}
      </div>
    </div>
  );
}
