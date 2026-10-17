import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page = readFileSync(new URL('../app/privacy-policy/page.tsx', import.meta.url), 'utf8');

test('privacy policy states what Google and Meta actually receive', () => {
  assert.match(page, /We do not currently send your name, email, phone number or project details to Google\./);
  assert.match(page, /Google's tag also adds visitors to remarketing lists, and Google may use this data to show you relevant ads on other websites \(remarketing\)\./);
  assert.equal(page.includes('Google may also use information collected by its tags to personalise ads.'), false);
  assert.match(page, /href="https:\/\/adssettings\.google\.com"/);
  assert.match(page, /href="https:\/\/tools\.google\.com\/dlpage\/gaoptout"/);
  assert.match(page, /We also use the Meta Pixel and Meta's Conversions API to measure visits and inquiries from our Facebook and Instagram ads\./);
  assert.match(page, /a Lead event with the project type, the category project inquiry, the page address, an inquiry id, your IP address, your browser user agent, and the Meta cookies _fbp and _fbc when those cookies are present/);
  assert.match(page, /https:\/\/www\.facebook\.com\/privacy\/policy/);
  assert.equal(page.includes('hashed email'), false);
  assert.equal(page.includes('hashed phone'), false);
});
