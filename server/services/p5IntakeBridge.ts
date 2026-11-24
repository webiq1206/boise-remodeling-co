/**
 * Bridge from an accepted Remodel consultation to the multi-brand intake on
 * p5homeco.com.
 *
 * That route already creates the HubSpot contact, the mapped deal, and the
 * fail-open lead_created notice (p5 tip 8a33b28c). This repo must not take a
 * HubSpot dependency or a portal token. A bridge failure is logged and never
 * thrown, so the visitor response, the local save, the customer's email and
 * the BRC dashboard forward stay independent of it.
 *
 * One team email per request (owner, 17 November 2026). Every post asks p5 to
 * confirm its own team email (team_alert "confirm") and carries two sets of
 * lines this site's team email has that the p5 body does not. team_notes:
 * what the visitor was shown and priced at, never a cost or margin, because a
 * p5 email that carries only these is a "New lead" email and is copied into
 * HubSpot. team_internal_notes: our cost, margin and pricing checks for a
 * planning range. When any are sent, p5 uses the subject "Lead and pricing"
 * instead, which its inbox sync does not copy into HubSpot. A request with a
 * planning range also carries `estimate`: the range and the customer's price
 * by trade as figures, from which p5 creates the QuickBooks customer and an
 * UNSENT estimate (owner, 13 and 17 November 2026). Customer amounts only.
 * The answer's
 * `alert` comes back as the bridge result, and the caller sends this site's
 * own team email only when p5 did not confirm (see teamEmailFallback.ts).
 * Only the TEAM email waits for that result, inside after(); the visitor
 * response and the customer's email never do.
 *
 * Project strings are rewritten only when p5 already accepts them: either as
 * a HUBSPOT_PROJECT_TYPES value or as a PROJECT_TYPE_ALIASES key. Unknown
 * visitor labels are forwarded unchanged so p5 can omit p5_project_type
 * instead of rejecting the deal.
 *
 * Quote form v2 contract (owned by p5, 1 November 2026). Optional extras in
 * the same forgiving body: request_kind, contact_preference, best_time,
 * files [{name, url, contentType, size}], external_id (stable across step 1
 * and step 2) and submission_kind ("initial" | "details"). A "details" post
 * with the same brand + external_id merges into the existing deal. An intake
 * that predates the contract ignores the extras, and because the details post
 * also repeats externalLeadId, it files that post as a repeat submission on
 * the same deal (an activity note) rather than a second deal.
 */

export const P5_INTAKE_URL = "https://p5homeco.com/api/leads/intake";

/** Exact BRANDS entry on the p5 intake. Matches SITE_CONFIG.name. */
export const P5_REMODEL_BRAND = "Boise Remodeling Co";

export const P5_CONSULTATION_FORM = "Remodeling consultation";

/**
 * In confirm mode p5 answers only after HubSpot and its mail server, which can
 * take about 25 seconds. The visitor never waits on this: it runs in after().
 */
export const P5_INTAKE_TIMEOUT_MS = 30_000;

/** The p5 contract for team_notes: at most 40 plain single lines of at most 300 characters. */
export const TEAM_NOTES_MAX_LINES = 40;
export const TEAM_NOTE_MAX_LENGTH = 300;

/** The p5 contract for team_internal_notes: at most 60 lines, each within TEAM_NOTE_MAX_LENGTH. */
export const TEAM_INTERNAL_NOTES_MAX_LINES = 60;

/**
 * What p5 said about its own team email.
 * - "sent": its mail server accepted the email.
 * - "failed": it did not, or it was still sending when p5 answered.
 * - "none": this post produced no p5 email (an exact repeat, or details waiting for their request).
 * - "unknown": no usable answer (an older p5, an HTTP error, a timeout, a network failure).
 * Only "sent" is a confirmation.
 */
export type P5TeamAlert = "sent" | "failed" | "none" | "unknown";

export type P5BridgeResult = {
  /** p5 answered 2xx. */
  forwarded: boolean;
  alert: P5TeamAlert;
};

/**
 * Visitor project text that does not match a p5 alias or HubSpot option at
 * tip 8a33b28c. hubspotProjectType omits these, so the deal can be created
 * with a blank p5_project_type. Prove should watch for that omission.
 */
export const UNMAPPED_P5_PROJECT_TYPES = [
  "other",
  "Other / Not sure yet",
  "something-else",
  "Something else",
] as const;

/**
 * Consultation values (estimate enum, on-screen labels, and the short-form
 * home-hero label) to a string p5 will keep. Targets are HUBSPOT_PROJECT_TYPES
 * values or PROJECT_TYPE_ALIASES keys from p5 tip 8a33b28c.
 */
