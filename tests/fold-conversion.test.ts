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
  assert.match(convert, /Send request/);
  assert.match(convert, /data-clarity-mask="True"/);
  assert.match(convert, /name="email"[\s\S]{0,180}required/);
  assert.match(convert, /type="email"/);
  assert.match(convert, /!email\.includes\("@"\)/);
  assert.match(route, /email: z\.string\(\)\.email\(\)/);
  assert.match(header, /data-testid="link-call-mobile-header"/);
  assert.match(header, /data-testid="link-text-mobile-header"/);
  assert.match(contactPage, /<ConsultationForm/);
  assert.match(homePage, /<ConsultationForm/);
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
