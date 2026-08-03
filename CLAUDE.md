# Boise Remodeling Co

Next.js 14 App Router, TypeScript, Tailwind, Drizzle/Postgres. Deployed on
Replit autoscale. Marketing site plus two pricing tools and an admin CRM.

## How work is done here

**Verify against reality, not fixtures.** The pattern that keeps paying off:
build the API first, run REAL customer documents through it, then build the UI
on what the numbers actually justify. A synthetic RE-10 fixture passed cleanly
while two genuine documents exposed five defects, one of which broke every
submission. The same thing happened again on the first two plan sets.

**Every guard gets a verifier.** `npm run prebuild` runs them all. When a bug
is found, add the check that would have caught it - the suites exist because
each one caught something real:

| Command | Guards |
|---|---|
| `verify:estimate` | the main estimator engine |
| `verify:re10` | 44 repair kinds, incl. market price bands |
| `verify:re10-delivery` | disclosure wall, funnel events, upload contract |
| `verify:no-em-dash` | house style, blocks the build |
| `check:re10-extraction` | live API call, NOT in prebuild (costs money) |

**tsc baseline is 23 pre-existing errors.** Not zero. Compare against 23; do
not "fix" the others as a side quest.

**Never run `db:push` against the live database.** Add the schema, then tell
the owner to run it.

## Pricing rules, learned the hard way

- **True gross margin**, never markup: `price = cost / (1 - margin)`. 50% floor.
- **Firm price, not a range.** A range anchored agents on the low end while the
  high end made us look expensive - we earned the bottom and were judged on the
  top. Firm price at the same margin-correct number was +50% effective revenue
  without raising the price.
- **Market price bands gate the build.** Being competitive is a test, not a
  preference. See `MARKET_PRICE_BAND`.
- **The disclosure wall is structural.** The customer email builder is never
  handed the internal estimate, so it cannot leak a margin. Keep it that way.
- **Nothing the customer asked for may silently vanish.** Anything not in the
  price is named and shown as excluded. This was a real bug: 7 of 20 requested
  repairs disappeared between the review screen and the quote.

## RE-10 estimator - DONE, live

`/re-10-repairs-boise`. Upload RE-10 -> Claude reads it -> customer confirms ->
firm price -> email + CRM. Verified live end to end on real documents.

Leads go to `consultationRequests` + the lead dashboard, NOT the `leads` table
(that is the Lead Marketplace, which sells leads to other contractors).

Uploads live in Postgres (`stored_files`), because the container filesystem is
ephemeral and documents were 404ing after each deploy. The RE-10 is also
attached to the internal email so a lead survives regardless.

## Plans feature - HALF BUILT, this is the open work

Goal: upload remodel/new-build drawings, price more accurately, tighter number.

Built and deployed (`8d5a8a1`, `65400e3`): `shared/plans/extraction.ts`,
`server/services/planExtract.ts`, `POST /api/plans/analyze`.
**No UI, not wired to pricing** - deliberate, so extraction could be measured
before any price depended on it.

**Test it by POSTing plan sets straight at the endpoint** (four real ones are in
`C:\Users\brost\Downloads`, "Plan Set - *" and "Permit Plans - *").

### What the first two runs showed

Both new-build sets: the ONLY printed area on the drawings was the garage.
Sixteen rooms came back null/inferred - the model correctly refused to invent
them. Both correctly refused to tighten.

**The likely reshape:** residential plans dimension walls and state a total;
they rarely tag every room with a square footage. Room-by-room area extraction
may be asking for data that is not on the page. What IS reliably there: total
conditioned SF, garage SF, room names and counts, and door/window/fixture
counts from schedules. Settle this before building the uploader.

### Still to do

1. Run the two remaining sets (Squier 19.5MB remodel, Gambardella 42-sheet
   permit set - tests in-scope detection and the size ceiling)
2. Reshape extraction around numbers that are actually printed
3. Wire to the estimator, then build the uploader (the RE-10 wizard is the
   working template)

### The gates that decide if a price may tighten

All must hold, in `app/api/plans/analyze/route.ts`. Narrowing is earned per
measurement, never granted for uploading a file - otherwise a napkin sketch
buys the same confidence as a stamped permit set.

- reads as drawings at all
- room areas agree with the stated total within 12%
- >=60% of in-scope floor area rests on printed dimensions
- >=60% of in-scope ROOMS were actually measured (coverage, not share - a
  share only divides among rooms it managed to measure, so one printed garage
  scored a perfect 1.0 while sixteen rooms were blank)
- a cross-check was possible at all (no stated total = no way to catch a
  misread = not a free pass)

`"scaled"` is deliberately excluded from trustworthy sources. A misread scale
bar produces numbers that are internally consistent and completely wrong, and
nothing downstream can detect it.

## Environment

`ANTHROPIC_API_KEY` is set in Replit Secrets (production only - not local, so
extraction cannot be tested from a dev machine without adding it to
`.env.local`). No `BLOB_READ_WRITE_TOKEN` and none wanted; storage uses
Postgres. `git pull` updates the Replit workspace but NOT the deployment -
that needs an explicit Redeploy.
