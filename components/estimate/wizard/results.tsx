"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ══════════════════════════════════════════════════════════════════════
   REVIEW (before submission)
   Each section groups related answers and carries an Edit action that jumps
   straight back to the relevant step without losing anything else.
══════════════════════════════════════════════════════════════════════ */

export interface ReviewItem {
  label: string;
  value: React.ReactNode;
}

export function ReviewSection({
  title,
  items,
  onEdit,
  editLabel = "Edit",
  testId,
  compact = false,
}: {
  title: string;
  items: ReviewItem[];
  onEdit?: () => void;
  editLabel?: string;
  testId?: string;
  /**
   * One-screen review: a single hairline row per section - title, the values
   * joined on one line, Edit - instead of a padded card. Eight cards ran 250px
   * past a phone's frame body; eight rows fit with room to spare.
   */
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  if (compact) {
    return (
      <section
        className="flex items-center justify-between gap-3 border-b border-inverse-foreground/12 py-1.5"
        data-testid={testId}
      >
        <div className="min-w-0">
          <p className="text-[0.625rem] uppercase tracking-[0.16em] text-inverse-muted">{title}</p>
          <p className="truncate text-[0.875rem] text-inverse-foreground">
            {items.map((item, i) => (
              <span key={i}>
                {i > 0 ? <span className="text-inverse-muted/60"> · </span> : null}
                {item.value}
              </span>
            ))}
          </p>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            data-testid={testId ? `${testId}-edit` : undefined}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] text-accent-legible underline underline-offset-4 hover:text-inverse-foreground"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {editLabel}
          </button>
        ) : null}
      </section>
    );
  }
  return (
    <section
      className="rounded-md border border-inverse-foreground/15 bg-inverse-foreground/[0.05] p-4"
      data-testid={testId}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-body-sm tracking-[0.06em] uppercase text-inverse-foreground">{title}</h3>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            data-testid={testId ? `${testId}-edit` : undefined}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-body-sm text-accent-legible underline underline-offset-4 hover:text-inverse-foreground"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {editLabel}
          </button>
        ) : null}
      </div>
      <dl className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4 text-body">
            <dt className="text-inverse-muted">{item.label}</dt>
            <dd className="text-right text-inverse-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   RESULTS
══════════════════════════════════════════════════════════════════════ */

export function ResultCard({
  title,
  icon: Icon,
  children,
  className,
  testId,
}: {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      className={cn("rounded-md border border-inverse-foreground/15 bg-inverse-foreground/[0.05] p-4 sm:p-5", className)}
      data-testid={testId}
    >
      {title ? (
        <h3 className="mb-3 flex items-center gap-2 text-body-sm tracking-[0.06em] uppercase text-inverse-foreground">
          {Icon ? <Icon className="h-4 w-4 text-accent-legible" aria-hidden="true" /> : null}
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The estimate overview: a prominent number that does not overpower the
 * category and status shown beside it.
 */
export function PriceHeadline({
  label,
  price,
  category,
  statusChips,
  testId = "estimate-headline",
}: {
  label: string;
  price: React.ReactNode;
  category?: string;
  statusChips?: { label: string; tone?: "accent" | "muted" }[];
  testId?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-label tracking-[0.14em] uppercase text-inverse-muted">{label}</p>
        {statusChips?.map((chip) => (
          <span
            key={chip.label}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-label tracking-wide",
              chip.tone === "muted"
                ? "bg-inverse-foreground/12 text-inverse-foreground/85"
                : "bg-accent-legible/20 text-inverse-foreground",
            )}
          >
            {chip.label}
          </span>
        ))}
      </div>
      <div
        className="mt-2 brc-display-num tabular-nums leading-none text-inverse-foreground text-[clamp(30px,8vw,52px)]"
        data-testid={testId}
      >
        {price}
      </div>
      {category ? <p className="mt-2 text-body text-inverse-muted">{category}</p> : null}
    </div>
  );
}

/**
 * The reassuring scope-editing call to action. The preferred wording is fixed
 * by the brief; only the handler and an optional variant differ.
 */
export function EditScopeCta({
  onClick,
  testId = "edit-scope-cta",
  className,
}: {
  onClick: () => void;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "group flex w-full items-center justify-center gap-2 rounded-md border border-accent-legible/40 bg-inverse-foreground/[0.06] px-4 py-3 text-center min-h-12 text-body text-inverse-foreground transition-colors hover:border-accent-legible/70 hover:bg-inverse-foreground/[0.1]",
        className,
      )}
    >
      <Pencil className="h-4 w-4 text-accent-legible" aria-hidden="true" />
      <span>
        <span className="text-inverse-muted">Not what you expected? </span>
        <span className="font-medium underline underline-offset-4 decoration-accent-legible/60">
          Edit Your Project Scope
        </span>
      </span>
    </button>
  );
}

