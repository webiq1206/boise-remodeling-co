import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync("components/approved/ApprovedHomeHero.tsx", "utf8");
const convert = readFileSync("components/approved/HeroConversion.tsx", "utf8");
const tile = readFileSync("components/approved/AttachmentTile.tsx", "utf8");
const detailsPanel = readFileSync("components/approved/RequestDetailsPanel.tsx", "utf8");
const steps = readFileSync("components/approved/RequestSteps.tsx", "utf8");
const consultDialog = readFileSync("components/modals/ConsultDialog.tsx", "utf8");
const followUpClient = readFileSync("lib/requestFollowUp.ts", "utf8");
const home = readFileSync("components/approved/ApprovedHome.tsx", "utf8");
const intake = readFileSync("components/approved/OptionalIntake.tsx", "utf8");
const route = readFileSync("app/api/consultation/route.ts", "utf8");
const chat = readFileSync("components/assistant/AssistantWidget.tsx", "utf8");
const css = readFileSync("app/design-refresh.css", "utf8");
const nav = readFileSync("components/Navigation.tsx", "utf8");
// The header and bar are the shared family components; this site sets them up in lib/familyBrand.ts.
const contactActions = readFileSync("components/family/ContactActions.tsx", "utf8");
const bar = readFileSync("components/family/MobileActionBar.tsx", "utf8");
const brand = readFileSync("lib/familyBrand.ts", "utf8");
const sessions = readFileSync("server/services/estimatorSessions.ts", "utf8");
const contactPage = readFileSync("app/contact/page.tsx", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");

// Phase 2 family chrome (intended change): the hero uses the approved video, and the short
// request moved from under the hero to the final CTA band, where #request and #request-form
// still hold it. Every primary CTA (hero, header, bar) points there.
test("the first screen is the video and headline, and the short request is the final ask", () => {
  assert.equal(hero.includes("use client"), false);
  assert.match(hero, /<ApprovedVideoHero/);
  assert.match(hero, /<ProofStrip/);
  assert.equal(hero.includes("HeroConversion"), false);
  assert.equal(hero.includes("fold-form"), false);
  assert.match(hero, /primary=\{\{ label: FAMILY_BRAND\.cta\.label, href: FAMILY_BRAND\.cta\.href \}\}/);
  assert.match(brand, /cta: \{ label: 'Request a quote', href: '\/#request' \}/);
  assert.match(homePage, /<div id="request"/);
  assert.match(homePage, /<HeroConversion \/>/);
  // Owner request (1 November 2026, "too many options might be cumbersome"): one form, not
  // two. The longer consultation form used to
  // sit in a closed "Prefer the longer form" disclosure under the short request; Step 2 on the
  // success screen now asks for the address and project type, so the homepage carries only
  // the short request. Since 11 November 2026 the consult dialog shows the short request too
  // (see the dialog test below); the long form is still in ConsultationForm.tsx, unmounted.
  assert.doesNotMatch(homePage, /<ConsultationForm/);
  assert.doesNotMatch(homePage, /home-request-more/);
  assert.doesNotMatch(css, /max-height:\s*56px/);
  // C3/C6/C7: header + bottom-bar tokens the estimate wizard still reads.
  assert.match(css, /--site-header-h:\s*76px/);
  assert.match(css, /--site-header-h:\s*64px/);
  assert.match(css, /--site-bottom-bar-h:\s*calc\(72px/);
  assert.match(bar, /data-mobile-nav-bar=""/);
  assert.match(brand, /phoneActions: \['call', 'text', 'chat'\]/);
  assert.match(convert, /className="fold-call"/);
  assert.match(convert, /className="fold-chat"/);
  assert.match(convert, /p5:assistant-open/);
  // Quote form v2: the file control is the attachment tile (a native input, visually hidden).
  // Owner, 11 November 2026: nothing optional on step 1, so the tile lives on step 2 only.
  assert.doesNotMatch(convert, /AttachmentTile/);
  assert.match(detailsPanel, /<AttachmentTile files=\{files\} onChange=\{setFiles\} testId="request-details-attachments" \/>/);
  assert.match(tile, /type="file"/);
  assert.match(tile, /accept=\{REQUEST_FILE_ACCEPT\}/);
  // Owner request (1 November 2026): the easiest form there is. Email became optional on the
  // short request (validated when typed, required when "Email me" is chosen) and stays required
  // on the full consultation form. Quote form v2 renames two labels the shared entry check reads
  // (scripts/lib/shortBrandEntry.mjs, synced from p5-home-co): "What should we look at?" is now
  // "What can we help with?" and "Email" is now "Email (optional)". "Send request" is unchanged.
  assert.match(convert, /Send request/);
  assert.match(convert, /data-clarity-mask="True"/);
  assert.match(convert, /type="email"/);
  assert.match(convert, />Email \(optional\)</);
  assert.match(convert, /For a written copy of your request\./);
  assert.match(convert, /if \(cleanEmail && !validEmail\(cleanEmail\)\) errors\.email/);
  assert.match(convert, /!cleanEmail && reach === "email"/);
  assert.match(route, /email: z\.string\(\)\.email\(\)/);
  assert.match(route, /data\.contactPreference === "email" && !data\.email/);
  assert.match(route, /if \(!data\.email\) \{\s*ctx\.addIssue/);
  assert.match(contactActions, /'link-call-mobile-header'/);
  assert.match(contactActions, /'link-text-mobile-header'/);
  assert.match(contactPage, /<ConsultationForm/);
});

// Owner request (1 November 2026): every Request a quote lands ON the form, the form is the
// simplest one there is, and calling or being called back is always beside it.
test("the short request is one native step with call, text and a callback beside it", () => {
  // Order (owner, 11 November 2026): the steps line, the quiet mode tabs, what they need FIRST,
  // name, phone, then ONE closed dropdown holding everything optional (email, how to reach
  // them), one send button, one short line, and the call / text / chat links last. The
  // validation order follows it.
  const formStart = convert.indexOf("<form");
  assert.ok(formStart > 0);
  const order = ["<RequestSteps sent={false} />", 'className="fold-mode"', "What can we help with?", 'htmlFor={ids("name")}', 'htmlFor={ids("phone")}', 'data-testid="quote-options"', "Add an email or choose how we reach you", 'htmlFor={ids("email")}', "How should we reach you?", "</details>", 'className="fold-submit"', "That is all we need. You can add photos or plans after you send.", "{talk}"].map((marker) => convert.indexOf(marker, formStart));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), "field order");
  // The dropdown is a native details that starts closed, opens for a prefilled email, and opens
  // (then focuses the email) when validation needs the email.
  assert.match(convert, /const \[optionsOpen, setOptionsOpen\] = useState\(false\);/);
  assert.match(convert, /<details\s+className="fold-disclosure"\s+open=\{optionsOpen\}/);
  assert.match(convert, /if \(prefill\.email\) \{[\s\S]{0,260}setOptionsOpen\(true\);/);
  assert.match(convert, /if \(first === "email" && !optionsOpen\) \{[\s\S]{0,160}setOptionsOpen\(true\);\s*window\.requestAnimationFrame\(focusFirst\);/);
  // Exactly one submit button on step 1, and call / text / chat are one line of links, not buttons
  // stacked above it (the old .fold-talk-actions row).
  assert.equal(convert.slice(formStart).match(/type="submit"/g)?.length, 1);
  assert.doesNotMatch(convert, /fold-talk-actions/);
  assert.match(convert, /<p className="fold-talk">\s*<span className="fold-talk-title">Prefer to talk\?<\/span>/);
  // The mode switch reads as quiet underline tabs: the checked tab is never a filled pill.
  assert.match(css, /\.fold-mode \.fold-pill input:checked \+ span \{\s*border: 0;\s*border-bottom: 2px solid[^;]+;\s*border-radius: 0;\s*background: transparent;/);
  assert.match(css, /\.fold-call,\s*\.approved-shell\.site-remodeling \.fold-text,\s*\.approved-shell\.site-remodeling \.fold-chat \{[^}]*min-height: 44px;[^}]*border: 0;[^}]*text-decoration: underline;/);
  // The steps line: "Your request" then "Photos and details (optional)"; "Request sent" once saved.
  for (const text of ["Your request", "Request sent", "Photos and details (optional)", 'data-quote-sent={sent ? "true" : "false"}']) assert.ok(steps.includes(text), text);
  assert.match(convert, /const FIELD_ORDER: Field\[\] = \["note", "name", "phone", "email"\];/);
  assert.match(convert, /autoComplete="name"/);
  assert.match(convert, /type="tel"[\s\S]{0,40}inputMode="tel"[\s\S]{0,40}autoComplete="tel"/);
  assert.match(convert, /<textarea[\s\S]{0,300}rows=\{3\}/);
  assert.match(convert, /placeholder="For example: /);
  // Text is the default reach: this site has a text line and the backend accepts "text".
  assert.match(convert, /const DEFAULT_REACH: Reach = "text";/);
  assert.match(convert, /useState<Reach>\(DEFAULT_REACH\)/);
  assert.match(tile, /Add photos, plans or files/);
  assert.match(tile, /Optional\. Photos, PDFs or drawings\. Up to \{MAX_REQUEST_FILES\} files, \{MAX_REQUEST_FILE_MB\} MB each\./);
  assert.match(tile, /onDrop=/);
  assert.match(tile, /aria-label=\{`Remove \$\{file\.name\}`\}/);
  for (const label of ["Call me", "Text me", "Email me", "Send a request", "Have us call you", "Best time to call (optional)", "Request a call", "Prefer to talk?"]) assert.ok(convert.includes(label), label);
  assert.match(convert, /We have your request\./);
  assert.match(convert, /className="fold-text" href=\{SITE_CONFIG\.phoneSmsHref\}/);
  assert.match(convert, /className="fold-call" href=\{SITE_CONFIG\.phoneHref\}/);
  // Native controls only: no Radix primitive sets state while this form hydrates.
  assert.equal(/@radix-ui|components\/ui\//.test(convert), false);
  // Errors next to the field, announced, and the first one focused on submit.
  assert.match(convert, /aria-live="polite"/);
  assert.match(convert, /aria-describedby=\{describedBy\(/);
  assert.match(convert, /querySelector<HTMLElement>\(`\[data-field="\$\{first\}"\]`\)\?\.focus\(\)/);
  assert.equal(/autoFocus/.test(convert), false, "no field is focused on arrival");
  // Same pipeline, same tracking.
  assert.match(convert, /fetch\("\/api\/consultation"/);
  assert.match(convert, /trackAcceptedInquiry\(data, estimate\?\.project \|\| PROJECT_TYPE\)/);
  assert.match(convert, /body\.set\("callback", "1"\)/);
  // Files never ride the lead: they are chosen and uploaded on step 2, after it is saved.
  assert.equal(/body\.append\("files"|pendingFiles/.test(convert), false);
  assert.match(detailsPanel, /uploadRequestFiles\(followUp, files, setUploads\)/);
  assert.match(followUpClient, /fetch\("\/api\/consultation\/files"/);
  assert.match(followUpClient, /fetch\("\/api\/consultation\/details"/);
  assert.match(route, /CALLBACK REQUEST: call/);
  assert.match(route, /Preferred contact:/);
  // The contact page short form is this same form.
  const consult = readFileSync("components/ConsultationForm.tsx", "utf8");
  assert.match(consult, /if \(variant === "short"\) return <HeroConversion blockId="contact-request-form" recovery \/>;/);
});

// Owner request (1 November 2026): every primary CTA lands on the form, not on a section intro.
test("#request and #consult land on the form block, not on an intro", () => {
  const request = homePage.indexOf('<div id="request"');
  assert.ok(request > 0 && request < homePage.indexOf('<div className="fr-request-copy'), "the form leads the closing section");
  assert.match(homePage, /<span id="consult" className="home-request-anchor"/);
  assert.equal(homePage.includes('<Section id="consult"'), false);
  assert.ok(contactPage.indexOf('<div id="consult"') < contactPage.indexOf('className="interior-contact-intro"'), "contact form leads its section");
  assert.match(contactPage, /<HashTargetRecovery \/>/);
  const adoption = readFileSync("app/family-adoption.css", "utf8");
  assert.match(adoption, /\.approved-shell #request,\s*\.approved-shell #consult,[\s\S]{0,120}scroll-margin-top: 0;/);
  const recovery = readFileSync("components/HashTargetRecovery.tsx", "utf8");
  assert.match(recovery, /new Set\(\["request", "consult"\]\)/);
  assert.match(recovery, /root\.style\.scrollBehavior = "auto"/);
});

test("optional photos ride only the short multipart consultation path", () => {
  assert.match(route, /requestKind: z\.literal\("short"\)/);
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /Photos and plans:/);
  assert.match(route, /MAX_REQUEST_FILES/);
  assert.match(route, /projectType: SHORT_REQUEST_PROJECT_TYPE/);
  assert.match(route, /Photos and files on the way/);
  // A file the server cannot store is named in the notes; it never fails the request.
  assert.equal(/status: 503 \},\s*\),\s*\};\s*\}\s*\}/.test(route), false);
  assert.match(route, /Files that did not upload:/);
});

// Quote form v2: step 2 on the success screen adds to the SAME lead; one conversion only.
test("step 2 is optional, on the success screen, and never a second conversion", () => {
  assert.match(convert, /<RequestDetailsPanel followUp=\{done\.followUp\} askEmail=\{!done\.hadEmail\} \/>/);
  // Owner, 11 November 2026: the sent screen says the request is done before it offers anything,
  // and step 2 is ONE dropdown that starts closed (a native details with no open attribute)
  // inside the panel wrapper. No Skip: leaving it closed is skipping.
  const sent = convert.indexOf('data-testid="consultation-success"');
  const sentOrder = ["<RequestSteps sent />", "We have your request.", "You are all set. Nothing else is needed.", "<RequestDetailsPanel"].map((marker) => convert.indexOf(marker, sent));
  assert.ok(sentOrder.every((at, i) => at > sent && (i === 0 || at > sentOrder[i - 1])), "sent screen order");
  assert.match(convert, /className="fold-tick" aria-hidden="true"/);
  const panel = detailsPanel.indexOf('data-testid="request-details"');
  const disclosure = detailsPanel.indexOf('<details className="fold-disclosure" data-testid="quote-details-disclosure">');
  assert.ok(panel > 0 && disclosure > panel, "step 2 sits in a closed dropdown inside the panel");
  const closes = detailsPanel.indexOf("</details>", disclosure);
  for (const inside of ["Add photos, plans or project details", "(optional)", "Project type", "Address or ZIP code", "When would you like to start?", "<AttachmentTile", "Save details"]) {
    const at = detailsPanel.indexOf(inside, disclosure);
    assert.ok(at > disclosure && at < closes, `${inside} is inside the dropdown`);
  }
  assert.doesNotMatch(detailsPanel, />\s*Help us prepare|>\s*Skip\s*<|"skipped"/);
  assert.match(detailsPanel, /A few details help us give you a closer quote on the first call\./);
  assert.match(detailsPanel, /Saved\. Thank you\./);
  assert.match(detailsPanel, /autoComplete="street-address"/);
  assert.match(detailsPanel, /\{askEmail && \(/);
  assert.match(detailsPanel, /trackEvent\("lead_details_added"/);
  for (const source of [detailsPanel, tile, followUpClient]) {
    assert.equal(/generate_lead|trackAcceptedInquiry|trackMetaEvent|"conversion"/.test(source), false);
  }
  assert.equal(convert.match(/trackAcceptedInquiry\(/g)?.length, 1, "generate_lead fires once, at step 1");
  // Upload failures are per file, with a retry and a text fallback, after the lead succeeded.
  // They moved to step 2 with the attachment tile.
  assert.match(detailsPanel, /Did not upload/);
  assert.match(detailsPanel, /onClick=\{\(\) => void retryFile\(index\)\}>\s*Try again/);
  assert.match(detailsPanel, /text it to us/);
  assert.match(detailsPanel, /const result = await uploadRequestFile\(followUp, target\.file\);/);
});

// Owner request (11 November 2026): the consult dialog was the long form (project type, name,
// phone, required email, required property address, optional note). It now shows the same short
// request, through the same route and tracking, and still carries a planning range.
test("the consult dialog is the short request and still carries a planning range", () => {
  assert.match(consultDialog, /<HeroConversion\s+blockId="consult-dialog-form"\s+recovery\s+showTitle=\{false\}/);
  assert.doesNotMatch(consultDialog, /<ConsultationForm|from "@\/components\/ConsultationForm"/);
  assert.match(consultDialog, /className="approved-shell site-remodeling consult-dialog-form"/);
  assert.match(consultDialog, /sessionStorage\.getItem\("brc_estimate"\)/);
  assert.match(consultDialog, /estimate=\{estimate && attached \? estimatePayload\(estimate\) : null\}/);
  assert.match(consultDialog, /onAccepted=\{clear\}/);
  for (const marker of ["Planning range attached", 'data-testid="text-estimate-range"', 'data-testid="button-drop-estimate"', 'data-testid="button-revise-estimate"', 'data-testid="button-reattach-estimate"']) assert.ok(consultDialog.includes(marker), marker);
  // A carried range rides the JSON side of the same route as a short request, so email and
  // address stay optional and the server recomputes the range (route: verifyEstimate).
  assert.match(convert, /if \(estimate\) \{[\s\S]{0,900}requestKind: "short",[\s\S]{0,500}projectType: estimate\.project,[\s\S]{0,300}estimate,/);
  assert.match(convert, /`CALLBACK REQUEST: call \$\{name\.trim\(\)\} at \$\{phone\.trim\(\)\}\. Best time: \$\{bestTime \|\| "Any time"\}\.`/);
  assert.match(convert, /`Preferred contact: \$\{reachLabel\}`/);
  assert.match(route, /if \(data\.requestKind === "short"\) \{/);
  assert.match(route, /const estimate = data\.estimate \? verifyEstimate\(data\.estimate, pricingAlertKinds\) : null;/);
  assert.match(css, /\.approved-shell\.site-remodeling\.consult-dialog-form \{\s*min-height: 0;/);
  // The homepage form never imports the estimate engine at runtime (bundle weight).
  assert.doesNotMatch(convert, /estimateEngine/);
});

test("the multi-step intake stays optional and the estimator is not the header ask", () => {
  assert.equal(home.includes("<OptionalIntake"), false);
  assert.equal(home.includes("<ApprovedEstimate"), false);
  assert.match(intake, /Open the optional intake/);
  assert.match(intake, /<ApprovedEstimate/);
  assert.match(nav, /<SiteHeader \/>/);
  assert.match(brand, /label: 'Request a quote'/);
  assert.equal(brand.includes("Get an Estimate"), false);
  assert.equal(brand.includes("/estimate' }"), false);
});

test("chat uses the visual viewport, a 16px field, and a light sheet", () => {
  assert.match(chat, /visualViewport/);
  assert.match(chat, /createPortal/);
  assert.match(chat, /data-testid="assistant-panel"/);
  assert.match(chat, /data-testid="button-assistant-continue"/);
  assert.match(chat, /Continue project/);
  assert.match(chat, /className="assistant-field"/);
  assert.match(css, /\.assistant-field \{[\s\S]*font: 16px/);
  assert.match(css, /#fbfaf6/);
  assert.match(css, /body\[data-assistant-open="true"\] \[data-mobile-nav-bar\]/);
  assert.equal(chat.includes("interactiveWidget"), false);
});

test("partial completion emails stay off", () => {
  assert.match(sessions, /SEND_PARTIAL_COMPLETION_EMAILS[^\n]*= false/);
});

// One label, one destination (1 November 2026): every "Request a quote" goes to
// the short request at /#request, like the header and the bottom bar. Links to
// /estimate (the six-step request, no on-screen price) carry their own label,
// which promises no instant or online estimate.
test("every Request a quote goes to /#request and /estimate links never use that label", async () => {
  const cta = readFileSync("components/modals/EstimateCTA.tsx", "utf8");
  assert.match(cta, /const href = "\/#request";/);
  assert.equal(cta.includes('"/estimate"'), false);
  const { CTA_PRIMARY, CTA_PROJECT_DETAILS } = await import("../shared/ctaCopy.ts");
  assert.equal(CTA_PRIMARY, "Request a quote");
  assert.equal(/quote|estimate|instant|online/i.test(CTA_PROJECT_DETAILS), false);
  const interior = readFileSync("components/approved/InteriorLayout.tsx", "utf8");
  assert.match(interior, /label=CTA_PROJECT_DETAILS,href='\/estimate'/);
  const footerCtas = readFileSync("components/modals/FooterCTAs.tsx", "utf8");
  assert.equal(footerCtas.includes('href="/estimate"'), false);
  const plans = readFileSync("app/remodel-plans-boise/page.tsx", "utf8");
  assert.equal(plans.includes("online estimator"), false);
});
