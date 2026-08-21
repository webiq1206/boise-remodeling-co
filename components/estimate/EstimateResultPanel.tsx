"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Circle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EstimateResult, ProjectType } from "@/shared/estimateEngine";
import { INCLUDED_SCOPE_NOTE, APPLIANCE_DISCLAIMER, formatPlanningCurrency } from "@/shared/estimateEngine";

const ANIM_DURATION = 320;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up to `value` from whatever is currently shown. The animation depends
 * ONLY on the target value, so unrelated re-renders never interrupt or freeze
 * it. An interrupting value change picks up smoothly from the live displayed
 * number, and the tween always settles exactly on the target.
 */
export function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / ANIM_DURATION);
      if (t >= 1) {
        displayRef.current = to;
        setDisplay(to);
        rafRef.current = null;
        return;
      }
      const next = Math.round(from + (to - from) * easeOutCubic(t));
      displayRef.current = next;
      setDisplay(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value]);

  return (
    <span className="brc-display-num tabular-nums">{formatPlanningCurrency(display)}</span>
  );
}

/**
 * Collapsible "what's included" scope. Collapsed by default so the panel fits
 * the viewport without scrolling; the full scope is one tap away.
 */
function IncludedSection({ included, project }: { included: string[]; project?: ProjectType | null }) {
  const [open, setOpen] = useState(false);
  const panelId = "estimate-included-panel";

  return (
    <div data-testid="typically-included-section">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
        data-testid="button-toggle-scope"
      >
        <span className="text-label font-normal text-inverse-foreground/90">
          What&apos;s typically included{" "}
          <span className="text-inverse-muted">({included.length})</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-inverse-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div id={panelId} className="pt-2">
          <div className="space-y-1.5 mb-2">
            {included.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs leading-snug text-inverse-muted"
                data-testid={`included-item-${i}`}
              >
                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-inverse-muted" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-label leading-relaxed text-inverse-muted">{INCLUDED_SCOPE_NOTE}</p>
          {project === "kitchen" && (
            <p
              className="text-label leading-relaxed text-inverse-muted mt-1.5"
              data-testid="appliance-disclaimer"
            >
              {APPLIANCE_DISCLAIMER}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export interface EstimateProgress {
  project: boolean;
  finish: boolean;
  size: boolean;
}

function ProgressChecklist({ progress }: { progress: EstimateProgress }) {
  const items: { label: string; done: boolean }[] = [
    { label: "Choose your project", done: progress.project },
    { label: "Pick a finish level", done: progress.finish },
    { label: "Set the size", done: progress.size },
  ];

  return (
    <div className="space-y-2.5 mb-5" data-testid="estimate-progress-checklist">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-2.5 text-sm",
            item.done ? "text-inverse-foreground" : "text-inverse-muted/70"
          )}
        >
          {item.done ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/30 flex-shrink-0">
              <Check className="h-3 w-3 text-inverse-foreground" />
            </span>
          ) : (
            <Circle className="h-5 w-5 flex-shrink-0 text-inverse-muted/40" strokeWidth={1.25} />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}

export interface EstimateResultPanelProps {
  /** Null until the user has made all required selections. */
  result: EstimateResult | null;
  selectionSummary: string;
  onBookVisit: () => void;
  project?: ProjectType | null;
  progress: EstimateProgress;
  className?: string;
}

export function EstimateResultPanel({
  result,
  selectionSummary,
  onBookVisit,
  project,
  progress,
  className,
}: EstimateResultPanelProps) {
  const [legalOpen, setLegalOpen] = useState(false);
  const rangeAnnouncement = result
    ? `${formatPlanningCurrency(result.priceLow)} to ${formatPlanningCurrency(result.priceHigh)} planning range`
    : "Make your selections to see your planning range";

  return (
    <div
      className={cn(
        "rounded-sm bg-inverse text-inverse-foreground shadow-xl p-6 sm:p-7",
        className
      )}
      data-testid="estimate-result-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="brc-label text-inverse-muted">Planning range</div>
        {result && (
          <div className="text-caption tracking-wide uppercase px-2 py-1 rounded-sm bg-inverse-foreground/15 text-inverse-foreground/90">
            {result.confidenceLabel}
          </div>
        )}
      </div>

      {result ? (
        <>
          <p className="text-xs mb-2 text-inverse-muted">{selectionSummary}</p>

          <div
            className="leading-none text-inverse-foreground text-[clamp(28px,3.4vw,42px)] mb-3"
            data-testid="estimate-range"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">{rangeAnnouncement}</span>
            <AnimatedPrice value={result.priceLow} />
            <span aria-hidden="true"> to </span>
            <AnimatedPrice value={result.priceHigh} />
          </div>

          <p className="text-label text-inverse-muted mb-4">
            Based only on your selections. Your exact investment is confirmed at your free in-home
            visit.
          </p>

          {/* Precision meter: the more detail provided, the tighter the range.
              Doubles as a nudge to answer the optional questions. */}
          <div className="mb-4">
            <div className="flex justify-between text-label mb-1.5 text-inverse-muted">
              <span>Estimate precision</span>
              <span>{result.confidencePercent}%</span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden bg-inverse-foreground/15"
              role="progressbar"
              aria-valuenow={result.confidencePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Estimate precision"
            >
              <div
                className="h-full rounded-full transition-all duration-500 bg-inverse-foreground/50"
                style={{ width: `${result.confidencePercent}%` }}
              />
            </div>
            <p className="text-label text-inverse-muted mt-1.5">
              {result.confidencePercent >= 85
                ? "Fully detailed - this is your tightest planning range."
                : "Add optional details to tighten this range."}
            </p>
          </div>

          <div className="border-y border-inverse-foreground/10 py-3 mb-4">
            <IncludedSection included={result.included} project={project} />
          </div>

          <Button
            variant="brand"
            onClick={onBookVisit}
            className="w-full mb-2"
            data-testid="button-book-visit"
          >
            Schedule a free visit
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-label text-center text-inverse-muted mb-2">
            Free 60 to 90 min in-home visit. No obligation.
          </p>

          <button
            type="button"
            onClick={() => setLegalOpen((prev) => !prev)}
            aria-expanded={legalOpen}
            aria-controls="estimate-legal-note"
            className="flex w-full items-center justify-center gap-1 text-label text-inverse-muted/80 hover:text-inverse-muted"
          >
            Why a range, not a fixed price?
            <ChevronDown className={cn("h-3 w-3 transition-transform", legalOpen && "rotate-180")} />
          </button>
          {legalOpen && (
            <p
              id="estimate-legal-note"
              className="text-label leading-relaxed text-inverse-muted mt-2"
            >
              This estimate is for planning purposes only. It is not a proposal, bid, or guaranteed
              project cost. Ranges reflect market conditions, project type, size, location, finish
              level, and other assumptions. Your consultation delivers a detailed evaluation
              tailored to your home.
            </p>
          )}
        </>
      ) : (
        <>
          <div
            className="leading-none text-inverse-muted/50 text-[clamp(28px,3.4vw,42px)] mb-4"
            data-testid="estimate-range-placeholder"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">{rangeAnnouncement}</span>
            <span aria-hidden="true" className="brc-display-num">
              $ - to -
            </span>
          </div>

          <p className="text-sm leading-relaxed text-inverse-muted mb-5">
            Nothing is pre-selected. Your planning range appears the moment you finish these three
            quick choices - it reflects only what you tell us.
          </p>

          <ProgressChecklist progress={progress} />

          <p className="text-label leading-relaxed text-inverse-muted border-t border-inverse-foreground/10 pt-4">
            Takes about 60 seconds. Planning estimate only, not a binding quote - final pricing
            requires an in-home evaluation.
          </p>
        </>
      )}
    </div>
  );
}
