/**
 * Invariants for the RE-10 delivery layer: emails, CRM record, funnel events.
 *
 * The pricing engine has its own suite. This one guards the boundary where the
 * estimate turns into things people receive - and where the expensive mistakes
 * are disclosure mistakes, not arithmetic ones. A leaked margin in a customer
 * email is not a rounding error, it is a negotiating position handed to the
 * other side of a transaction.
 */
import {
  buildRe10CustomerEmail,
  buildRe10AdminEmail,
  buildRe10CustomerSubject,
  buildRe10AdminSubject,
  type Re10Contact,
} from "../server/services/re10Email";
import { estimateRe10, type RepairItemInput, type RepairKind } from "../shared/costs/re10Repairs";
import { findForbiddenPhrase } from "../shared/costCatalog";
import { RE10_EVENTS, RE10_FUNNEL_ORDER } from "../shared/re10/analyticsEvents";
import { EXTRACTABLE_KINDS, EXTRACTION_SCHEMA, EXTRACTION_REVIEW_REASONS } from "../shared/re10/extraction";
import { classifyUpload, resolveMimeType, UPLOAD_ACCEPT, isStoredDocumentUrl } from "../shared/re10/uploads";
import fs from "fs";

let checks = 0;
let failures = 0;
const fail = (m: string) => {
  failures++;
  if (failures <= 25) console.log("  FAIL: " + m);
};
const check = (c: boolean, m: string) => {
  checks++;
  if (!c) fail(m);
};

const strip = (h: string) =>
  h.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

/* ------------------------------------------------ 1. the disclosure wall */

const SAMPLE_ITEMS: RepairItemInput[] = [
  { id: "1", kind: "drywall-repaint-wall", description: "Repair drywall in garage and repaint", quantity: 12 },
  { id: "2", kind: "gfci-install", description: "GFCI at kitchen counter", quantity: 2 },
  { id: "3", kind: "toilet-repair", description: "Running toilet, guest bath" },
  { id: "4", kind: "caulking-weatherproofing", description: "Re-caulk exterior windows", quantity: 60 },
  { id: "5", kind: "general-minor-repair", description: "Foundation crack in crawlspace", needsReview: "foundation" },
];

const CONTACTS: Re10Contact[] = [
  { name: "Dana Smith", email: "d@e.com", phone: "2085550000", preferredContact: "email", role: "buyer-agent", brokerage: "Valley Realty", propertyAddress: "742 Elm St, Boise ID", repairDeadline: "2026-08-14", closingDate: "2026-08-28", occupancy: "occupied", notes: "Before the walkthrough." },
  { name: "Pat Jones", phone: "2085551111", preferredContact: "text", role: "seller", propertyAddress: "12 Oak Ave, Meridian ID" },
  { name: "Sam Lee", email: "s@e.com", preferredContact: "email", role: "coordinator", propertyAddress: "9 Pine Rd, Nampa ID" },
];

/** Words that must never reach a customer email. */
const FORBIDDEN_IN_CUSTOMER = [
  "margin", "markup", "gross profit", "our cost", "internal", "mobiliz",
  "contingency", "direct cost", "unit cost", "crew rate", "worthwhile",
];

const CONTEXTS = [
  { occupancy: "occupied" as const, access: "limited" as const, daysToDeadline: 5, hasInspectionReport: true },
  { occupancy: "vacant" as const, access: "standard" as const, daysToDeadline: 45, hasInspectionReport: true },
  { occupancy: "unknown" as const, access: "difficult" as const, daysToDeadline: 1, hasInspectionReport: false },
];

