/**
 * Execution layer: turns a scored opportunity into a ready-to-review artifact.
 *  - self-serve targets  -> a citation submission packet (fields to enter)
 *  - application targets  -> a membership / program inquiry email
 *  - digital_pr targets   -> a journalist / editorial pitch
 *  - outreach targets     -> unlinked-mention / resource-page / partnership email
 *
 * Every draft is filled from the canonical NAP + config/profile.json. Any field
 * that is still a placeholder is reported in `missingInputs` so a half-baked
 * message is never marked send-ready. Nothing here sends; see send.mjs.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = (f) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const NAP = readJSON("config/scoring.json").site.nap;
const PROFILE = readJSON("config/profile.json");

const sig = () =>
  `${PROFILE.sender.name || "[SENDER NAME]"}\n${NAP.name} · ${NAP.url.replace("https://", "")}\n${NAP.phone} · ${NAP.city}, ${NAP.state}`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function missing(fields) {
  const miss = [];
  if (!PROFILE.sender.name) miss.push("sender.name");
  if (fields.includes("long") && !PROFILE.descriptions.long) miss.push("descriptions.long");
  if (fields.includes("portfolio") && !PROFILE.portfolioAssets.length) miss.push("portfolioAssets");
  return miss;
}

/** Best recipient for an opportunity: resolved contact > curated email > none. */
function recipient(o) {
  const rc = o.resolvedContact;
  if (rc && rc.email) return { to: rc.email, meta: rc };
  if (o.contact && EMAIL_RE.test(String(o.contact).trim())) return { to: String(o.contact).trim().toLowerCase(), meta: { confidence: "curated", source: "curated" } };
  return { to: "[FIND CONTACT]", meta: rc || null };
}

function citationPacket(o) {
  return {
    type: "packet",
    channel: "self_serve",
    domain: o.domain,
    submitTo: o.contact || o.domain,
    fields: {
      businessName: NAP.name,
      category: "Design-Build Remodeling Contractor / General Contractor",
      city: NAP.city,
      state: NAP.state,
      postalCode: NAP.postalCode,
      phone: NAP.phone,
      email: NAP.email,
      website: NAP.url,
      serviceArea: PROFILE.descriptions.serviceArea,
      shortDescription: PROFILE.descriptions.short,
      longDescription: PROFILE.descriptions.long || "[ADD LONG DESCRIPTION]",
      photos: PROFILE.portfolioAssets,
    },
    checklist: ["Claim/verify listing", "Enter NAP exactly as above", "Add categories + service area", "Upload 3-5 portfolio photos", "Confirm the profile links back to the website"],
    missingInputs: missing(["long", "portfolio"]),
    status: "awaiting_approval",
  };
}

function email(o, subject, body, needs) {
  const { to, meta } = recipient(o);
  const miss = missing(needs);
  if (!EMAIL_RE.test(to)) miss.push("contactEmail");
  // Only auto-qualify a confidently-resolved, deliverable address. Low-confidence,
  // role-guessed, off-domain, or MX-failing addresses need a human to confirm.
  else if (meta && (["low", "form-only"].includes(meta.confidence) || meta.source === "role-guess" || meta.mx === false)) miss.push("verifyContact");
  return {
    type: "email",
    channel: o.feasibility,
    domain: o.domain,
    to,
    subject,
    body: `${body}\n\n${sig()}`,
    contact: meta ? { confidence: meta.confidence, source: meta.source, mx: meta.mx, contactForm: meta.contactForm, candidates: meta.candidates } : undefined,
    missingInputs: miss,
    status: "awaiting_approval",
  };
}

export function draftFor(o) {
  const spec = PROFILE.descriptions.specialties.join(", ");
  switch (o.feasibility) {
    case "self_serve":
    case "review_profile":
      return citationPacket(o);

    case "application":
      return email(o,
        `Membership inquiry - ${NAP.name} (design-build remodeler)`,
        `Hi ${o.name} team,\n\nWe're a design-build remodeling company serving the Treasure Valley and would like to join / apply to ${o.name}. Could you send current requirements, dues, and directory-listing details?\n\nWe focus on ${spec} and are ${PROFILE.descriptions.credentials.join(", ").toLowerCase()}. Happy to provide references.`,
        []);

    case "digital_pr":
      return email(o,
        `Local remodeling expert source - ${NAP.city}, ID`,
        `Hi ${o.name} team,\n\nI'm ${PROFILE.sender.name || "[SENDER NAME]"} with ${NAP.name}, a design-build remodeler in Idaho's Treasure Valley. If you're ever working on a home-improvement, remodeling-cost, or local-housing story, I'm happy to be a quotable local source with concrete numbers.\n\nA current angle we can speak to with data: [INSERT LOCAL DATA POINT - e.g. average Treasure Valley kitchen-remodel range, permit trends]. Feel free to quote directly.`,
        ["long"]);

    case "outreach":
    default:
      if (o.category === "unlinked_mention")
        return email(o,
          "Thanks for the mention - quick request",
          `Hi,\n\nThank you for mentioning ${NAP.name}. Would you be open to linking the mention to our site so readers can find us directly? ${NAP.url} is the best page. Either way, we appreciate it.`,
          []);
      return email(o,
        `A resource for your readers - ${NAP.city} remodeling`,
        `Hi,\n\nI came across your page and thought our guides for Treasure Valley homeowners might be a useful resource. We publish practical, local remodeling content at ${NAP.url}. No worries either way - just thought it might help.`,
        ["long"]);
  }
}

/** Generate artifacts for a set of opportunities; write packets to files. */
export function buildArtifacts(opps) {
  mkdirSync(join(ROOT, "outreach/citations"), { recursive: true });
  const queue = [];
  for (const o of opps) {
    const art = draftFor(o);
    art.id = o.id;
    art.name = o.name;
    art.priority = o.priority;
    art.draftedOn = process.env.RUN_DATE || "run";
    if (art.type === "packet") {
      writeFileSync(join(ROOT, `outreach/citations/${o.id}.json`), JSON.stringify(art, null, 2) + "\n");
    }
    queue.push(art);
  }
  return queue;
}
