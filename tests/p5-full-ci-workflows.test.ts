import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const EVERY_PR = ['database-safety.yml'];

const FULL_CI = [
  'p5-component-review.yml',
  'p5-conversation-verification.yml',
  'p5-document-adapter.yml',
  'p5-estimator-verification.yml',
  'p5-final-verification.yml',
  'p5-mobile-seo.yml',
  'p5-visual-review.yml',
];

const JOB_IF = "github.event_name == 'workflow_dispatch' || contains(github.event.pull_request.labels.*.name, 'full-ci')";

test('database preservation still runs on every pull request', () => {
  const text = readFileSync('.github/workflows/database-safety.yml', 'utf8');
  assert.match(text, /on: \[push, pull_request\]/);
  assert.equal(text.includes('full-ci'), false);
  assert.equal(text.includes(JOB_IF), false);
});

test('heavy workflows wait for the full-ci label or a manual dispatch', () => {
  for (const file of FULL_CI) {
    const text = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.match(text, /workflow_dispatch:/, file);
    assert.match(text, /types: \[opened, synchronize, labeled, reopened\]/, file);
    assert.match(text, /branches: \[main\]/, file);
    assert.match(text, new RegExp(JOB_IF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), file);
    assert.equal(text.includes('paths:'), false, file);
  }
  assert.equal(EVERY_PR.includes('database-safety.yml'), true);
});
