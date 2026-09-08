import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { SESSION_ID_RE, recordCallbackRequest } from "@/server/services/estimatorSessions";

export const dynamic = "force-dynamic";

/**
 * "Call me back instead" from the abandonment prompt. Stores the request on the
 * visitor's session and notifies staff through the same recipients as a lead.
 * Retry-safe: repeating the request for one session never sends twice.
 */
const schema = z.object({
  sessionId: z.string().regex(SESSION_ID_RE),
  flow: z.string().min(1).max(40),
  phone: z.string().min(7).max(30),
  name: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
  pagePath: z.string().max(400).optional(),
  device: z.enum(["phone", "tablet", "desktop"]).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKeyFrom(request.headers, "recovery-callback"), 6, 15 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited", message: "Too many requests. Please call us instead." }, { status: 429 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_payload", message: "Please enter a valid phone number." }, { status: 400 });
  const digits = parsed.data.phone.replace(/\D/g, "");
  if (digits.length < 10) return NextResponse.json({ ok: false, error: "invalid_phone", message: "Please enter a 10-digit phone number." }, { status: 400 });
  const result = await recordCallbackRequest({ ...parsed.data, phone: digits });
  if (!result.stored) {
    return NextResponse.json({ ok: false, error: result.error ?? "persistence_failed", message: "We could not save your request. Please call us directly." }, { status: 503 });
  }
  // Stored is what matters to the visitor; a failed email is retried by the sweep and logged.
  return NextResponse.json({ ok: true, notified: result.notified });
}