export const P5_PROJECT_TYPE_BY_VISITOR_LABEL: Readonly<Record<string, string>> = {
  kitchen: "kitchen",
  Kitchen: "kitchen",
  "Kitchen Remodel": "kitchen",
  "Kitchen remodel": "kitchen",

  bathroom: "bathroom",
  Bathroom: "bathroom",
  "Bathroom Remodel": "bathroom",
  "Bathroom remodel": "bathroom",

  "whole-home": "whole-home",
  "Whole-Home": "whole-home",
  "Whole-Home Remodel": "whole-home",
  "Whole-home remodel": "whole-home",

  addition: "addition",
  "Room Addition": "Home addition",
  "Home addition": "Home addition",

  adu: "adu",
  ADU: "Accessory dwelling unit (ADU)",
  "ADU / Guest House": "Accessory dwelling unit (ADU)",
  "Accessory dwelling unit (ADU)": "Accessory dwelling unit (ADU)",

  basement: "Basement finishing",
  "Basement Finishing": "Basement finishing",
  "Basement finishing": "Basement finishing",

  "Home repair or remodel": "Home repairs or handyman work",
  "Home repairs or handyman work": "Home repairs or handyman work",
};

export type ConsultationBridgeInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  projectType?: string | null;
  message?: string | null;
  inquiryId?: string | null;
  /** Short request only: a written request or "Have us call you". */
  requestKind?: "quote" | "callback" | null;
  contactPreference?: "call" | "text" | "email" | null;
  bestTime?: string | null;
  timeline?: string | null;
  files?: ReadonlyArray<{ name: string; url: string; contentType: string; size: number }> | null;
  submissionKind?: "initial" | "details";
  /**
   * `Label: value` lines p5 prints in its team email under "From the website". Only what the
   * body above does not carry, and never a cost or margin: see TEAM_NOTE_BLOCKED.
   */
  teamNotes?: ReadonlyArray<string> | null;
  /**
   * `Label: value` lines p5 prints under "Internal pricing": our cost, margin and pricing
   * checks. Internal figures go HERE and nowhere else in the body. When any are sent, p5 sends
   * its email as "Lead and pricing", which is not copied into HubSpot.
   */
  teamInternalNotes?: ReadonlyArray<string> | null;
  /**
   * The planning range as figures, so p5 can create the QuickBooks customer and an UNSENT
   * estimate. Step 1 only, and only when the request has a planning range. CUSTOMER amounts
   * only: see cleanP5Estimate.
   */
  estimate?: P5PlanningEstimate | null;
};

/** One line of the customer's price: a trade and what the customer pays for it. Never our cost. */
export type P5EstimateLine = {
  qboServiceId?: string;
  serviceCode?: string;
  unitPrice?: number;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  amount: number;
  division?: string;
};

/** The p5 contract for `estimate` (its docs/lead-intake-contract.md). Do not change it here alone. */
export type P5PlanningEstimate = {
  kind: "planning-range";
  /** The range the customer was shown. */
  low: number;
  high: number;
  label?: string;
  /** Only the boolean true, and only when this site's server recomputed the figures itself. */
  verified?: true;
  /** The one figure for QuickBooks. Omitted when lines are sent: p5 totals the lines. */
  base?: number;
  lines?: P5EstimateLine[];
};

export const P5_ESTIMATE_MAX_LINES = 60;

export type P5IntakeBody = Record<
  string,
  string | ReadonlyArray<string> | ReadonlyArray<Record<string, string | number>> | P5PlanningEstimate
>;

/**
 * Costs and margins stay out of HubSpot (owner's rule), and the p5 team email is copied into
 * HubSpot, body and all, by p5's inbox sync. So a team note must never carry a cost, margin,
 * markup, profit, contingency or overhead figure. The builders leave those figures out; this is
 * the wall behind them: a line that so much as names one of those words does not leave this
 * site. p5 drops such lines too. Do not reword a line to get past this. Leave the figure out.
 */
export const TEAM_NOTE_BLOCKED = /cost|margin|mark-?up|profit|contingenc|overhead/i;

/**
 * Plain single lines within the p5 limits, with no line that names a cost or margin.
 * Order is priority: lines past the limit are dropped.
 */
export function cleanTeamNotes(notes: ReadonlyArray<unknown> | null | undefined): string[] {
  const lines: string[] = [];
  for (const raw of notes ?? []) {
    if (typeof raw !== "string") continue;
    // Control characters include the line breaks: one note is one line.
    const line = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (TEAM_NOTE_BLOCKED.test(line)) continue;
    lines.push(
      line.length > TEAM_NOTE_MAX_LENGTH
        ? `${line.slice(0, TEAM_NOTE_MAX_LENGTH - 3).trimEnd()}...`
        : line,
    );
    if (lines.length === TEAM_NOTES_MAX_LINES) break;
  }
  return lines;
}

