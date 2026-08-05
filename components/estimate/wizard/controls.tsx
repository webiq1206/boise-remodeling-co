"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════
   OPTION CARD
   Large, thumb-friendly selectable card. Selected state never relies on colour
   alone: a border, a ring, and a checkmark all change together.
══════════════════════════════════════════════════════════════════════ */

export interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  /** "radio" (single choice) or "checkbox" (multi). Affects the marker + ARIA. */
  mode?: "radio" | "checkbox";
  /** Layout: "row" (icon left) or "tile" (stacked, centered). */
  layout?: "row" | "tile";
  testId?: string;
  className?: string;
}

export function OptionCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  mode = "radio",
  layout = "row",
  testId,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      role={mode === "radio" ? "radio" : "checkbox"}
      aria-checked={selected}
      className={cn(
        "relative rounded-md border text-left transition-all duration-200 min-h-[56px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible focus-visible:ring-offset-2 focus-visible:ring-offset-inverse",
        selected
          ? "border-accent-legible bg-accent/10 ring-2 ring-accent-legible/25"
          : "border-accent-legible/30 bg-inverse-foreground/[0.07] hover:border-accent-legible/55 hover:bg-inverse-foreground/[0.11] hover-elevate",
        layout === "row" ? "flex items-center gap-3 px-4 py-3.5" : "flex flex-col items-center justify-center gap-2 px-3 py-4 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0",
            selected ? "text-accent-legible" : "text-inverse-muted",
            layout === "row" && "mt-0.5",
          )}
          aria-hidden="true"
        />
      ) : null}

      <span className={cn("min-w-0", layout === "row" && "flex-1 pr-6")}>
        <span className="block text-[15px] text-inverse-foreground leading-tight">{title}</span>
        {subtitle ? (
          <span className="mt-1 block text-[12.5px] text-inverse-muted leading-snug">{subtitle}</span>
        ) : null}
      </span>

      <span
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
          layout === "row" ? "absolute right-3 top-1/2 -translate-y-1/2" : "absolute right-2.5 top-2.5",
          selected ? "border-accent-legible bg-accent-legible" : "border-inverse-foreground/30 bg-transparent",
        )}
        aria-hidden="true"
      >
        {selected ? <Check className="h-3 w-3 text-inverse" /> : null}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CHOICE GRID
   Consistent responsive grid wrapper for cards, with an accessible group role.
══════════════════════════════════════════════════════════════════════ */

export function ChoiceGrid({
  label,
  columns = 2,
  multi = false,
  children,
  className,
}: {
  label: string;
  columns?: 1 | 2 | 3 | 4;
  multi?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const cols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };
  return (
    <div
      role={multi ? "group" : "radiogroup"}
      aria-label={label}
      className={cn("grid gap-2.5", cols[columns], className)}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SEGMENTED CONTROL
   For a small set of visible choices (never a dropdown). Each segment is a
   full-height touch target.
══════════════════════════════════════════════════════════════════════ */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
  testIdPrefix,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | 4;
  testIdPrefix?: string;
}) {
  const cols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", cols[columns])}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            data-testid={testIdPrefix ? `${testIdPrefix}-${opt.value}` : undefined}
            className={cn(
              "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2.5 text-center transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-legible focus-visible:ring-offset-2 focus-visible:ring-offset-inverse",
              active
                ? "border-accent-legible bg-accent/10 ring-2 ring-accent-legible/25 text-inverse-foreground"
                : "border-accent-legible/30 bg-inverse-foreground/[0.07] text-inverse-muted hover:border-accent-legible/55 hover:text-inverse-foreground hover-elevate",
            )}
          >
            <span className="text-[14px] leading-tight text-inverse-foreground">{opt.label}</span>
            {opt.sub ? <span className="text-[11.5px] leading-tight text-inverse-muted">{opt.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   QUANTITY STEPPER
   Minus / value / plus, each a 44px target, with a keyboard-focusable value.
══════════════════════════════════════════════════════════════════════ */

export function QuantityStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  unit,
  testId,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  testId?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-accent-legible/40 bg-inverse-foreground/[0.07] text-inverse-foreground disabled:opacity-40 hover:border-accent-legible/70 hover-elevate"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-[3ch] text-center text-[18px] tabular-nums text-inverse-foreground"
        role="status"
        aria-live="polite"
      >
        {value}
        {unit ? <span className="ml-1 text-[12px] text-inverse-muted">{unit}</span> : null}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-accent-legible/40 bg-inverse-foreground/[0.07] text-inverse-foreground disabled:opacity-40 hover:border-accent-legible/70 hover-elevate"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TEXT FIELD
   16px font so iOS never zooms on focus, 44px min height, visible label,
   accessible required marker, inline error.
══════════════════════════════════════════════════════════════════════ */

export interface TextFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  optionalHint?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  help?: string;
  testId?: string;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  optionalHint = false,
  placeholder,
  autoComplete,
  inputMode,
  error,
  help,
  testId,
}: TextFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const errId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] text-inverse-muted">
        <span>
          {label}
          {required ? <span className="text-accent-legible"> *</span> : null}
        </span>
        {optionalHint && !required ? <span className="text-inverse-muted/70">Optional</span> : null}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error ? errId : undefined, help ? helpId : undefined) || undefined}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className={cn(
          "w-full min-h-11 rounded-md border bg-inverse-foreground/5 px-3 text-[16px] text-inverse-foreground placeholder:text-inverse-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-legible",
          error ? "border-destructive/70" : "border-inverse-foreground/25",
        )}
      />
      {help && !error ? (
        <p id={helpId} className="mt-1.5 text-[12px] text-inverse-muted leading-relaxed">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="mt-1.5 text-[12.5px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