/** Plain-language list used for assumptions, exclusions, and pricing notes. */
export function DetailList({
  items,
  marker = "bullet",
}: {
  items: React.ReactNode[];
  marker?: "bullet" | "cross" | "none";
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-body-sm text-inverse-muted leading-relaxed">
          {marker !== "none" ? (
            <span
              className={cn(
                "mt-1.5 flex-shrink-0 rounded-full",
                marker === "cross" ? "h-1.5 w-1.5 bg-inverse-muted/60" : "h-1.5 w-1.5 bg-accent-legible/70",
              )}
              aria-hidden="true"
            />
          ) : null}
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Collapsible container for secondary result detail, collapsed by default. */
export function ResultDisclosure({
  title,
  count,
  defaultOpen = false,
  children,
  testId,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-inverse-foreground/15 bg-inverse-foreground/[0.05]" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left min-h-12"
      >
        <span className="text-body-sm tracking-[0.06em] uppercase text-inverse-foreground">
          {title}
          {typeof count === "number" ? <span className="ml-1.5 text-inverse-muted">({count})</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-inverse-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STICKY RESULT ACTIONS
   Primary next step stays reachable while the user reads the estimate. The
   scope-editing action sits beside it; light secondary actions never crowd
   the primary.
══════════════════════════════════════════════════════════════════════ */

export interface ResultSecondaryAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  testId?: string;
}

export function StickyResultActions({
  primaryLabel,
  onPrimary,
  onEditScope,
  secondary = [],
  primaryTestId = "result-primary",
  inFrame = false,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onEditScope: () => void;
  secondary?: ResultSecondaryAction[];
  primaryTestId?: string;
  /** Inside the one-screen AppFrame the frame footer is the bottom edge: render in flow. */
  inFrame?: boolean;
}) {
  return (
    <div
      className={
        inFrame
          ? "pt-1"
          : "sticky bottom-0 z-30 -mx-4 mt-8 border-t border-inverse-foreground/12 bg-inverse/95 px-4 pt-3 pb-safe backdrop-blur-md sm:-mx-6 sm:px-6"
      }
      data-testid="result-sticky-actions"
    >
      <EditScopeCta onClick={onEditScope} className="mb-2.5" />
      <Button
        type="button"
        variant="brand"
        onClick={onPrimary}
        className="min-h-12 w-full text-body"
        data-testid={primaryTestId}
      >
        {primaryLabel}
      </Button>
      {secondary.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0 pb-2 pt-1">
          {secondary.map((action, i) => (
            <span key={action.label} className="flex items-center">
              {i > 0 ? <span className="px-1 text-inverse-muted/40" aria-hidden="true">/</span> : null}
              <button
                type="button"
                onClick={action.onClick}
                data-testid={action.testId}
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-body-sm text-inverse-muted hover:text-inverse-foreground"
              >
                {action.icon ? <action.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {action.label}
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="pb-2" />
      )}
    </div>
  );
}
