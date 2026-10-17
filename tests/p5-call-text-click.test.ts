import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GOOGLE_ADS_CALL_CLICK_LABEL,
  GOOGLE_ADS_TEXT_CLICK_LABEL,
  trackDelegatedContactClick,
  trackGoogleAdsContactClick,
} from "../lib/googleAdsConversion.ts";
import { SITE_CONFIG } from "../shared/siteConfig.ts";

function withWindow(gtag: ((...args: unknown[]) => void) | undefined, run: (timers: Array<() => void>) => void) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers: Array<() => void> = [];
  const fake = {
    gtag,
    setTimeout: (fn: () => void) => {
      timers.push(fn);
      return timers.length;
    },
  };
  Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
  try {
    run(timers);
  } finally {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else delete (globalThis as { window?: unknown }).window;
  }
}

function link(href: string) {
  return {
    closest(selector: string) {
      return selector === "a[href]" ? { getAttribute: (name: string) => (name === "href" ? href : null) } : null;
    },
  };
}

test("a tel click fires the call label once, and a second click fires it again", () => {
  const calls: unknown[][] = [];
  withWindow((...args) => calls.push(args), () => {
    const first = { target: link("tel:+12084771169") };
    trackDelegatedContactClick(first);
    trackDelegatedContactClick(first);
    trackDelegatedContactClick({ target: link("tel:+12084771169") });
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ["event", "conversion", { send_to: GOOGLE_ADS_CALL_CLICK_LABEL }]);
  assert.equal(calls[0][2] && (calls[0][2] as { send_to: string }).send_to, "AW-18354188204/ng9fCPiOhaAdEKzf-q9E");
  assert.deepEqual(calls[1], calls[0]);
});

test("an sms click fires the text label once and a mailto click fires neither ads label", () => {
  const calls: unknown[][] = [];
  withWindow((...args) => calls.push(args), () => {
    const sms = { target: link("sms:2084771169") };
    trackDelegatedContactClick(sms);
    trackDelegatedContactClick(sms);
    trackDelegatedContactClick({ target: link("mailto:hello@boiseremodeling.co") });
    trackDelegatedContactClick({ target: { closest: () => null } });
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["event", "conversion", { send_to: GOOGLE_ADS_TEXT_CLICK_LABEL }]);
  assert.equal((calls[0][2] as { send_to: string }).send_to, "AW-18354188204/lTxsCOqahaAdEKzf-q9E");
});

test("a click waits for gtag and still fires once", () => {
  const calls: unknown[][] = [];
  withWindow(undefined, (timers) => {
    assert.equal(trackGoogleAdsContactClick("call"), false);
    assert.equal(timers.length, 1);
    (globalThis as { window: { gtag: (...args: unknown[]) => void } }).window.gtag = (...args) => calls.push(args);
    timers.shift()!();
    assert.equal(calls.length, 1);
    assert.equal((calls[0][2] as { send_to: string }).send_to, GOOGLE_ADS_CALL_CLICK_LABEL);
  });
});

test("call and text controls use the site phone and the listener stays in the existing click path", () => {
  assert.equal(SITE_CONFIG.phoneHref, "tel:+12084771169");
  assert.equal(SITE_CONFIG.phoneSmsHref, "sms:2084771169");
  const nav = readFileSync(new URL("../components/Navigation.tsx", import.meta.url), "utf8");
  const headerAt = nav.indexOf('data-testid="link-call-mobile-header"');
  const textAt = nav.indexOf('data-testid="link-text-mobile-header"');
  const drawerAt = nav.indexOf('data-testid="mobile-nav-drawer"');
  assert.ok(headerAt > 0 && textAt > headerAt && headerAt < drawerAt);
  assert.ok(nav.slice(headerAt - 200, headerAt).includes("SITE_CONFIG.phoneHref"));
  assert.ok(nav.slice(textAt - 200, textAt).includes("SITE_CONFIG.phoneSmsHref"));
  const clicks = readFileSync(new URL("../components/ConversionTracking.tsx", import.meta.url), "utf8");
  assert.match(clicks, /trackEvent\('contact_click'/);
  assert.equal(/trackEvent\(['"]conversion/.test(clicks), false);
  assert.match(clicks, /trackDelegatedContactClick\(e\)/);
  const estimate = readFileSync(new URL("../components/estimate/EstimateContactBar.tsx", import.meta.url), "utf8");
  assert.match(estimate, /SITE_CONFIG\.phoneHref/);
  assert.match(estimate, /SITE_CONFIG\.phoneSmsHref/);
  assert.match(estimate, /data-site-header/);
  const layout = readFileSync(new URL("../app/estimate/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /EstimateContactBar/);
});
