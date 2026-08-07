import { createHmac, timingSafeEqual } from "crypto";

/**
 * The two structural guarantees behind the assistant's pricing accuracy.
 *
 * 1. GROUNDING. Every dollar figure in an assistant reply must be a number
 *    some pricing tool actually returned in this conversation (or a number
 *    the customer themselves typed - their own budget is theirs to repeat).
 *    This is enforced by scanning the final text, not requested in the
 *    prompt: a model that invents "$45,000" gets its reply rejected before
 *    the customer sees it, however confidently it was phrased.
 *
 * 2. TRANSCRIPT INTEGRITY. The route is stateless; the client stores the
 *    conversation and posts it back. Unsigned, that would let a crafted
 *    client feed the model a fabricated history in which "the assistant"
 *    already promised any price it liked. So the server signs what it hands
 *    out and only accepts back what it signed. A transcript that fails the
 *    check starts the conversation over - it is not an error worth trusting
 *    with details.
 */

const DOLLAR_PATTERN = /\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?[kK]\b)?/g;

/** Every dollar amount in a piece of text, normalised to whole dollars. */
export function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(DOLLAR_PATTERN)) {
    let value = Number(match[1].replace(/,/g, ""));
    if (match[2]) value *= 1000;
    if (Number.isFinite(value)) amounts.push(Math.round(value));
  }
  return amounts;
}

/**
 * Dollar figures in `reply` that appear in no allowlist.
 *
 * Exact integers only - the engines return whole dollars and the assistant
 * is told to repeat them verbatim. A "rounded for conversation" tolerance
 * would be a hole: $12,400 stated as "$12,000" is a different number, and
 * different numbers are exactly what this exists to stop.
 */
export function findUngroundedPrices(reply: string, allowed: Iterable<number>): number[] {
  const allowedSet = new Set<number>();
  for (const n of allowed) allowedSet.add(Math.round(n));
  return extractDollarAmounts(reply).filter((n) => !allowedSet.has(n));
}

/**
 * Signing secret. SESSION_SECRET is required in production (auth already
 * refuses to run without it); the dev fallback only weakens dev, where the
 * transcript protects nothing real.
 */
function signingSecret(): string {
  return process.env.SESSION_SECRET || "assistant-dev-only-secret";
}

export function signTranscript(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function verifyTranscript(payload: string, signature: string): boolean {
  const expected = signTranscript(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
