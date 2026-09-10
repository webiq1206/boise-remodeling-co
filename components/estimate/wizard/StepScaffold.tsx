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
  const headingRef = useRef<HTMLHeadingElement>(null);
  /* Every step body that renders a StepHeading is conditionally mounted (only
     one step is in the tree at a time), so this fires fresh on every step
     change. Moves focus to the new step's heading so a screen reader or
     keyboard user who is not visually tracking the scroll still gets told
     the step changed, not just a sighted user watching it scroll. */
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={cn("mb-5", className)}>
      {eyebrow ? (
        <p className="text-label tracking-[0.14em] uppercase text-accent-legible/90 mb-2">
          {eyebrow}
        </p>
      ) : null}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[clamp(1.5rem,5.5vw,2.25rem)] leading-[1.1] tracking-tight text-inverse-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible rounded-sm"
        data-testid="step-heading"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2.5 text-body text-inverse-foreground/80 leading-relaxed">
          {description}
        </p>
      ) : null}

      {help ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center gap-1.5 text-body-sm text-inverse-foreground underline underline-offset-4 decoration-accent-legible/50 hover:decoration-accent-legible"
          >
            <HelpCircle className="h-4 w-4 text-accent-legible" aria-hidden="true" />
            {helpLabel}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          {open ? (
            <div className="mt-2 rounded-md border border-accent-legible/20 bg-inverse-foreground/[0.05] p-3.5 text-body-sm text-inverse-muted leading-relaxed">
              {help}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STEP TRANSITION
   Wraps one wizard screen. Give it a key that changes with the step and the
   remount replays a short fade-up, so moving between questions feels like an
   app transition rather than content snapping into place. Reduced motion is
   flattened globally in globals.css.
══════════════════════════════════════════════════════════════════════ */

export function StepTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("wizard-step-enter", className)}>{children}</div>;
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
      className="mb-5 flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3.5 text-body text-inverse-foreground leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60"
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
  /**
   * FIXED ONLY WHEN THE WIZARD OWNS THE SCREEN.
   *
   * On a dedicated wizard page the nav must be fixed, or the Continue button
   * sits below the fold on a phone. EMBEDDED in a long marketing page it must
   * NOT be: a fixed bar there pins Back/Continue over the hero for a
   * calculator the visitor is 2,300px away from and has not scrolled to. Same
   * component, two situations, and the caller is the only thing that knows
   * which one it is in.
   */
  ownsScreen?: boolean;
  /**
   * Inside the one-screen AppFrame the frame footer is the bottom edge, so the
   * nav renders in flow: no fixed, no sticky, no spacer, no negative margins.
   */
  inFrame?: boolean;
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
  ownsScreen = false,
  inFrame = false,
}: StickyStepNavProps) {
  if (inFrame) {
    return (
      <div data-testid="wizard-sticky-nav" className="pt-1">
        {hint ? <p className="mb-2 text-center text-label text-inverse-muted">{hint}</p> : null}
        <div className="flex items-center gap-2.5 pb-2">
          {onBack ? (
            <Button type="button" variant="heroGhost" onClick={onBack} disabled={busy} data-testid={backTestId} className="min-h-12 flex-shrink-0 px-4">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{backLabel}</span>
            </Button>
          ) : null}
          {onSecondary ? (
            <Button type="button" variant="heroGhost" onClick={onSecondary} disabled={busy} className="min-h-12 flex-shrink-0 px-4" data-testid="wizard-secondary">
              {secondaryLabel}
            </Button>
          ) : null}
          <Button type="button" variant="brand" onClick={onNext} disabled={nextDisabled || busy} data-testid={nextTestId} className="min-h-12 flex-1 px-6 text-body">
            {busy ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{busyLabel}</>) : (<>{nextLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>)}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Spacer. The bar is FIXED on a phone, so without this the last of the
          step content hides underneath it - which is how a "sticky footer"
          quietly eats the final form field. Desktop keeps the bar in flow and
          needs no spacer. */}

      <div
        /**
         * FIXED ON MOBILE, STICKY ON DESKTOP, and the difference matters.
         *
         * `position: sticky; bottom: 0` does NOT pull an element up into the
         * viewport - it only holds it there once you have scrolled to it. So
         * on a 375x812 phone the Continue button sat at y=828, sixteen pixels
         * BELOW the fold on load: the primary action of the primary
         * conversion flow, off screen, on the device most people use. Fixed
         * positioning is what actually guarantees it is reachable without
         * scrolling. The wizard already hides the site-wide Call/Text bar
         * while it owns the screen, so nothing collides.
         */
        className={cn(
          "z-30 border-t border-inverse-foreground/[0.12] bg-inverse px-4 pt-3 pb-safe backdrop-blur-md sm:sticky sm:-mx-6 sm:mt-8 sm:px-6",
          ownsScreen
            ? "fixed inset-x-0 bottom-0"
            /* Embedded on the homepage the site-wide Call/Text bar (54px,
               z-100) also owns the bottom edge, and it wins on z-index - it
               sat directly on top of Continue. An IntersectionObserver was
               meant to hide it and never fired, which is a race worth not
               depending on. Resting above it is deterministic and leaves both
               bars usable. */
            : "sticky bottom-[60px] sm:bottom-0 -mx-4 mt-8",
        )}
        data-testid="wizard-sticky-nav"
      >
      {hint ? (
        <p className="mb-2 text-center text-label text-inverse-muted">{hint}</p>
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
            <span>{backLabel}</span>
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
          className="min-h-12 flex-1 px-6 text-body"
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
    </>
  );
}
