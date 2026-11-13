import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync("components/approved/ApprovedHomeHero.tsx", "utf8");
const convert = readFileSync("components/approved/HeroConversion.tsx", "utf8");
const tile = readFileSync("components/approved/AttachmentTile.tsx", "utf8");
const detailsPanel = readFileSync("components/approved/RequestDetailsPanel.tsx", "utf8");
const estimatePage = readFileSync("app/estimate/page.tsx", "utf8");
const recoveryPrompt = readFileSync("components/estimate/recovery/AbandonmentPrompt.tsx", "utf8");
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
// still hold it. Owner decision, 13 November 2026: the primary CTA (hero, header, bar) is the
// central estimator at /instant-estimate; "Request a quote" links still land on that form.
test("the first screen is the video and headline, and the short request is the final ask", () => {
  assert.equal(hero.includes("use client"), false);
  assert.match(hero, /<ApprovedVideoHero/);
  assert.match(hero, /<ProofStrip/);
  assert.equal(hero.includes("HeroConversion"), false);
  assert.equal(hero.includes("fold-form"), false);
  assert.match(hero, /primary=\{\{ label: CTA_PRIMARY, href: FAMILY_BRAND\.cta\.href \}\}/);
  assert.match(brand, /cta: \{ label: 'Instant estimate', href: '\/instant-estimate' \}/);
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
  // Clean layout (owner, 11 November 2026): the form's quiet line carries the call link only;
  // text and chat stay in the header and the bottom bar (phoneActions above).
  assert.match(convert, /className="fold-call"/);
  assert.doesNotMatch(convert, /fold-chat|fold-text"|p5:assistant-open/);
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
  // Round 3 (owner, 11 November 2026): the toggle already says "(optional)", so no label inside
  // an opened optional section repeats it. It stays only where it is the one marker.
  assert.match(convert, /<label htmlFor=\{ids\("email"\)\}>Email<\/label>/);
  assert.match(detailsPanel, /<label htmlFor=\{ids\("email"\)\}>Email<\/label>/);
  for (const [name, source] of [["step 1", convert], ["step 2", detailsPanel], ["tile", tile]] as const) {
    const repeats = (source.replace(/\/\*[\s\S]*?\*\//g, "").match(/\(optional\)|Optional\./g) ?? []).length;
    const allowed = name === "step 1" ? 2 : name === "step 2" ? 1 : 0;
    assert.equal(repeats, allowed, `${name}: "(optional)" only on the toggle summary and on best time to call`);
  }
  // The mode link and its full stop never split across lines on a phone.
  assert.match(convert, /<span className="fold-nowrap">\s*<fieldset className="fold-mode"[\s\S]{0,320}<\/fieldset>\s*\.\s*<\/span>/);
  assert.match(css, /\.fold-nowrap \{ white-space: nowrap; \}/);
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
  // Clean layout (owner, 11 November 2026, "it cannot look cluttered"): the heading, what they
  // need FIRST, name and phone in one row, ONE quiet text toggle holding everything optional
  // (address, email, how to reach them), one send button, one quiet line with the call link and
  // the mode radios, one small "No obligation" line. Nothing else is in the form.
  const formStart = convert.indexOf("<form");
  assert.ok(formStart > 0);
  const order = ["{intro}", "What can we help with?", 'className="fold-row"', 'htmlFor={ids("name")}', 'htmlFor={ids("phone")}', 'data-testid="quote-options"', "Add address, email or contact preference (optional)", 'htmlFor={ids("address")}', 'htmlFor={ids("email")}', "How should we reach you?", "</details>", 'className="fold-submit"', 'className="fold-quiet fold-talk"', "Prefer to talk?", 'className="fold-mode"', "No obligation.", 'href="/privacy-policy"', "</form>"].map((marker) => convert.indexOf(marker, formStart));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `field order ${order.join(",")}`);
  // The toggle is a native details that starts closed, opens for a prefilled address or email,
  // and opens (then focuses the email) when validation needs the email. It is a line of text,
  // never a box: no border and no background on the details or its summary.
  assert.match(convert, /const \[optionsOpen, setOptionsOpen\] = useState\(false\);/);
  assert.match(convert, /<details\s+className="fold-toggle"\s+open=\{optionsOpen\}/);
  assert.match(convert, /if \(prefill\.address\) \{[\s\S]{0,160}setOptionsOpen\(true\);/);
  assert.match(convert, /if \(prefill\.email\) \{[\s\S]{0,260}setOptionsOpen\(true\);/);
  assert.match(convert, /if \(first === "email" && !optionsOpen\) \{[\s\S]{0,160}setOptionsOpen\(true\);\s*window\.requestAnimationFrame\(focusFirst\);/);
  const toggleRules = [...css.matchAll(/\.fold-toggle[^{]*\{[^}]*\}/g)].map((rule) => rule[0]).join("\n");
  assert.ok(toggleRules.length > 0);
  assert.doesNotMatch(toggleRules, /border|background/);
  // The optional address: plain text, never required or validated, sent on the same field the
  // route already stores; a callback carries none, and step 2 does not ask for it again.
  assert.match(convert, /<label htmlFor=\{ids\("address"\)\}>Project address<\/label>[\s\S]{0,260}autoComplete="street-address"/);
  assert.doesNotMatch(convert, /errors\.address/);
  assert.match(convert, /body\.set\("address", address\.trim\(\)\);/);
  assert.match(convert, /\.\.\.\(!callback && address\.trim\(\) \? \{ address: address\.trim\(\) \} : \{\}\),/);
  assert.match(convert, /askAddress=\{!done\.hadAddress\}/);
  assert.match(detailsPanel, /\{askAddress && \(\s*<div className="fold-field">\s*<label htmlFor=\{ids\("address"\)\}>Address or ZIP code<\/label>/);
  assert.match(route, /const address = callback \? "" : String\(form\.get\("address"\) \?\? ""\)\.trim\(\)\.slice\(0, 300\);/);
  // Exactly one submit button, and nothing the clean layout removed has come back: no step
  // indicator, no tabs, no footnote under the button, no boxed dropdown, no hint paragraphs.
  assert.equal(convert.slice(formStart).match(/type="submit"/g)?.length, 1);
  assert.doesNotMatch(convert, /RequestSteps|fold-pill"[\s\S]{0,200}requestMode|That is all we need|fold-disclosure|fold-hint|fold-next|fold-talk-actions|<TextReplyLine/);
  assert.doesNotMatch(css, /\.fold-steps|\.fold-disclosure|\.fold-send\b|\.fold-estimate/);
  // The mode switch is the same two native radios (scripts/p5-launcher-forms.mjs clicks their
  // labels), drawn as one inline text link: the mode you are in is visually hidden, still checked.
  assert.match(convert, /<label className=\{mode === value \? "fold-mode-option sr-only" : "fold-mode-option"\}>\s*<input[\s\S]{0,120}type="radio"\s*name="requestMode"[\s\S]{0,160}data-testid=\{`request-mode-\$\{value\}`\}/);
  assert.match(convert, /\{modeOption\("request", "Send a request"\)\}\s*\{modeOption\("callback", "Have us call you"\)\}/);
  assert.match(convert, /"Rather write it down\? "/);
  assert.match(css, /\.fold-mode-option \{[^}]*text-decoration: underline;/);
  assert.doesNotMatch(css, /\.fold-mode \.fold-pill/);
  assert.match(convert, /const FIELD_ORDER: Field\[\] = \["note", "name", "phone", "email"\];/);
  assert.match(convert, /autoComplete="name"/);
  assert.match(convert, /type="tel"[\s\S]{0,40}inputMode="tel"[\s\S]{0,40}autoComplete="tel"/);
  assert.match(convert, /<textarea[\s\S]{0,300}rows=\{3\}/);
  assert.match(convert, /placeholder="For example: /);
  // Text is the default reach: this site has a text line and the backend accepts "text".
  assert.match(convert, /const DEFAULT_REACH: Reach = "text";/);
  assert.match(convert, /useState<Reach>\(DEFAULT_REACH\)/);
  assert.match(tile, /Add photos, plans or files/);
  assert.match(tile, /\n\s+Photos, PDFs or drawings\. Up to \{MAX_REQUEST_FILES\} files, \{MAX_REQUEST_FILE_MB\} MB each\./);
  assert.match(tile, /onDrop=/);
  assert.match(tile, /aria-label=\{`Remove \$\{file\.name\}`\}/);
  // "Best time to call" stays visible in callback mode: scripts/p5-launcher-forms.mjs waits for it.
  for (const label of ["Call me", "Text me", "Email me", "Send a request", "Have us call you", "Best time to call (optional)", "Request a call", "Prefer to talk?"]) assert.ok(convert.includes(label), label);
  assert.match(convert, /We have your request\./);
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
  assert.match(convert, /<RequestDetailsPanel followUp=\{done\.followUp\} askEmail=\{!done\.hadEmail\} askAddress=\{!done\.hadAddress\} \/>/);
  // Owner, 11 November 2026: the sent screen is a tick and the thanks, ONE sentence ending
  // "Nothing else is needed.", the quiet toggle, and one line with the phone. Step 2 is ONE
  // native details that starts closed (no open attribute), a line of text with no panel around
  // its fields. No Skip: leaving it closed is skipping.
  const sent = convert.indexOf('data-testid="consultation-success"');
  const sentEnd = convert.indexOf("<form", sent);
  const sentOrder = ['className="fold-tick" aria-hidden="true"', "We have your request.", 'data-testid="quote-all-set"', "Nothing else is needed.", "<RequestDetailsPanel", "Prefer to talk?"].map((marker) => convert.indexOf(marker, sent));
  assert.ok(sentOrder.every((at, i) => at > sent && at < sentEnd && (i === 0 || at > sentOrder[i - 1])), "sent screen order");
  assert.equal(convert.slice(sent, sentEnd).match(/<p /g)?.length, 2, "one sentence and one phone line, nothing more");
  const panel = detailsPanel.indexOf('data-testid="request-details"');
  const disclosure = detailsPanel.indexOf('<details className="fold-toggle" data-testid="quote-details-disclosure">');
  assert.ok(panel > 0 && disclosure > panel, "step 2 sits behind a closed toggle inside the panel");
  const closes = detailsPanel.indexOf("</details>", disclosure);
  for (const inside of ["Add photos, plans or details (optional)", "Project type", "Address or ZIP code", "When would you like to start?", "<AttachmentTile", "Save details"]) {
    const at = detailsPanel.indexOf(inside, disclosure);
    assert.ok(at > disclosure && at < closes, `${inside} is inside the toggle`);
  }
  assert.doesNotMatch(detailsPanel, />\s*Help us prepare|>\s*Skip\s*<|"skipped"|fold-hint|fold-disclosure/);
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
  // One heading, and the form sits directly on the dialog surface: the dialog content carries
  // the shell classes (it is a portal outside the page shell), with no card inside it.
  assert.match(consultDialog, /<DialogContent\s+className="approved-shell site-remodeling consult-dialog /);
  assert.doesNotMatch(consultDialog, /DialogDescription|DialogHeader|className="[^"]*consult-dialog-form|fold-estimate/);
  assert.equal(consultDialog.match(/<DialogTitle/g)?.length, 1);
  assert.match(consultDialog, /sessionStorage\.getItem\("brc_estimate"\)/);
  assert.match(consultDialog, /estimate=\{estimate && attached \? estimatePayload\(estimate\) : null\}/);
  assert.match(consultDialog, /onAccepted=\{clear\}/);
  // The attached range is one muted line with its Remove link, not a card.
  assert.match(consultDialog, /<p className="fold-quiet" data-testid="estimate-attached">\s*Planning range attached:/);
  for (const marker of ['data-testid="text-estimate-range"', 'data-testid="button-drop-estimate"', 'data-testid="button-reattach-estimate"']) assert.ok(consultDialog.includes(marker), marker);
  // A carried range rides the JSON side of the same route as a short request, so email and
  // address stay optional and the server recomputes the range (route: verifyEstimate).
  assert.match(convert, /if \(estimate\) \{[\s\S]{0,900}requestKind: "short",[\s\S]{0,500}projectType: estimate\.project,[\s\S]{0,300}estimate,/);
  assert.match(convert, /`CALLBACK REQUEST: call \$\{name\.trim\(\)\} at \$\{phone\.trim\(\)\}\. Best time: \$\{bestTime \|\| "Any time"\}\.`/);
  assert.match(convert, /`Preferred contact: \$\{reachLabel\}`/);
  assert.match(route, /if \(data\.requestKind === "short"\) \{/);
  assert.match(route, /const estimate = data\.estimate \? verifyEstimate\(data\.estimate, pricingAlertKinds\) : null;/);
  assert.match(css, /\.approved-shell\.site-remodeling\.consult-dialog \{\s*min-height: 0;/);
  // The homepage form never imports the estimate engine at runtime (bundle weight).
  assert.doesNotMatch(convert, /estimateEngine/);
});

// Owner decision, 13 November 2026: the header ask is the central estimator, framed at
// /instant-estimate. The site's own multi-step intake stays optional and unmounted from the home.
test("the multi-step intake stays optional and the header ask is the central estimator", () => {
  assert.equal(home.includes("<OptionalIntake"), false);
  assert.equal(home.includes("<ApprovedEstimate"), false);
  assert.match(intake, /Open the optional intake/);
  assert.match(intake, /<ApprovedEstimate/);
  assert.match(nav, /<SiteHeader \/>/);
  assert.match(brand, /label: 'Instant estimate'/);
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

// Owner, 11 November 2026 ("applicable to all forms"): /estimate was a six-screen wizard with a
// required email. It is the short request now, under the page's one h1.
test("/estimate is the short request, and the recovery prompt hides its optional name", () => {
  assert.match(estimatePage, /<h1 className="estimate-short-form-title">Request a remodel quote<\/h1>\s*<HeroConversion blockId="estimate-request-form" recovery showTitle=\{false\} \/>/);
  assert.doesNotMatch(estimatePage, /EstimateRequestWizard \/>|import \{ EstimateRequestWizard/);
  assert.match(estimatePage, /alternates: \{ canonical: buildCanonical\("\/estimate"\) \}/);
  const toggle = recoveryPrompt.indexOf('<details className="mt-2" data-testid="recovery-name-toggle">');
  const name = recoveryPrompt.indexOf('id="recovery-name"');
  assert.ok(toggle > 0 && name > toggle && name < recoveryPrompt.indexOf("</details>", toggle), "the optional name sits behind the toggle");
  assert.match(recoveryPrompt, /Add your name \(optional\)/);
  assert.match(recoveryPrompt, /htmlFor="recovery-name">Your name<\/label>/);
  assert.doesNotMatch(recoveryPrompt, /placeholder="Your name \(optional\)"/);
});

// One label, one destination (1 November 2026): every "Request a quote" goes to
// the short request at /#request. Owner decision, 13 November 2026: the primary
// action is "Get an instant estimate" to the central estimator at
// /instant-estimate, like the header and the bottom bar. Links to /estimate (the
// short request page, no on-screen price) carry their own label, which never
// borrows the estimator's wording.
test("the primary CTA is the estimator, Request a quote goes to /#request and /estimate links use neither label", async () => {
  const cta = readFileSync("components/modals/EstimateCTA.tsx", "utf8");
  assert.match(cta, /const href = destination === "request" \? REQUEST_PATH : estimatorHref\(project\);/);
  assert.equal(cta.includes('"/estimate"'), false);
  const { CTA_PRIMARY, CTA_PRIMARY_SHORT, CTA_REQUEST, CTA_FORM_SEND, CTA_PROJECT_DETAILS, ESTIMATOR_PATH, REQUEST_PATH, estimatorHref } = await import("../shared/ctaCopy.ts");
  assert.equal(CTA_PRIMARY, "Get an instant estimate");
  assert.equal(CTA_PRIMARY_SHORT, "Instant estimate");
  assert.equal(ESTIMATOR_PATH, "/instant-estimate");
  assert.equal(estimatorHref(), "/instant-estimate");
  assert.equal(estimatorHref("kitchen-remodel"), "/instant-estimate?project=kitchen-remodel");
  assert.equal(CTA_REQUEST, "Request a quote");
  assert.equal(REQUEST_PATH, "/#request");
  assert.equal(CTA_FORM_SEND, "Request a quote");
  assert.equal(/quote|estimate|instant|online/i.test(CTA_PROJECT_DETAILS), false);
  const interior = readFileSync("components/approved/InteriorLayout.tsx", "utf8");
  assert.match(interior, /label=CTA_PROJECT_DETAILS,href='\/estimate'/);
  const footerCtas = readFileSync("components/modals/FooterCTAs.tsx", "utf8");
  assert.equal(footerCtas.includes('href="/estimate"'), false);
  const plans = readFileSync("app/remodel-plans-boise/page.tsx", "utf8");
  assert.equal(plans.includes("online estimator"), false);
});
