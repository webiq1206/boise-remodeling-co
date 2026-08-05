"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ChevronDown, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ══════════════════════════════════════════════════════════════════════
   STEP HEADING
   One clear purpose per step: a short heading, a plain-language line on what
   to do, and optional expandable help for anyone who is unsure.
══════════════════════════════════════════════════════════════════════ */

export interface StepHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Expandable "why we ask / what if I am not sure" content. */
  help?: React.ReactNode;
  helpLabel?: string;
  className?: string;
}

export function StepHeading({
  eyebrow,
  title,
  description,
  help,
  helpLabel = "Why we ask, and what to do if you are unsure",
  className,
}: StepHeadingProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("mb-5", className)}>
      {eyebrow ? (
        <p className="text-[12px] tracking-[0.14em] uppercase text-accent-legible/90 mb-2">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="font-sans font-light text-[clamp(1.5rem,5.5vw,2.25rem)] leading-[1.1] tracking-tight text-inverse-foreground"
        data-testid="step-heading"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2.5 text-[14px] text-inverse-foreground/80 leading-relaxed">
          {description}
        </p>
      ) : null}

      {help ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-inverse-foreground underline underline-offset-4 decoration-accent-legible/50 hover:decoration-accent-legible"
          >
            <HelpCircle className="h-4 w-4 text-accent-legible" aria-hidden="true" />
            {helpLabel}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          {open ? (
            <div className="mt-2 rounded-md border border-accent-legible/20 bg-inverse-foreground/[0.05] p-3.5 text-[13px] text-inverse-muted leading-relaxed">
              {help}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ERROR BANNER
   Plain language, near the controls, focus-managed so a screen reader and a
   sighted keyboard user both land on it. Never a bare "Something went wrong".
══════════════════════════════════════════════════════════════════════ */

export function WizardError({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      data-testid="wizard-error"
      className="mb-5 flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3.5 text-[13.5px] text-inverse-foreground leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STICKY BOTTOM NAVIGATION
   Back + Continue, pinned to the bottom of the step, safe-area aware, with a
   large primary target. Part of normal flow (sticky, not fixed) so it never
   covers a question or an error message.
══════════════════════════════════════════════════════════════════════ */

export interface StickyStepNavProps {
  onBack?: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  /** Optional tertiary action, e.g. "Skip for now". */
  onSecondary?: () => void;
  secondaryLabel?: string;
  /** Hint shown above the buttons, e.g. "Optional, you can add this later". */
  hint?: string;
  nextTestId?: string;
  backTestId?: string;
}

export function StickyStepNav({
  onBack,
  backLabel = "Back",
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  busy = false,
  busyLabel = "Working...",
  onSecondary,
  secondaryLabel,
  hint,
  nextTestId = "wizard-next",
  backTestId = "wizard-back",
}: StickyStepNavProps) {
  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-inverse-foreground/12 bg-inverse/95 px-4 pt-3 pb-safe backdrop-blur-md sm:-mx-6 sm:px-6"
      data-testid="wizard-sticky-nav"
    >
      {hint ? (
        <p className="mb-2 text-center text-[12px] text-inverse-muted">{hint}</p>
      ) : null}
      <div className="flex items-center gap-2.5 pb-3">
        {onBack ? (
          <Button
            type="button"
            variant="heroGhost"
            onClick={onBack}
            disabled={busy}
            data-testid={backTestId}
            className="min-h-12 flex-shrink-0 px-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">{backLabel}</span>
          </Button>
        ) : null}

        {onSecondary ? (
          <Button
            type="button"
            variant="heroGhost"
            onClick={onSecondary}
            disabled={busy}
            className="min-h-12 flex-shrink-0 px-4"
            data-testid="wizard-secondary"
          >
            {secondaryLabel}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="brand"
          onClick={onNext}
          disabled={nextDisabled || busy}
          data-testid={nextTestId}
          className="min-h-12 flex-1 px-6 text-[15px]"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {busyLabel}
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
