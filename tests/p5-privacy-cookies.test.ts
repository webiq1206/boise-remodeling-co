import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/privacy-policy/page.tsx', import.meta.url), 'utf8');

test('the privacy page adds the cookies section without removing the existing policy', () => {
  assert.match(page, /Last updated: October 17, 2026/);
  assert.match(page, /Cookies, analytics and advertising/);
  assert.match(page, /We use Google Analytics 4 \(GA4\)/);
  assert.match(page, /Google's tag also adds visitors to remarketing lists, and Google may use this data to show you relevant ads on other websites \(remarketing\)\./);
  assert.match(page, /When you successfully submit a form or finish the estimator with your contact details, our site passes whichever of these you provide \(your email address, phone number, first name, last name and ZIP code\) to Google's advertising tag, which converts them into a scrambled code \(a SHA-256 hash\) before sending them to Google, which matches that code against its own records to tell us which of our ads lead to inquiries\. We do not send your street address or your project description to Google\. Google Analytics receives only the type of project you choose \(for example, an addition or an ADU\) and a random reference number for your inquiry when you use the estimator or send an inquiry\. Google Ads receives a random reference number for your inquiry so each lead is counted only once\./);
  assert.equal(page.includes('We do not currently send your name, email, phone number, address or project description to Google'), false);
  assert.match(page, /Calls from our site or ads may be routed through a Google forwarding number so we can measure which ads lead to calls\./);
  assert.equal(page.includes('We do not send your name, email, phone number or project details to Google.'), false);
  assert.match(page, /https:\/\/policies\.google\.com\/privacy/);
  assert.match(page, /https:\/\/adssettings\.google\.com/);
  assert.match(page, /https:\/\/tools\.google\.com\/dlpage\/gaoptout/);
  assert.match(page, /We also use the Meta Pixel and Meta's Conversions API to measure visits and inquiries from our Facebook and Instagram ads\./);
  assert.match(page, /the type of project you choose, a project-inquiry label, an inquiry id, the web address of the page you are on, your IP address, your browser's user agent, and the Meta cookies _fbp and _fbc/);
  assert.match(page, /https:\/\/www\.facebook\.com\/privacy\/policy/);
  assert.equal(page.includes('hashed email'), false);
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