for (const contact of CONTACTS) {
  for (const ctx of CONTEXTS) {
    const est = estimateRe10(SAMPLE_ITEMS, ctx);
    const view = {
      price: est.quotedPrice,
      validDays: est.quoteValidDays,
      categories: est.trades.map((t) => ({
        trade: t.trade,
        itemCount: t.repairs.length,
        items: t.repairs.map((p) => ({ description: p.input.description, quantityAssumed: p.quantityAssumed })),
      })),
      needsOnsite: est.review.map((r) => ({ description: r.input.description, why: r.text })),
      uncertainty: est.uncertainty,
      assumptions: est.assumptions,
    };

    const cust = buildRe10CustomerEmail(contact, view);
    const admin = buildRe10AdminEmail(contact, est);
    const ct = strip(cust);
    const at = strip(admin);
    const label = `${contact.name}/${ctx.daysToDeadline}d`;

    // (a) The shared lead-vocabulary detector.
    check(findForbiddenPhrase(cust) === null, `${label}: customer email tripped the leak detector`);

    // (b) Internal vocabulary, checked directly.
    for (const w of FORBIDDEN_IN_CUSTOMER) {
      check(!new RegExp(w, "i").test(ct), `${label}: customer email contains "${w}"`);
    }

    // (c) INTERNAL FIGURES. The detector above is word-based; this catches a
    //     number that leaked without an incriminating label next to it.
    for (const [name, value] of [
      ["totalInternalCost", est.totalInternalCost],
      ["grossProfit", est.grossProfit],
      ["directCost", est.directCost],
      ["mobilization", est.mobilization],
      ["contingency", est.contingency],
      ["sellingPrice", est.sellingPrice],
    ] as const) {
      const rendered = "$" + Math.round(value).toLocaleString("en-US");
      // The selling price legitimately equals nothing the customer sees (the
      // range is rounded off it), so a bare match is a real leak.
      check(!ct.includes(rendered), `${label}: customer email exposes ${name} (${rendered})`);
    }

    // (d) The customer email must still do its job.
    check(
      ct.includes("$" + est.quotedPrice.toLocaleString("en-US")),
      `${label}: customer email is missing the quoted price`,
    );
    // A firm price is only firm if its terms travel with it.
    check(/firm for the repairs listed/i.test(ct), `${label}: customer email is missing the firm-price terms`);
    check(/held for \d+ days/i.test(ct), `${label}: customer email does not say how long the price is held`);
    // The internal band must never appear now that we quote one number - two
    // figures on the page is exactly the ambiguity this change removes.
    check(!ct.includes("$" + est.low.toLocaleString("en-US")), `${label}: customer email leaks the internal band low`);
    check(!ct.includes("$" + est.high.toLocaleString("en-US")), `${label}: customer email leaks the internal band high`);
    check(ct.includes(contact.propertyAddress), `${label}: customer email is missing the property address`);
    check(
      /priced separately once we see them/i.test(ct),
      `${label}: customer email does not say the onsite items are excluded`,
    );
    if (est.review.length > 0) {
      check(
        est.review.every((r) => ct.includes(r.input.description)),
        `${label}: an item needing an onsite visit was not disclosed to the customer`,
      );
    }

    // (e) The admin email must carry the economics, or it is decoration.
    for (const must of ["Internal breakdown", "Our cost", "Gross profit", "Total cost", "realised margin"]) {
      check(at.includes(must), `${label}: admin email missing "${must}"`);
    }
    check(
      at.includes("$" + Math.round(est.grossProfit).toLocaleString("en-US")),
      `${label}: admin email does not show gross profit`,
    );
    if (!est.worthwhile) {
      check(/below the worthwhile threshold/i.test(at), `${label}: admin email did not flag a sub-threshold job`);
    }

    // (f) Subjects carry the facts a phone-screen preview needs.
    check(buildRe10CustomerSubject(contact).includes(contact.propertyAddress), `${label}: customer subject lacks the address`);
    const adminSubject = buildRe10AdminSubject(contact, est);
    check(adminSubject.includes(contact.propertyAddress), `${label}: admin subject lacks the address`);
    if (contact.repairDeadline) {
      check(adminSubject.includes(contact.repairDeadline), `${label}: admin subject lacks the deadline`);
    }
  }
}

/* ------------------------------------------- 2. the funnel is complete */

const uniqueEvents = new Set(Object.values(RE10_EVENTS));
check(uniqueEvents.size === Object.keys(RE10_EVENTS).length, "duplicate analytics event names");
for (const name of uniqueEvents) {
  check(/^re10_[a-z_]+$/.test(name), `event "${name}" does not follow the re10_snake_case convention`);
}
for (const stage of RE10_FUNNEL_ORDER) {
  check(uniqueEvents.has(stage), `funnel stage "${stage}" is not in RE10_EVENTS`);
}

// Every event must actually be fired somewhere, or it is a reporting promise
// nothing keeps. This is the check that catches an event defined and forgotten.
const wizard = fs.readFileSync("components/re10/Re10Wizard.tsx", "utf8");
const tracking = fs.readFileSync("components/re10/Re10ContactTracking.tsx", "utf8");
const source = wizard + tracking;
for (const [key, name] of Object.entries(RE10_EVENTS)) {
  check(source.includes(`RE10_EVENTS.${key}`), `event ${key} ("${name}") is defined but never fired`);
}

/* ------------------------- 3. the extraction schema stays a closed door */

