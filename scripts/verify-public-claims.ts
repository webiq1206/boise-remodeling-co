/**
 * Build guard: fail if an unsupported public claim appears in customer-facing
 * source, emails, assistant output, llms files, GBP or outreach copy, or docs:
 * "bonded", workmanship coverage that includes subcontractors, a universal
 * one contract / one invoice promise, an instant or minutes-fast estimate,
 * same-day financing approval, recurring billing or a 48-hour satisfaction
 * window. Patterns live in scripts/lib/publicClaimsGuard.ts, shared with
 * tests/public-claims-guard.test.ts.
 *
 * Run: npm run verify:public-claims   (runs in prebuild)
 */
import { scanRepositoryForPublicClaims } from './lib/publicClaimsGuard';

const problems = scanRepositoryForPublicClaims();
if (problems.length) {
  console.error(`verify:public-claims FAILED: ${problems.length} unsupported public claim(s).`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('verify:public-claims passed: no bonded, subcontractor-coverage, one-invoice, instant-estimate, same-day-approval, recurring-billing or 48-hour claims found.');
