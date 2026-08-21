import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge has to be TOLD about custom font sizes, or it silently eats
 * text colours.
 *
 * FOUND IN THE BROWSER, NOT IN REVIEW. The wizard's Continue button rendered
 * as a blank cream bar: cream text on a cream background, contrast 1:1, the
 * label invisible in its disabled state. The cause is that twMerge groups
 * every `text-*` class together unless it can classify it. `text-[13.5px]` is
 * unambiguously a size, so the old arbitrary values were safe - but a NAMED
 * size like `text-body` looks exactly like a colour to the merger, so
 * `cn("... text-primary-foreground", "text-body")` dropped the colour as a
 * conflict and left the button inheriting the section's cream.
 *
 * Registering the scale here is what makes the named sizes safe to use
 * anywhere. Anything added to `fontSize` in tailwind.config.ts belongs in
 * this list too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "label",
            "body-sm",
            "body",
            "body-lg",
            "title-sm",
            "title",
            "display",
            "section-title",
            "section-title-lg",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safe);
}

export function formatCurrencyWhole(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatCurrencyRangeWhole(min: number, max: number): string {
  return `${formatCurrencyWhole(min)} - ${formatCurrencyWhole(max)}`;
}

// Quote calculation utilities
export function roundUpToNearest5(value: number): number {
  if (!value || value <= 0 || isNaN(value)) {
    return 0;
  }
  return Math.ceil(value / 5) * 5;
}

export function roundDownToNearest5(value: number): number {
  if (!value || value <= 0 || isNaN(value)) {
    return 0;
  }
  return Math.floor(value / 5) * 5;
}

function parseQuoteNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(numValue) && numValue > 0 ? numValue : 0;
}

export function calculateQuoteRange(value: string | number | null | undefined, percent: number = 0.15): {
  point: number;
  min: number;
  max: number;
} {
  const base = parseQuoteNumber(value);
  const pct = Number.isFinite(percent) ? Math.min(0.5, Math.max(0, percent)) : 0.15;

  if (base <= 0) {
    return { point: 0, min: 0, max: 0 };
  }

  const point = roundUpToNearest5(base);
  const rawMin = base * (1 - pct);
  const rawMax = base * (1 + pct);
  const min = roundDownToNearest5(rawMin);
  const max = roundUpToNearest5(rawMax);

  if (max <= min) {
    return { point, min: Math.max(0, min), max: Math.max(min + 5, max) };
  }

  return { point, min: Math.max(0, min), max: Math.max(0, max) };
}

export function formatQuoteRangeWholeFromValue(value: string | number | null | undefined, percent: number = 0.15): string {
  const { min, max } = calculateQuoteRange(value, percent);
  if (min === 0 && max === 0) return formatCurrencyWhole(0);
  return formatCurrencyRangeWhole(min, max);
}
