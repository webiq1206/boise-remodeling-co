import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEXT_REPLY_HOURS, textReplyLine } from '../shared/siteConfig';

const LINE =
  'Prefer to text? Text (208) 477-1169. We reply in minutes during business hours (Mon\u2013Fri 9\u20136, Sat 9\u20134 MT).';

test('text reply hours live in one constant', () => {
  assert.equal(TEXT_REPLY_HOURS, 'Mon\u2013Fri 9\u20136, Sat 9\u20134 MT');
  assert.equal(textReplyLine(), LINE);
  assert.equal(textReplyLine('(208) 477-1169'), LINE);

  const siteConfig = readFileSync('shared/siteConfig.ts', 'utf8');
  const hourLiterals = siteConfig.match(/Mon\u2013Fri 9\u20136, Sat 9\u20134 MT/g) ?? [];
  assert.equal(hourLiterals.length, 1);

  const contact = readFileSync('app/contact/page.tsx', 'utf8');
  assert.match(contact, /\{textReplyLine\(\)\}/);
  assert.equal(contact.includes('Message us instead'), false);
  assert.equal(contact.includes('Mon\u2013Fri 9\u20136'), false);
});
