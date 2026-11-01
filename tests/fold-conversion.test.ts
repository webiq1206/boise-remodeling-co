import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync("components/approved/ApprovedHomeHero.tsx", "utf8");
const convert = readFileSync("components/approved/HeroConversion.tsx", "utf8");
const home = readFileSync("components/approved/ApprovedHome.tsx", "utf8");
const intake = readFileSync("components/approved/OptionalIntake.tsx", "utf8");
const route = readFileSync("app/api/consultation/route.ts", "utf8");
const chat = readFileSync("components/assistant/AssistantWidget.tsx", "utf8");
const css = readFileSync("app/design-refresh.css", "utf8");
const nav = readFileSync("components/Navigation.tsx", "utf8");
// The header and bar are the shared family components; this site sets them up in lib/familyBrand.ts.
const header = readFileSync("components/family/SiteHeader.tsx", "utf8");
const bar = readFileSync("components/family/MobileActionBar.tsx", "utf8");
const brand = readFileSync("lib/familyBrand.ts", "utf8");
const sessions = readFileSync("server/services/estimatorSessions.ts", "utf8");
const contactPage = readFileSync("app/contact/page.tsx", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");

// Phase 2 family chrome (intended change): the hero is the shared HeroPhoto, and the short
// request moved from under the hero to the final CTA band, where #request and #request-form
// still hold it. Every primary CTA (hero, header, bar) points there.
test("the first screen is the photograph and headline, and the short request is the final ask", () => {
  assert.equal(hero.includes("use client"), false);
  assert.match(hero, /<HeroPhoto/);
  assert.match(hero, /<ProofStrip/);
  assert.equal(hero.includes("HeroConversion"), false);
  assert.equal(hero.includes("fold-form"), false);
  assert.match(hero, /primary=\{\{ label: FAMILY_BRAND\.cta\.label, href: FAMILY_BRAND\.cta\.href \}\}/);
  assert.match(brand, /cta: \{ label: 'Request a quote', href: '\/#request' \}/);
  assert.match(homePage, /<div id="request"/);
  assert.match(homePage, /<HeroConversion \/>/);
  assert.ok(homePage.indexOf("<HeroConversion />") < homePage.indexOf("<ConsultationForm />"));
  assert.doesNotMatch(css, /max-height:\s*56px/);
  // C3/C6/C7: header + bottom-bar tokens the estimate wizard still reads.
  assert.match(css, /--site-header-h:\s*76px/);
  assert.match(css, /--site-header-h:\s*64px/);
  assert.match(css, /--site-bottom-bar-h:\s*calc\(72px/);
  assert.match(bar, /data-mobile-nav-bar=""/);
  assert.match(brand, /phoneActions: \['call', 'text'\]/);
  assert.match(convert, /className="fold-call"/);
  assert.match(convert, /className="fold-chat"/);
  assert.match(convert, /p5:assistant-open/);
  assert.match(convert, /type="file"/);
  assert.match(convert, /image\/heic/);
  // Owner request (1 November 2026): the easiest form there is. Email became optional on the
  // short request (validated when typed, required when "Email me" is chosen) and stays required
  // on the full consultation form. The labels the shared entry check reads stay as they were
  // (scripts/lib/shortBrandEntry.mjs: "Send request", "Email", "What should we look at?").
  assert.match(convert, /Send request/);
  assert.match(convert, /data-clarity-mask="True"/);
  assert.match(convert, /type="email"/);
  assert.match(convert, /Optional\. For a written copy of your request\./);
  assert.match(convert, /if \(cleanEmail && !validEmail\(cleanEmail\)\) errors\.email/);
  assert.match(convert, /!cleanEmail && reach === "email"/);
  assert.match(route, /email: z\.string\(\)\.email\(\)/);
  assert.match(route, /data\.contactPreference === "email" && !data\.email/);
  assert.match(route, /if \(!data\.email\) \{\s*ctx\.addIssue/);
  assert.match(header, /data-testid="link-call-mobile-header"/);
  assert.match(header, /data-testid="link-text-mobile-header"/);
  assert.match(contactPage, /<ConsultationForm/);
  assert.match(homePage, /<ConsultationForm/);
});

// Owner request (1 November 2026): every Request a quote lands ON the form, the form is the
// simplest one there is, and calling or being called back is always beside it.
test("the short request is one native step with call, text and a callback beside it", () => {
  // Order of the visible fields: name, phone, what they need, photos, email, how to reach them.
  const order = ['htmlFor={ids("name")}', 'htmlFor={ids("phone")}', 'htmlFor={ids("note")}', 'htmlFor={ids("files")}', 'htmlFor={ids("email")}', "How should we reach you?"].map((marker) => convert.indexOf(marker));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), "field order");
  assert.match(convert, /autoComplete="name"/);
  assert.match(convert, /type="tel"[\s\S]{0,40}inputMode="tel"[\s\S]{0,40}autoComplete="tel"/);
  assert.match(convert, /<textarea[\s\S]{0,300}rows=\{3\}/);
  assert.match(convert, /Add photos \(optional\)/);
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
  assert.match(convert, /trackAcceptedInquiry\(data, PROJECT_TYPE\)/);
  assert.match(convert, /body\.set\("callback", "1"\)/);
  assert.match(route, /CALLBACK REQUEST: call/);
  assert.match(route, /Preferred contact:/);
  // The contact page short form is this same form.
  const consult = readFileSync("components/ConsultationForm.tsx", "utf8");
  assert.match(consult, /if \(variant === "short"\) return <HeroConversion blockId="contact-request-form" recovery \/>;/);
});

// Owner request (1 November 2026): every primary CTA lands on the form, not on a section intro.
test("#request and #consult land on the form block, not on an intro", () => {
  const request = homePage.indexOf('<div id="request"');
  assert.ok(request > 0 && request < homePage.indexOf('<p className="ed-eyebrow">Begin a conversation</p>'), "the form leads the closing section");
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
  assert.match(route, /SHORT_MAX_FILES/);
  assert.match(route, /Home repair or remodel/);
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
