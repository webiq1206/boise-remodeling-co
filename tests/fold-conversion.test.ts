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
const sessions = readFileSync("server/services/estimatorSessions.ts", "utf8");
const contactPage = readFileSync("app/contact/page.tsx", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");

test("the first screen is the photograph and headline, and the short request follows", () => {
  assert.equal(hero.includes("use client"), false);
  assert.match(hero, /<section className="f-hero">/);
  assert.equal(hero.includes("fold-hero"), false);
  const heroSection = hero.slice(hero.indexOf('<section className="f-hero">'), hero.indexOf("</section>"));
  assert.match(heroSection, /<img/);
  assert.match(heroSection, /<h1>/);
  assert.equal(heroSection.includes("HeroConversion"), false);
  assert.equal(heroSection.includes("fold-form"), false);
  assert.match(hero, /<section className="fold-request" id="request"/);
  assert.match(hero, /<HeroConversion \/>/);
  assert.doesNotMatch(css, /max-height:\s*56px/);
  assert.match(css, /min-height:\s*calc\(100svh - 84px\)/);
  assert.match(css, /min-height:\s*calc\(100svh - 70px\)/);
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
  assert.match(nav, /data-testid="link-call-mobile-header"/);
  assert.match(nav, /data-testid="link-text-mobile-header"/);
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
  assert.match(nav, /Request a quote/);
  assert.equal(nav.includes("Get an Estimate"), false);
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
