/**
 * Build guard: fail if an inquiry response-time promise ("within one business
 * day", "we reply in minutes", "24-hour reply" and the like) appears in
 * customer-facing source, emails, assistant output, llms files, GBP copy or
 * docs. The patterns and the narrow allowlist live in
 * scripts/lib/responsePromiseGuard.ts, shared with tests/p5-text-reply-line.test.ts.
 *
 * Run: npm run verify:no-response-promise   (runs in prebuild)
 */
import { scanRepositoryForResponsePromises } from './lib/responsePromiseGuard';

const problems = scanRepositoryForResponsePromises();
if (problems.length) {
  console.error(`verify:no-response-promise FAILED: ${problems.length} response-time promise(s). Say we answer, with no timing.`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('verify:no-response-promise passed: no inquiry response-time promises found.');