/** The id p5 dedupes and merges on. One value, sent as both the legacy and the v2 field. */
export function p5ExternalId(inquiryId: string | null | undefined): string | null {
  const id = inquiryId?.trim();
  return id ? `boiseremodeling-consultation:${id}` : null;
}

/** p5 normalizeEmail, kept local so a bad optional phone cannot 422 a good email. */
function reachableEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim() ?? "";
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** p5 normalizePhone. Returns the visitor's original text when it would be stored. */
function reachablePhone(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) {
    return digits.length >= 8 && digits.length <= 15 ? trimmed : null;
  }
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return trimmed;
}

export function p5ProjectType(visitorType: string | null | undefined): string | null {
  const trimmed = visitorType?.trim() ?? "";
  if (!trimmed) return null;
  return P5_PROJECT_TYPE_BY_VISITOR_LABEL[trimmed] ?? trimmed;
}

function composeAddress(address?: string | null, zip?: string | null): string | null {
  const street = address?.trim() ?? "";
  const postal = zip?.trim() ?? "";
  if (!street) return postal || null;
  if (!postal || street.includes(postal)) return street;
  return `${street}, ${postal}`;
}

/**
 * Plain single lines within the p5 limits for team_internal_notes. The same clean-up as
 * cleanTeamNotes, WITHOUT the blocked-word wall: this field exists to carry costs and margins,
 * and p5 keeps an email that has it out of HubSpot. Order is priority: lines past 60 are dropped.
 */
export function cleanTeamInternalNotes(notes: ReadonlyArray<unknown> | null | undefined): string[] {
  const lines: string[] = [];
  for (const raw of notes ?? []) {
    if (typeof raw !== "string") continue;
    const line = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    lines.push(
      line.length > TEAM_NOTE_MAX_LENGTH
        ? `${line.slice(0, TEAM_NOTE_MAX_LENGTH - 3).trimEnd()}...`
        : line,
    );
    if (lines.length === TEAM_INTERNAL_NOTES_MAX_LINES) break;
  }
  return lines;
}

const cents = (value: number) => Math.round(value * 100) / 100;

function estimateText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * The `estimate` p5 will book into QuickBooks, checked before it leaves this site.
 *
 * QuickBooks holds the CUSTOMER's estimate, so this carries customer amounts only. Like
 * team_notes, it has a wall behind its builder: if any text in it names a cost, margin, markup,
 * profit, contingency or overhead (TEAM_NOTE_BLOCKED), the whole estimate is withheld. Those
 * figures travel in team_internal_notes and nowhere else.
 *
 * All or nothing, because p5 totals the lines: dropping or cutting one line would book a wrong
 * total. So a bad number, a line with no title or more than 60 lines returns null, and the
 * request goes without the field. A zero-amount line is simply left out, as p5 would. Never throws.
 */
export function cleanP5Estimate(input: unknown): P5PlanningEstimate | null {
  try {
    if (!input || typeof input !== "object") return null;
    const raw = input as Record<string, unknown>;
    if (raw.kind !== "planning-range") return null;
    const { low, high } = raw;
    if (typeof low !== "number" || typeof high !== "number") return null;
    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0 || low > high) return null;

    const estimate: P5PlanningEstimate = { kind: "planning-range", low: cents(low), high: cents(high) };
    const texts: string[] = [];
    const label = estimateText(raw.label, 200);
    if (label) {
      estimate.label = label;
      texts.push(label);
    }
    if (raw.verified === true) estimate.verified = true;
    if (typeof raw.base === "number" && Number.isFinite(raw.base) && raw.base > 0) estimate.base = cents(raw.base);

    if (raw.lines !== undefined && raw.lines !== null) {
      if (!Array.isArray(raw.lines)) return null;
      const lines: P5EstimateLine[] = [];
      for (const entry of raw.lines) {
        if (!entry || typeof entry !== "object") return null;
        const item = entry as Record<string, unknown>;
        const title = estimateText(item.title, 200);
        if (!title) return null;
        if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount < 0) return null;
        const amount = cents(item.amount);
        if (amount === 0) continue;
        const line: P5EstimateLine = { title, amount };
        const ownerIds:Record<string,string>={'01-31-03':'48','01-31-04':'49','01-31-05':'47'};
        if(typeof item.serviceCode==='string'&&ownerIds[item.serviceCode]===item.qboServiceId){
          if(item.unitPrice!==120||typeof item.quantity!=='number'||Math.abs(item.quantity*120-amount)>.005)return null;
          line.serviceCode=item.serviceCode;line.qboServiceId=String(item.qboServiceId);line.unitPrice=120;
        }
        const description = estimateText(item.description, 1000);
        if (description) line.description = description;
        const division = estimateText(item.division, 80);
        if (division) line.division = division;
        if (typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0) {
          line.quantity = item.quantity;
          const unit = estimateText(item.unit, 20);
          if (unit) line.unit = unit;
        }
        texts.push(title, description, division, line.unit ?? "");
        lines.push(line);
      }
      if (lines.length > P5_ESTIMATE_MAX_LINES) return null;
      if (lines.length) estimate.lines = lines;
    }

    if (texts.some((text) => TEAM_NOTE_BLOCKED.test(text))) {
      console.error("[p5-intake] Estimate withheld: it names a cost or margin. Customer amounts only.");
      return null;
    }
    return estimate;
  } catch {
    return null;
  }
}

