import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextReplyLine } from '../components/TextReplyLine';
import { CONTACT_FAQS } from '../shared/content/contactFaqs';
import { GBP_MESSAGING, GBP_QA_SEED } from '../shared/gbpProfile';
import { CTA_FORM_MICROCOPY } from '../shared/ctaCopy';
import { CONSULT_BULLETS, HERO_STATS } from '../shared/siteContent';
import { TEXT_REPLY_HOURS, textReplyLine, textReplyLineHtml, textReplySmsHref } from '../shared/siteConfig';
import { findResponsePromises, scanRepositoryForResponsePromises } from '../scripts/lib/responsePromiseGuard';

// Owner instruction (P5 family audit R03): say we answer, never how fast.
// This file used to assert the old one-business-day and "reply in minutes"
// promises. It now guards against them coming back.
const LINE =
  'Prefer to text? Text (208) 477-1169. Texting hours: Mon–Fri 9–6, Sat 9–4 MT.';
const ANSWER = 'We answer your questions and help you work out the next step.';

test('text hours live in one constant, the phone is an sms link, and no reply speed is promised', () => {
  assert.equal(TEXT_REPLY_HOURS, 'Mon–Fri 9–6, Sat 9–4 MT');
  assert.equal(textReplyLine(), LINE);
  assert.equal(textReplySmsHref(), 'sms:+12084771169');
  const siteConfig = readFileSync('shared/siteConfig.ts', 'utf8');
  assert.equal((siteConfig.match(/Mon–Fri 9–6, Sat 9–4 MT/g) ?? []).length, 1);

  const html = renderToStaticMarkup(createElement(TextReplyLine));
  assert.match(html, /href="sms:\+12084771169"/);
  assert.equal(html.replace(/<[^>]+>/g, ''), LINE);
  assert.equal(html.includes('onClick'), false);
  assert.equal(textReplyLineHtml().replace(/<[^>]+>/g, ''), LINE);

  for (const text of [LINE, html, textReplyLineHtml()]) {
    assert.deepEqual(findResponsePromises(text), [], text);
    assert.doesNotMatch(text, /minute|business day|24|fast|quick|instant|same day/i);
  }
});

test('contact FAQ, GBP copy and form microcopy say we answer, with no response time', () => {
  const contact = CONTACT_FAQS[0];
  assert.equal(contact?.question, 'How do I ask a question about my project?');
  assert.ok(contact?.answer.includes(ANSWER));
  assert.ok(contact?.answer.includes(LINE));

  assert.ok(GBP_MESSAGING.welcomeMessage.includes(`${ANSWER} ${LINE}`));
  assert.doesNotMatch(GBP_MESSAGING.welcomeMessage, /faster|sooner/i);
  const started = GBP_QA_SEED.find((entry) => entry.question === 'How do I get started?');
  assert.ok(started?.answer.endsWith(`${ANSWER} ${LINE}`));

  assert.ok(CTA_FORM_MICROCOPY.includes(ANSWER));
  assert.ok(CONSULT_BULLETS.includes('We answer your questions' as (typeof CONSULT_BULLETS)[number]));
  // The SLA counter slot became a non-numeric accountability statement, not a new statistic.
  const questions = HERO_STATS.find((stat) => stat.label === 'Your questions');
  assert.equal(questions?.num, 'We answer them');

  const surfaces = [
    ...CONTACT_FAQS.map((faq) => `${faq.question} ${faq.answer}`),
    GBP_MESSAGING.welcomeMessage,
    ...GBP_QA_SEED.map((entry) => `${entry.question} ${entry.answer}`),
    CTA_FORM_MICROCOPY,
    ...CONSULT_BULLETS,
    ...HERO_STATS.map((stat) => `${stat.num} ${stat.label}`),
  ];
  for (const text of surfaces) assert.deepEqual(findResponsePromises(text), [], text);

  // The consultation form attaches the text line to the "we answer" bullet; a renamed bullet would orphan it.
  assert.match(readFileSync('components/ConsultationForm.tsx', 'utf8'), /item === "We answer your questions"/);
  // F4: one Prefer-to-text line per page, in the form block only.
  assert.match(readFileSync('app/page.tsx', 'utf8'), /<TextReplyLine/);
  assert.match(readFileSync('app/contact/page.tsx', 'utf8'), /<TextReplyLine/);
  assert.match(readFileSync('components/ConsultationForm.tsx', 'utf8'), /<TextReplyLine/);
  assert.match(readFileSync('app/contact/page.tsx', 'utf8'), /Mon – Fri 9 am – 6 pm · Sat 9 am – 4 pm MT/);
  assert.doesNotMatch(readFileSync('app/contact/page.tsx', 'utf8'), /Mon – Fri 7 am|Sat 8 am/);
});

test('the guard catches the old promises, including split and JSX variants', () => {
  for (const old of [
    'We respond within one business day.',
    'We reply within 1 business day with questions.',
    'Response within one\n   business day',
    'We reply in minutes during business hours (Mon–Fri 9–6).',
    'A quick call or text answers most questions in a minute.',
    'We will call you back within 24 hours.',
    'Expect a 24-hour reply.',
    'Send a few details and we will reach out within one business day to schedule',
    'We reply{" "}\n  within one business day.',
    'one-business-day reply',
  ]) {
    assert.notDeepEqual(findResponsePromises(old), [], old);
  }
  // Not response promises: cancellation notice, work durations, visit length, staff review checklist.
  for (const fine of [
    'Cancellation of scheduled services requires 24-hour advance notice',
    'A refresh may take 4 to 6 weeks.',
    'Your free 60 to 90 minute in-home visit',
    'Respond to all reviews within 48 hours',
    'We call during business hours.',
  ]) {
    assert.deepEqual(findResponsePromises(fine), [], fine);
  }
});

test('no customer-facing source, email, llms file, GBP copy or doc promises a response time', () => {
  assert.deepEqual(scanRepositoryForResponsePromises(), []);
});
