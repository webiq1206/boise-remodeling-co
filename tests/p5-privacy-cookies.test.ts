import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/privacy-policy/page.tsx', import.meta.url), 'utf8');

test('the privacy page adds the cookies section without removing the existing policy', () => {
  assert.match(page, /Last updated: October 17, 2026/);
  assert.match(page, /Cookies, analytics and advertising/);
  assert.match(page, /We use Google Analytics 4 \(GA4\)/);
  assert.match(page, /Google Analytics receives the type of project you choose when you use the estimator or send an inquiry, and a random reference number for your inquiry when you send one\./);
  assert.match(page, /Google Ads receives a random reference number for your inquiry so each lead is counted only once\./);
  assert.match(page, /If your call goes through a Google forwarding number, Google connects the call and can see the calling number and call length, but not what's said\./);
  assert.match(page, /Depending on Meta's settings, the pixel may also collect contact details you type into a form, in hashed form\./);
  assert.match(page, /the type of project you chose and an inquiry category, the page address, the event time, a matching event id/);
  assert.match(page, /only until you close the tab/);

  assert.equal(page.includes('We do not send your name, email, phone number or project details to Google.'), false);
  assert.match(page, /https:\/\/policies\.google\.com\/privacy/);
  assert.match(page, /We also use the Meta Pixel and Meta's Conversions API to measure visits and inquiries from our Facebook and Instagram ads\./);
  assert.match(page, /https:\/\/www\.facebook\.com\/privacy\/policy/);
  assert.match(page, /Meta's pixel may also record which buttons you click and basic information about the page, such as its title\./);
  assert.match(page, /We also use Microsoft Clarity to see how visitors use our pages through heatmaps and session recordings; form fields are masked so what you type is not recorded\./);
  assert.match(page, /Microsoft processes this under its own privacy statement/);
  assert.match(page, /https:\/\/privacy\.microsoft\.com\/privacystatement/);
  assert.equal(page.includes('CLARITY-PLACEHOLDER'), false);
  assert.equal(page.includes('wording pending Larry'), false);
  assert.match(page, /Boise Remodeling Co \("we," "our," or "us"\) is committed to protecting your privacy\./);
  assert.match(page, /We do not sell your personal information\./);
  assert.equal(page.includes(String.fromCharCode(8212)), false);
});
