import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextReplyLine } from '../components/TextReplyLine';
import { CONTACT_FAQS } from '../shared/content/contactFaqs';
import { GBP_MESSAGING, GBP_QA_SEED } from '../shared/gbpProfile';
import { TEXT_REPLY_HOURS, textReplyLine, textReplySmsHref } from '../shared/siteConfig';

const LINE =
  'Prefer to text? Text (208) 477-1169. We reply in minutes during business hours (Mon\u2013Fri 9\u20136, Sat 9\u20134 MT).';

/** Not a customer reply promise. Left unchanged on purpose. */
const SKIP = new Set([
  'shared/content/re10Content.ts',
  'shared/siteContent.ts',
  'server/services/assistantTools.ts',
  'server/services/estimatorSessionEmail.ts',
]);

const MARKER = /<TextReplyLine|textReplyLine\(|textReplyLineHtml\(|Prefer to text\?/;

function filesUnder(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      filesUnder(full, acc);
      continue;
    }
    if (/\.(ts|tsx|md)$/.test(name) && !full.includes(`${path.sep}tests${path.sep}`)) acc.push(full);
  }
  return acc;
}

test('text reply hours live in one constant and the phone is an sms link', () => {
  assert.equal(TEXT_REPLY_HOURS, 'Mon\u2013Fri 9\u20136, Sat 9\u20134 MT');
  assert.equal(textReplyLine(), LINE);
  assert.equal(textReplySmsHref(), 'sms:+12084771169');
  const siteConfig = readFileSync('shared/siteConfig.ts', 'utf8');
  assert.equal((siteConfig.match(/Mon\u2013Fri 9\u20136, Sat 9\u20134 MT/g) ?? []).length, 1);

  const html = renderToStaticMarkup(createElement(TextReplyLine));
  assert.match(html, /href="sms:\+12084771169"/);
  assert.equal(html.replace(/<[^>]+>/g, ''), LINE);
  assert.equal(html.includes('onClick'), false);
});

test('the one-business-day reply stays, and the text line follows it', () => {
  const response = CONTACT_FAQS[0];
  assert.equal(response?.question, 'How quickly will you respond to my inquiry?');
  assert.ok(response?.answer.startsWith('We respond within one business day. '));
  assert.ok(response?.answer.includes(`We respond within one business day. ${LINE} Call us during business hours`));

  assert.ok(GBP_MESSAGING.welcomeMessage.includes(`We respond within one business day. ${LINE} For faster help`));
  const started = GBP_QA_SEED.find((entry) => entry.question === 'How do I get started?');
  assert.ok(started?.answer.endsWith(`We respond within one business day. ${LINE}`));

  const contact = readFileSync('app/contact/page.tsx', 'utf8');
  assert.match(contact, /Prefer to text\? Message us instead/);
  assert.match(contact, /Mon – Fri 7 am – 6 pm · Sat 8 am – 4 pm/);
  assert.match(readFileSync('shared/siteContent.ts', 'utf8'), /"Response within one business day"/);
  for (const file of ['app/page.tsx', 'app/contact/page.tsx', 'components/ConsultationForm.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /=== "Response within one business day"/);
    assert.match(source, /<TextReplyLine/);
  }

  const root = process.cwd();
  const misses: string[] = [];
  for (const full of filesUnder(root)) {
    const rel = path.relative(root, full);
    if (SKIP.has(rel)) {
      assert.equal(readFileSync(full, 'utf8').includes('Prefer to text?'), false, rel);
      continue;
    }
    const source = readFileSync(full, 'utf8');
    let from = 0;
    while (from < source.length) {
      const at = source.indexOf('one business day', from);
      if (at < 0) break;
      const after = source.slice(at);
      if (!MARKER.test(after)) misses.push(`${rel}:${source.slice(0, at).split('\n').length}`);
      from = at + 'one business day'.length;
    }
  }
  assert.deepEqual(misses, []);
});
