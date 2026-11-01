import crypto from "crypto";

/**
 * The short-lived key that lets the same browser add to the request it just sent.
 *
 * Step 1 of the short request (components/approved/HeroConversion) returns the request id and
 * this token. The optional "Help us prepare" step and the file uploads post both back, and the
 * server only touches that one stored lead if the token is genuine and unexpired. Nothing in it is
 * secret to the visitor: it names the request and when the window closes, signed with
 * SESSION_SECRET (the secret this site already signs sessions and edit links with) under a
 * purpose prefix, so a signature made for anything else can never be replayed here.
 */

export const REQUEST_DETAILS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
const PURPOSE = "brc-request-details:v1";

function secret(): string | null {
  const value = process.env.SESSION_SECRET;
  return value && value.length >= 16 ? value : null;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Buffer {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(body: string, key: string): Buffer {
  return crypto.createHmac("sha256", key).update(`${PURPOSE}|${body}`).digest();
}

/** Null when the server has no signing secret: the lead still stands, step 2 is simply not offered. */
export function issueRequestDetailsToken(requestId: string, nowMs = Date.now()): string | null {
  const key = secret();
  if (!key || !requestId || requestId.includes("|")) return null;
  const exp = Math.floor(nowMs / 1000) + REQUEST_DETAILS_TOKEN_TTL_SECONDS;
  const body = `${requestId}|${exp}`;
  return `${b64url(Buffer.from(body))}.${b64url(sign(body, key))}`;
}

export type RequestTokenCheck = { ok: true } | { ok: false; reason: "missing" | "invalid" | "expired" | "mismatch" };

export function verifyRequestDetailsToken(
  requestId: string,
  token: string,
  nowMs = Date.now(),
): RequestTokenCheck {
  const key = secret();
  if (!key || !token || !requestId) return { ok: false, reason: "missing" };
  try {
    const [bodyPart, sigPart, extra] = token.split(".");
    if (!bodyPart || !sigPart || extra !== undefined) return { ok: false, reason: "invalid" };
    const body = fromB64url(bodyPart).toString("utf8");
    const expected = sign(body, key);
    const provided = fromB64url(sigPart);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return { ok: false, reason: "invalid" };
    }
    const [id, expText] = body.split("|");
    const exp = Number(expText);
    if (!id || !Number.isFinite(exp)) return { ok: false, reason: "invalid" };
    if (id !== requestId) return { ok: false, reason: "mismatch" };
    if (exp < Math.floor(nowMs / 1000)) return { ok: false, reason: "expired" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
