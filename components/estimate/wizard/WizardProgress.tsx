"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStepMeta {
  id: string;
  /** Short label shown in the stepper, e.g. "Finish level". */
  label: string;
  /** Optional grouping shown above the label, e.g. "Your project". */
  section?: string;
}

export interface WizardProgressProps {
  steps: WizardStepMeta[];
  /** Zero-based index of the current step. */
  currentIndex: number;
  className?: string;
}

/**
 * Dynamic progress indicator shared by both estimators.
 *
 * It never shows a bare "Step 3": the current step's own purpose is always
 * named next to the count, and the number of steps is derived from the caller's
 * `steps` array, so a flow that grows or shrinks with the user's answers stays
 * honest about how much is left.
 */
export function WizardProgress({ steps, currentIndex, className }: WizardProgressProps) {
  const total = steps.length;
  const clamped = Math.max(0, Math.min(currentIndex, total - 1));
  const current = steps[clamped];
  const percent = total > 1 ? Math.round((clamped / (total - 1)) * 100) : 100;

  return (
    <div className={cn("mb-6", className)} data-testid="wizard-progress">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] tracking-[0.12em] uppercase text-inverse-muted">
          Step <span className="text-inverse-foreground">{clamped + 1}</span> of {total}
          {current?.section ? (
            <>
              <span className="mx-2 text-inverse-muted/40" aria-hidden="true">
                /
              </span>
              <span className="text-accent-legible">{current.section}</span>
            </>
          ) : null}
        </p>
        <p className="text-[12px] text-inverse-muted tabular-nums" aria-hidden="true">
          {percent}%
        </p>
      </div>

      <p className="mt-1 text-[13.5px] text-inverse-foreground/90 leading-snug">
        {current?.label}
      </p>

      {/* Segmented bar. Each segment is a completed / current / upcoming state,
          so the indicator does not rely on colour alone (a check marks done). */}
      <ol
        className="mt-3 flex items-center gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={clamped + 1}
        aria-label={`Step ${clamped + 1} of ${total}: ${current?.label ?? ""}`}
      >
        {steps.map((step, i) => {
          const state = i < clamped ? "done" : i === clamped ? "current" : "upcoming";
          return (
            <li key={step.id} className="flex-1">
              <span
                className={cn(
                  "flex h-1.5 w-full items-center justify-center rounded-full transition-colors",
                  state === "done" && "bg-accent-legible",
                  state === "current" && "bg-accent-legible/70",
                  state === "upcoming" && "bg-inverse-foreground/15",
                )}
              >
                <span className="sr-only">
                  {step.label}
                  {state === "done" ? " (done)" : state === "current" ? " (current)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * A single completed-step chip used by the compact review header. Kept here so
 * both wizards render the "done" affordance identically.
 */
export function StepDoneChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-legible/30 bg-accent-legible/10 px-2.5 py-1 text-[12px] text-inverse-foreground">
      <Check className="h-3 w-3 text-accent-legible" aria-hidden="true" />
      {label}
    </span>
  );
}