export function buildP5IntakeBody(input: ConsultationBridgeInput): P5IntakeBody {
  const visitorType = input.projectType?.trim() ?? "";
  const projectType = p5ProjectType(visitorType);
  const note = input.message?.trim() ?? "";
  const summaryParts: string[] = [];
  if (visitorType && projectType && projectType !== visitorType) {
    summaryParts.push(`Visitor project: ${visitorType}`);
  }
  if (note) summaryParts.push(note);

  const email = reachableEmail(input.email);
  const phone = reachablePhone(input.phone);
  const rawEmail = input.email?.trim() ?? "";
  const rawPhone = input.phone?.trim() ?? "";

  const body: P5IntakeBody = {
    brand: P5_REMODEL_BRAND,
    name: input.name.trim(),
    form: P5_CONSULTATION_FORM,
    source: "Organic Website",
    sourceDetail: "boiseremodeling.co consultation",
  };

  if (projectType) body.projectType = projectType;
  if (email) body.email = email;
  else if (!phone && rawEmail) body.email = rawEmail;
  if (phone) body.phone = phone;
  else if (!email && rawPhone) body.phone = rawPhone;

  const address = composeAddress(input.address, input.zip);
  if (address) body.address = address;
  const city = input.city?.trim();
  if (city) body.city = city;
  if (summaryParts.length) body.summary = summaryParts.join("\n\n");

  const externalId = p5ExternalId(input.inquiryId);
  if (externalId) {
    body.externalLeadId = externalId;
    body.external_id = externalId;
    body.submission_kind = input.submissionKind ?? "initial";
  }
  if (input.requestKind) body.request_kind = input.requestKind;
  if (input.contactPreference) body.contact_preference = input.contactPreference;
  const bestTime = input.bestTime?.trim();
  if (bestTime) body.best_time = bestTime;
  const timeline = input.timeline?.trim();
  if (timeline) body.timeline = timeline;
  if (input.files?.length) {
    body.files = input.files.map((file) => ({
      name: file.name,
      url: file.url,
      contentType: file.contentType,
      size: file.size,
    }));
  }
  // p5 sends its team email before it answers and reports how that went as `alert`.
  body.team_alert = "confirm";
  const teamNotes = cleanTeamNotes(input.teamNotes);
  if (teamNotes.length) body.team_notes = teamNotes;
  // Internal figures travel only in their own field, never in team_notes.
  const teamInternalNotes = cleanTeamInternalNotes(input.teamInternalNotes);
  if (teamInternalNotes.length) body.team_internal_notes = teamInternalNotes;
  // The planning range as figures, for the QuickBooks customer and unsent estimate p5 creates.
  const estimate = cleanP5Estimate(input.estimate);
  if (estimate) body.estimate = estimate;
  return body;
}

/** Anything that is not exactly one of the three contract values is "unknown". */
export function readP5TeamAlert(answer: unknown): P5TeamAlert {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return "unknown";
  const alert = (answer as { alert?: unknown }).alert;
  return alert === "sent" || alert === "failed" || alert === "none" ? alert : "unknown";
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * POST the consultation to p5 intake and report what p5 said about its team email.
 * Never throws: every failure is logged and comes back as alert "unknown".
 * Callers must not await this on the visitor's success path. Only the team
 * email waits for it, inside after().
 */
export async function forwardConsultationToP5Intake(
  input: ConsultationBridgeInput,
  fetchImpl: FetchLike = fetch,
  timeoutMs: number = P5_INTAKE_TIMEOUT_MS,
): Promise<P5BridgeResult> {
  try {
    const body = buildP5IntakeBody(input);
    const res = await fetchImpl(P5_INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[p5-intake] Bridge rejected: ${res.status} ${detail.slice(0, 300)}`,
      );
      return { forwarded: false, alert: "unknown" };
    }
    let alert: P5TeamAlert = "unknown";
    try {
      alert = readP5TeamAlert(JSON.parse(await res.text()));
    } catch {
      /* an answer that is not JSON confirms nothing */
    }
    console.info(`[p5-intake] Consultation forwarded (${res.status}), team email: ${alert}.`);
    return { forwarded: true, alert };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[p5-intake] Bridge failed: ${message}`);
    return { forwarded: false, alert: "unknown" };
  }
}