const schema = EXTRACTION_SCHEMA as unknown as {
  additionalProperties: boolean;
  properties: { repairs: { items: { additionalProperties: boolean; properties: { kind: { enum: string[] }; needsReview: { enum: string[] } } } } };
};
check(schema.additionalProperties === false, "extraction schema allows additional top-level properties");
check(
  schema.properties.repairs.items.additionalProperties === false,
  "extraction schema allows additional properties on a repair - a model could smuggle a field past the estimator",
);
check(
  schema.properties.repairs.items.properties.kind.enum.length === EXTRACTABLE_KINDS.length,
  "the schema's kind enum has drifted from the recipe catalog",
);
for (const k of EXTRACTABLE_KINDS) {
  check(schema.properties.repairs.items.properties.kind.enum.includes(k), `kind "${k}" is missing from the extraction schema`);
}
for (const r of EXTRACTION_REVIEW_REASONS) {
  check(schema.properties.repairs.items.properties.needsReview.enum.includes(r), `review reason "${r}" missing from the schema`);
}

/* ------------------------------ 3b. items we could not categorise */

/**
 * Found by running a real Idaho RE-10 through the live extractor: seven of its
 * twenty requests had no matching category, and they stopped dead at the review
 * screen. Not in the range, not in the customer's copy, not in the internal
 * estimate, not in the CRM. The agent saw a number that looked like the whole
 * job. These checks are here so that cannot come back quietly.
 */
{
  const est = estimateRe10(SAMPLE_ITEMS, CONTEXTS[1]);
  const unmapped = [
    { verbatim: "Repair severe cracking on chimney cap", reason: "No category matched." },
    { verbatim: "Install vapor barrier in crawlspace" },
  ];
  const notes = ["Seller has not signed, so the list is not yet mutually accepted."];

  const admin = strip(buildRe10AdminEmail(CONTACTS[0], est, { unmapped, documentNotes: notes }));
  for (const u of unmapped) {
    check(admin.includes(u.verbatim), `admin email omits an uncategorised request: "${u.verbatim}"`);
  }
  check(/NOT in the range/i.test(admin), "admin email does not flag uncategorised items as excluded from the price");
  check(admin.includes(notes[0]), "admin email omits what the extractor noticed about the document");

  // And the wizard must actually send them, or none of the above ever runs.
  check(
    /unmapped:\s*extraction\?\.unmapped/.test(wizard),
    "the wizard does not forward unmapped items to the estimate - they die at the review screen",
  );
  check(
    /documentNotes:\s*extraction\?\.documentNotes/.test(wizard),
    "the wizard does not forward the extractor's document notes",
  );
  // Zero priceable repairs must stop at the upload step with an explanation,
  // not push someone onto a review screen whose only button refuses to work.
  check(
    /extracted\.repairs\.length === 0/.test(wizard),
    "the wizard still advances to review with no priceable repairs - a dead end",
  );
  // The document states the address; making someone retype it reads as broken.
  check(
    /setAddress\(\(a\) => a \|\| extracted\.propertyAddress/.test(wizard),
    "the wizard does not prefill the property address the extractor already found",
  );
}

/* ----------------- 3c. stored document links must stay acceptable */

/**
 * The bug that broke the whole funnel. The estimate endpoint validated stored
 * document links as strict absolute URLs; the blob store returns a
 * root-relative path on the local driver, which is what production runs. Every
 * submission carrying an uploaded file was rejected, and the agent hit
 * "Invalid request" at the final step after typing their contact details.
 */
for (const [url, ok] of [
  ["/api/documents/local/re10%2Fabc%2F0-RE-10.pdf", true],
  ["/uploads/re10/x.pdf", true],
  ["https://blob.example.com/re10/x.pdf", true],
  ["http://localhost:3000/api/documents/x.pdf", true],
  ["", false],
  ["javascript:alert(1)", false],
  ["//evil.example.com/x.pdf", false],
  ["not a url at all", false],
] as const) {
  check(
    isStoredDocumentUrl(url) === ok,
    `isStoredDocumentUrl(${JSON.stringify(url)}) should be ${ok} - a wrong answer here either breaks every upload submission or accepts a hostile link`,
  );
}
check(
  /isStoredDocumentUrl/.test(fs.readFileSync("app/api/re10/estimate/route.ts", "utf8")),
  "the estimate route no longer validates document links with the shared predicate",
);
// A bare "Invalid request" names nothing the reader can change.
check(
  /errors\?\.fieldErrors/.test(wizard),
  "the wizard does not surface field-level validation errors - a rejected submission reads as a dead form",
);
// Every step change scrolls topRef to the top of the viewport, which is
// underneath a sticky header unless the target carries a scroll margin. Seen
// live: the range on the final step was half hidden behind the navigation. The
// target may be wired directly (ref={topRef}) or through a combined callback ref
// that assigns topRef.current - the mobile rebuild added the latter so the
// site-wide Call / Text bar steps aside for the wizard. Either way, the element
// it lands on must carry scroll-mt, so this reads the ref off the scroll-mt
// element and confirms it feeds topRef.
const scrollMtRef = wizard.match(/scroll-mt-\d+[^"]*"\s+ref=\{(\w+)\}/)?.[1];
const scrollTargetWired =
  scrollMtRef === "topRef" ||
  (scrollMtRef != null &&
    new RegExp(`const ${scrollMtRef} = \\([^)]*\\) => \\{[\\s\\S]*?topRef\\.current =`).test(wizard));
check(
  /scroll-mt-\d+[\s"]/.test(wizard) && scrollTargetWired,
  "the wizard's scroll target has no scroll-mt - step headings will land behind the sticky header",
);

/* ------------------------------------------- 4. the upload contract */

/**
 * `capture` on the plain file input is the bug that shipped: a phone opens the
 * camera and nothing else - no photo library, no Files, no Drive - which is the
 * wrong door when the document is usually a PDF someone was emailed. It belongs
 * on the camera button and nowhere else, and it is a one-word regression to
 * reintroduce, so it is checked rather than remembered.
 *
 * The upload markup now lives in the shared wizard UploadField, reused by the
 * RE-10 and Plans flows, so the contract is checked there. The wizard is still
 * checked for the two things it owns: passing the shared accept list, and
 * swallowing a stray drop so the page is never navigated away.
 */
const uploadField = fs.readFileSync("components/estimate/wizard/UploadField.tsx", "utf8");

const pickerBlock = uploadField.slice(uploadField.indexOf("ref={pickerRef}"));
const pickerInput = pickerBlock.slice(0, pickerBlock.indexOf("/>"));
check(pickerInput.length > 0 && pickerInput.length < 1200, "could not isolate the file picker input");
check(!/capture/.test(pickerInput), "the plain file picker has a `capture` attribute - phones will open the camera and hide the file and photo pickers");
check(/multiple/.test(pickerInput), "the file picker is not `multiple` - an RE-10 plus inspection pages is several files");
check(/accept=\{accept\}/.test(pickerInput), "the file picker does not apply its accept prop - the shared accept list is dropped");
check(/UPLOAD_ACCEPT/.test(wizard), "the RE-10 wizard does not pass the shared accept list to the upload field");

const cameraBlock = uploadField.slice(uploadField.indexOf("ref={cameraRef}"));
const cameraInput = cameraBlock.slice(0, cameraBlock.indexOf("/>"));
check(/capture=/.test(cameraInput), "the camera button's input has no `capture` - it will not open the camera");

// Drag and drop is easy to delete by accident when the box is restyled.
for (const handler of ["onDragEnter", "onDragOver", "onDragLeave", "onDrop"]) {
  check(uploadField.includes(handler + "="), `the upload box has no ${handler} - drag and drop is broken`);
}
check(
  /window.addEventListener\("drop"/.test(wizard),
  "a file dropped outside the box will navigate the browser away and lose the session",
);

/* The classifier itself: what we can read, what we only file, what we refuse. */
for (const [filename, declared, expected] of [
  ["re10.pdf", "application/pdf", "readable"],
  ["scan.PDF", "", "readable"],
  ["photo.jpg", "image/jpeg", "readable"],
  ["dropped.pdf", "application/octet-stream", "readable"],
  ["addendum.docx", "", "attachment"],
  ["addendum.doc", "application/msword", "attachment"],
  ["IMG_0021.HEIC", "", "attachment"],
  ["report.zip", "application/zip", "rejected"],
  ["walkthrough.mp4", "video/mp4", "rejected"],
  ["installer.exe", "", "rejected"],
] as const) {
  check(
    classifyUpload(filename, declared) === expected,
    `classifyUpload("${filename}", "${declared}") should be ${expected}, got ${classifyUpload(filename, declared)}`,
  );
}
check(
  resolveMimeType("dropped.pdf", "application/octet-stream") === "application/pdf",
  "a PDF dropped with no declared type must still resolve to application/pdf, or drag and drop silently reads nothing",
);
check(UPLOAD_ACCEPT.includes("image/*"), "the accept list omits image/* - the photo library is not offered on a phone");
check(UPLOAD_ACCEPT.includes(".pdf"), "the accept list omits .pdf - Windows file dialogs filter by extension");
check(!UPLOAD_ACCEPT.includes("capture"), "the accept list is malformed");

console.log(
  failures === 0
    ? `verify:re10-delivery: OK (${checks} checks across emails, funnel events and the extraction schema)`
    : `verify:re10-delivery: FAILED with ${failures} problem(s) across ${checks} checks`,
);
process.exit(failures === 0 ? 0 : 1);
