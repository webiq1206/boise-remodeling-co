import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GOOGLE_ADS_CALL_CLICK_LABEL,
  GOOGLE_ADS_TEXT_CLICK_LABEL,
  trackDelegatedContactClick,
} from "../lib/googleAdsConversion.ts";

function restore(name: "window" | "navigator", prior: PropertyDescriptor | undefined) {
  if (prior) Object.defineProperty(globalThis, name, prior);
  else delete (globalThis as Record<string, unknown>)[name];
}

function withBrowser(
  run: (calls: unknown[][]) => void,
  options: { disabled?: boolean; denied?: boolean; hostname?: string } = {},
) {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const calls: unknown[][] = [];
  const fakeWindow = {
    location: { hostname: options.hostname ?? "boiseremodeling.co" },
    sessionStorage: {
      getItem: (key: string) => (options.disabled && key === "p5_analytics_disabled" ? "1" : null),
    },
    dataLayer: options.denied ? [["consent", "update", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied" }]] : [],
    gtag: (...args: unknown[]) => calls.push(args),
    setTimeout,
  };
  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  Object.defineProperty(globalThis, "navigator", {
    value: { webdriver: false, doNotTrack: "0", globalPrivacyControl: false },
    configurable: true,
  });
  try {
    run(calls);
  } finally {
    restore("window", priorWindow);
    restore("navigator", priorNavigator);
  }
  return calls;
}

function link(href: string) {
  return {
    closest(selector: string) {
      return selector === "a[href]" ? { getAttribute: (name: string) => (name === "href" ? href : null) } : null;
    },
  };
}

test("one tel click fires the call label once, and a later click fires it again", () => {
  const calls = withBrowser(() => {
    const first = { target: link("tel:+12084771169") };
    trackDelegatedContactClick(first);
    trackDelegatedContactClick(first);
    trackDelegatedContactClick({ target: link("tel:+12084771169") });
    const sms = { target: link("sms:2084771169") };
    trackDelegatedContactClick(sms);
    trackDelegatedContactClick(sms);
    trackDelegatedContactClick({ target: link("mailto:hello@boiseremodeling.co") });
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], ["event", "conversion", { send_to: GOOGLE_ADS_CALL_CLICK_LABEL }]);
  assert.equal((calls[0][2] as { send_to: string }).send_to, "AW-18354188204/ng9fCPiOhaAdEKzf-q9E");
  assert.deepEqual(calls[1], calls[0]);
  assert.deepEqual(calls[2], ["event", "conversion", { send_to: GOOGLE_ADS_TEXT_CLICK_LABEL }]);
  assert.equal((calls[2][2] as { send_to: string }).send_to, "AW-18354188204/lTxsCOqahaAdEKzf-q9E");
});

test("call and text conversions set no user_data and send no personal data", () => {
  const phone = "+12084771169";
  const calls = withBrowser(() => {
    trackDelegatedContactClick({ target: link(`tel:${phone}`) });
    trackDelegatedContactClick({ target: link("sms:2084771169?body=Call%20Sam%20at%20hello@boiseremodeling.co") });
  });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.deepEqual(call.slice(0, 2), ["event", "conversion"]);
    assert.deepEqual(Object.keys(call[2] as object), ["send_to"]);
  }
  assert.equal(calls.some((call) => call[0] === "set" || call[1] === "user_data"), false);
  const serialized = JSON.stringify(calls);
  for (const personal of [phone, "2084771169", "hello@boiseremodeling.co", "Sam", "user_data"]) {
    assert.equal(serialized.includes(personal), false, personal);
  }
  const ads = readFileSync(new URL("../lib/googleAdsConversion.ts", import.meta.url), "utf8");
  const clickHelpers = ads.slice(ads.indexOf("export function trackGoogleAdsContactClick"));
  assert.equal(clickHelpers.includes("user_data"), false);
  assert.equal(/gtag\(\s*["']set["']/.test(clickHelpers), false);
  assert.match(clickHelpers, /gtag\("event", "conversion", \{\s*send_to:/);
});

test("analytics off and denied consent send no click conversion", () => {
  const disabled = withBrowser(() => {
    trackDelegatedContactClick({ target: link("tel:+12084771169") });
    trackDelegatedContactClick({ target: link("sms:2084771169") });
  }, { disabled: true });
  assert.equal(disabled.length, 0);

  const denied = withBrowser(() => {
    trackDelegatedContactClick({ target: link("tel:+12084771169") });
    trackDelegatedContactClick({ target: link("sms:2084771169") });
  }, { denied: true });
  assert.equal(denied.length, 0);
});

test("the privacy page states the tap, analytics, and forwarding facts", () => {
  const privacy = readFileSync(new URL("../app/privacy-policy/page.tsx", import.meta.url), "utf8");
  const text = [
    "When you tap Call or Text on our site, Google Ads is told that the tap happened, on which page, and the ad click identifier Google's tag saved if you arrived from one of our ads, so we can count calls and texts that come from our ads. The tap itself doesn't send Google your name, phone number or what you say or write.",
    "Google Analytics also records the tap, including the number tapped, which is our business number.",
    "If your call goes through a Google forwarding number, Google connects the call and can see the calling number and call length, but not what's said.",
  ].join(" ");
  assert.equal(privacy.includes(text), true);
  const section = privacy.slice(privacy.indexOf('id="cookies-analytics-advertising"'));
  const beforeNext = section.slice(0, section.indexOf('id="document-section-5"'));
  assert.equal(beforeNext.includes(text), true);
});

test("the existing click listener stays single-bound and GA4 click events stay in place", () => {
  const clicks = readFileSync(new URL("../components/ConversionTracking.tsx", import.meta.url), "utf8");
  assert.equal(clicks.match(/addEventListener\(\s*'click'/g)?.length, 1);
  assert.match(clicks, /removeEventListener\(\s*'click'/);
  assert.match(clicks, /trackDelegatedContactClick\(e\)/);
  assert.match(clicks, /trackEvent\('contact_click', \{ method: 'phone', link_url: href \}\)/);
  assert.match(clicks, /trackEvent\('contact_click', \{ method: 'sms', link_url: href \}\)/);
  assert.match(clicks, /trackEvent\('contact_click', \{ method: 'email', link_url: href \}\)/);
  assert.equal(/trackEvent\(['"]conversion/.test(clicks), false);
  const ads = readFileSync(new URL("../lib/googleAdsConversion.ts", import.meta.url), "utf8");
  assert.equal(ads.includes("addEventListener"), false);
  const estimator = readFileSync(new URL("../components/P5Estimator.tsx", import.meta.url), "utf8");
  assert.equal(estimator.includes("GOOGLE_ADS_CALL_CLICK_LABEL"), false);
  assert.equal(estimator.includes("trackDelegatedContactClick"), false);
});
