/**
 * Structured alerts for pricing anomalies.
 *
 * Pricing accuracy is the one thing this site cannot silently get wrong, so
 * anything suspicious - a client/server recompute mismatch, an estimate that
 * could not be resolved, a clamped quantity, a zero or implausibly large
 * total - is logged in one grep-able shape instead of scattered console.warn
 * noise, and flagged on the CRM record via the passthrough `estimate` object
 * so a human reviewing the lead sees that something needed attention.
 *
 * Deliberately fire-and-forget and dependency-free: an alert must never be
 * able to break the lead flow it is reporting on.
 */

export type PricingAlertKind =
  | "recompute-mismatch"
  | "estimate-unresolvable"
  | "quantity-clamped"
  | "zero-total"
  | "implausible-total";

/** Above this, a quote is more likely a bug or an attack than a remodel. */
export const IMPLAUSIBLE_QUOTE_CEILING = 2_000_000;

export function logPricingAlert(
  kind: PricingAlertKind,
  detail: Record<string, unknown>,
): void {
  try {
    console.error(`[pricing-alert] ${kind}`, JSON.stringify(detail));
  } catch {
    console.error(`[pricing-alert] ${kind}`);
  }
}
