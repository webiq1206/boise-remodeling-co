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
| `verify:estimate` | the main estimator engine, incl. takeoff-with-override reconciliation |
| `verify:cost-pricing` | the quoted-price engine: margin guards, duplicate codes, GOLDEN_QUOTED exact-dollar table |
| `verify:estimator-e2e` | page -> route -> email agreement for the guide estimator |
| `verify:estimate-routes` | executes the actual POST handlers (the only suite that does) |
| `verify:re10` | 44 repair kinds, incl. market price bands, asserted on `quotedPrice` |
| `verify:re10-delivery` | disclosure wall, funnel events, upload contract, traversal keys |
| `verify:plans` | the gates that let a plan set tighten a price |
| `verify:plans-delivery` | plans disclosure wall, funnel events, request contract |
| `verify:documents` | page pipeline: pagination, coverage, merge, dedup, conflicts, readiness |
| `verify:no-em-dash` | house style, blocks the build |
| `check:re10-extraction` | live API call, NOT in prebuild (costs money) |
| `check:large-documents` | 104-sheet set + 62-item RE-10 against the real API, NOT in prebuild |

`verify:cost-pricing` and `verify:estimator-e2e` sat orphaned for months -
passing, and run by nothing. If a suite exists, it goes in prebuild. The
GOLDEN_QUOTED table pins exact dollars at every project x finish x baseline
size because invariants cannot catch a uniform repricing; when a price is
changed ON PURPOSE, update the goldens in the same commit and say why.

`verify:estimate-routes` exists because every audited defect that reached
production lived in the route layer, where no other suite executes: zod
stripping a field, rounding after the margin guard, a traversal URL in the
document list. It imports the POST handlers and calls them with constructed
Requests, after scrubbing delivery env vars so accepted requests are pure
computation (no email, no DB row, no CRM forward) even where secrets exist.

**tsc baseline is 22 pre-existing errors.** Not zero. Compare against 22; do
not "fix" the others as a side quest.

**Never run `db:push` against the live database.** Add the schema, then tell
the owner to run it.

## Pricing rules, learned the hard way

- **True gross margin**, never markup: `price = cost / (1 - margin)`. The two
  engines run DIFFERENT margin policies on purpose: RE-10 repairs floor at 50%
  (`RE10_MARGIN_FLOOR` - small jobs, real mobilization cost), the main remodel
  engine targets 30% with a 22% floor (`shared/costs/pricing.ts` - competitive
  whole-project work). Do not "unify" them.
- **Guards run on `quotedPrice`, the number the customer sees.** Rounding to a
  step is the LAST operation, so any floor or band check on `sellingPrice` is
  checking a number nobody is quoted - that exact gap once put 23% of sampled
  RE-10 lists below the margin floor. If rounding would breach the floor, round
  UP to the next step.
- **Pricing anomalies are alerted, not swallowed**: `logPricingAlert()` in
  `server/services/pricingAlerts.ts` (grep logs for `[pricing-alert]`), and the
  alert kinds ride the CRM passthrough `estimate` object so the lead itself
  says its price needed attention.
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
  repairs disappeared between the review screen and the quote. It recurred in
  a second form: repairs the customer toggled OFF on review vanished from the
  quote, the disclosure, both emails and the CRM. Exclusions travel too.
- **Flagged, deliberately NOT changed** (business numbers, owner's call):
  `planningFrom` and GBP starting prices drift from engine floors (GBP
  whole-home $180k sits above the engine's mid-range ceiling); the main
  estimator carries no waste factors because the back-test calibration was fit
  without them - adding waste on top would double-count it.

## RE-10 estimator - DONE, live

`/re-10-repairs-boise`. Upload RE-10 -> Claude reads it -> customer confirms ->
firm price -> email + CRM. Verified live end to end on real documents.

Leads go to `consultationRequests` + the lead dashboard, NOT the `leads` table
(that is the Lead Marketplace, which sells leads to other contractors).

Uploads live in Postgres (`stored_files`), because the container filesystem is
ephemeral and documents were 404ing after each deploy. The RE-10 is also
attached to the internal email so a lead survives regardless.

## Plans feature - BUILT END TO END, needs a redeploy

Goal: upload remodel/new-build drawings, price more accurately, tighter number.

`/remodel-plans-boise`. Upload plans -> Claude reads them -> customer confirms
the measurements AND supplies the total square footage -> planning range ->
email + CRM. Same four-step shape as the RE-10 wizard, same lead destinations
(`consultationRequests` + lead dashboard, never the `leads` marketplace table).

Files: `shared/plans/{extraction,estimateInput,analyticsEvents}.ts`,
`shared/content/plansContent.ts`, `server/services/{planExtract,planEmail,planLead}.ts`,
`app/api/plans/{analyze,estimate}/route.ts`, `components/plans/PlansWizard.tsx`.

**The estimate route re-runs the gates server-side** on whatever the client
posts back, so a browser cannot talk its way past one, and there is nowhere in
the request body to put a price. The client IS allowed to send corrected rooms:
corrections are the feature, exactly as on the RE-10.

**Failing the gates is not an error.** Three of the four real sets do not clear
them. Those customers still get a range, built from the total they gave us, and
the result screen says plainly that the drawings were not used and why. Verified
against both real reads: Squier prices from drawings at $120,000 to $165,000,
Gambardella falls back and names its two blockers.

### What a plan set actually buys: a truer centre, NOT a narrower band

`planMeasurements()` returns null unless `assessPlanQuality().canTightenPrice`,
and null means the estimator runs exactly as it does with no plans. What crosses
when it does pass is floor area, ceiling height and bathroom count - all
existing `ScopeSelections` fields, so **the cost engine was not modified at
all.** Verified against the real reads: Squier plus a customer-supplied total
gives 1,714 SF over 9 rooms and prices $120,000 to $165,000.

**Do not narrow the band because a plan set arrived.** The 15% half-band comes
from five back-tested jobs at 0.96, 1.25, 1.00, 1.01 and 0.99 of the engine, and
every one of those had a KNOWN floor area. That spread is estimator variance,
not input error, so better drawings do nothing to reduce it. `verify:plans`
fails if the band moves.

### Two perimeters, because they are two different lengths

`Dimensions.perimeter` and `wallArea` are GONE. They meant whichever length the
reading rule happened to want, which was survivable only while every quantity
came from one floor-area number. Now:

| Field | Read by | Fed by plans? |
|---|---|---|
| `interiorPerimeter` / `interiorWallArea` | trim, backsplash, bathroom tile | yes, summed room by room |
| `envelopePerimeter` / `envelopeWallArea` | footings, gutters, windows, insulation | never |

On Squier those read 490 ft and 169 ft. Feeding the measured figure to all of
them would have priced 2.9x the footings an addition needs. The envelope stays
derived because a drawing prints a dimension CHAIN, not an outline - the same
finding that killed the footprint cross-check.

**The split is behaviour-preserving with no plan input**: both perimeters fall
back to the same derived value, verified by hashing 17,280 priced combinations
across every project, finish, size and scope before and after. The back-test
calibration is untouched. Summing rooms does correct a real understatement -
Squier's trim goes 338 to 980 LF - but that is about 1% of a whole-home total,
so do not expect the split alone to move a headline number.

Do not add a rule that reads a perimeter without deciding which one it means;
the ambiguous names were removed so that choice cannot be skipped.

Two traps the verifier locks down: a water closet is not a bathroom (Squier tags
Bath 1, Guest Bath and W.C. 1 on one floor - that is two bathrooms), and on a
`bathroom` project the takeoff MULTIPLIES by `bathroomCount`, so the area must be
divided per bathroom or two baths price as four.

**Test it by POSTing plan sets straight at the endpoint** (four real ones are in
`C:\Users\brost\Downloads`, "Plan Set - *" and "Permit Plans - *"). The API key
is production-only, so this means POSTing at
`https://boiseremodeling.co/api/plans/analyze`, which runs the DEPLOYED build,
not your working tree. Re-gate saved responses locally with
`assessPlanQuality()` before trusting the `quality` block that comes back.

### What all four runs showed

| Set | Result |
|---|---|
| 2 new builds | Only printed area on the sheets was the garage. 16 rooms null. |
| Gambardella, 42-sheet permit | 33 rooms, 11 "printed", coverage 0.33. Blocked. |
| Squier, 18-sheet schematic remodel | 28 rooms, nearly all printed, coverage 0.90. Blocked only for want of a stated total. |

**The reshape hypothesis was WRONG. Do not act on it.** Residential plans do
not uniformly skip room areas: the Squier remodel tags EVERY room on every
floor plan ("Grand Living Room 538 SF", "Kitchen 303 SF"), and where a tag was
illegible the model returned null instead of guessing. Whether rooms carry
areas is a property of the drafting office, not of residential plans. Ripping
out room-level extraction would have thrown away the best data in the corpus.

**What actually blocks good reads is the cross-check, not the measurements.**
Squier scored coverage 0.90 and trusted share 1.00 and was still blocked,
because no sheet in eighteen states a total conditioned area, and `agree ===
null` is a blocker by design.

### The second cross-check: SETTLED, and it is not on the drawing

The footprint dimensions were the candidate and they do NOT work. Settled by
rendering sheet A105 and reading it, not by argument. The full reasoning is in
the comment above `areasAgree()`; the short version:

- what is printed is a dimension CHAIN, not an outline (74'-7" splits into
  22'-7" and 51'-6"; the bottom reads 64'-2" and 21'-4"), and area needs the
  polygon. Only a bounding rectangle is derivable and the plan is nowhere near
  rectangular
- reading the same sheet at full resolution, overall depth is anywhere between
  27'-5" and about 48' depending on which chain is the outer one, so the box
  lands between ~2,000 and ~3,600 SF. A reference with 75% uncertainty cannot
  police a 12% tolerance
- room tags do not tile the floor anyway (hallways, stairs, storage under the
  stairs and "closet by others" carry no tag), and on a remodel the in-scope
  rooms are a subset of the building - which is exactly the case that lacks a
  stated total

Any band loose enough to admit Squier (tagged area ~47% of its bounding box)
would also admit a read that had doubled every room.

**Per-room corroboration was the other candidate and is also dead**: A105 tags
rooms as name plus SF ("KITCHEN 303 SF") with no L x W dimension string, so
there is no second number per room to check the tag against.

**So the second statement comes from the customer.** They know their square
footage, it is genuinely independent of our read of the sheets, and this flow
already reads first and prices only after they confirm what we read. Do not
weaken `areasAgree`; ask for the number. `verify:plans` carries the Squier read
twice, blocked and then allowed by that one number, so the path cannot silently
close.

What the sheets DO carry reliably, and what the uploader should lean on: door
and window schedules, inline rough-opening callouts on every window, and room
area tags where the drafting office prints them.

**The trusted-share-of-nothing failure has now appeared three times**, each in a
new disguise. On Gambardella the eleven "printed rooms" were not rooms at all,
they were the cover sheet's area tabulation ("MAIN LEVEL: 1,370 SF"), and
`roomAreaTotalSqFt` was summed from a subset of those same lines - so
`areasAgree: true` compared the stated total against itself. Coverage was the
only gate that held. Expect this shape again.

**The size ceiling is not measured in bytes and cannot be.** 13.2MB / 27 sheets
of scanned Gambardella went through; 4.7MB / 5 sheets of vector Squier was
rejected outright, though each of those five read fine alone. What the API
carries is the RASTERISED sheet, and a 36x24 drawing with text outlined to
curves is far heavier than a scan of the same size. `MAX_TOTAL_UPLOAD_BYTES`
(24MB) never fires for the sets that actually fail. That rejection used to
surface as the generic "We could not read those drawings"; it now maps to
`too-large` and the "send the floor plans and schedules" advice.

### Still to do

1. ~~Redeploy~~ **DONE, confirmed 2026-08-06.** `819c587` (coverage gate,
   `/remodel-plans-boise`, estimate route all included) was published to
   production at `2026-08-05 19:37:49 UTC`, build `d323a4be-ae22-4f6e-ae1f-
   572d702065f7` - the `ba01e70` "Published your App" marker commit on
   `origin/main`. Checked live: `https://boiseremodeling.co/remodel-plans-boise`
   serves the real four-step wizard, not a 404. Local, `origin/main`, and
   production are all the same commit right now.
2. **Verify the wizard live on real drawings.** Still open - the redeploy
   landing does not by itself satisfy this. The analyze step cannot run locally
   (the API key is production-only), so the four sets have only gone through
   the endpoint directly, never through the UI, and the measure/contact/result
   steps were only driven with the analyze response stubbed in the browser.
   Now that production has the route, upload a real set through
   `/remodel-plans-boise` and confirm a real read reaches the confirm-
   measurements screen.
3. ~~Add `ANTHROPIC_API_KEY` to `.env.local`~~ **DONE, verified 2026-08-07.**
   The key is in `.env.local` (gitignored, never commit it) and
   `check:re10-extraction` ran the whole chain against the live API from this
   machine: synthetic RE-10 read in 16s, 6 repairs mapped, foundation crack
   correctly routed to review. The owner should ROTATE this key once the
   current project wraps, since it transited chat. Note: the tsx scripts load
   it via `--env-file-if-exists=.env.local`; `next dev` loads it natively.

**Rendering a sheet to look at it yourself** needs `pdf-to-img` (pdfjs plus a
prebuilt canvas, no system dependencies); there is no `pdftoppm`, Ghostscript or
working Python on this machine. Render at scale 4 and crop with `sharp` to read
room tags on a 36x24 sheet. Doing this settled in one afternoon what two rounds
of API calls could not.

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

## Document processing - REBUILT for whole sets

Both extractors used to send every uploaded file in ONE model request. That
could not scale, and the proof was already in the corpus: 13.2MB / 27 scanned
sheets went through while 4.7MB / 5 vector sheets was rejected outright,
because what the API carries is the RASTERISED sheet, not bytes on disk. One
heavy sheet took the whole set down. **No byte ceiling can be tuned into
correctness - a limit in the wrong unit is wrong at every value.**

Worse, `re10Extract` checked only `stop_reason === "refusal"`. A structured
response that hits the token ceiling STILL PARSES: the decoder closes the array
and returns a shorter list, indistinguishable from a complete one. A long
repair document silently became a quote for part of the job.

**The pipeline is page-level end to end** (`server/services/documentSplit.ts`,
`documentCensus.ts`; `shared/documents/{pageInventory,auditTrail,readiness}.ts`):

1. `buildInventory` paginates with pdf-lib (`ignoreEncryption` - agency portals
   stamp permit sets). Every page gets a record: READ with sheet and title, or
   FAILED with a reason. Never neither.
2. **Census pass** indexes every page with Haiku: kind, vector/scanned/
   handwritten, legibility, and whether it carries quantities. Cheap, complete,
   and the evidence the whole set was looked at.
3. **Deep pass** spends Opus only on pages the census found numbers on, in
   parallel chunks, with a retry ladder that halves a rejected chunk to a
   single page. One bad sheet costs that sheet.
4. Merge dedups on identity, so a room tagged on the plan and again in the
   tabulation counts ONCE. Existing/demolition phases are kept as evidence and
   never summed - that double count once priced 1,714 SF as 3,056 SF.

**Enumeration starvation is a separate failure from truncation, and only a
count catches it.** A three-page RE-10 returned 52 of 65 items at 5,968 output
tokens against a 16,000 ceiling: the model stops enumerating and treats the job
as done. `requestCountOnPages` makes it COUNT before extracting; the caller
reconciles and re-reads a smaller bite when they disagree. That took the same
document to 65 of 65. Repair chunks are 2 pages, not 4, for the same reason.

**Contradictions are recorded, never resolved.** Two sheets stating two areas
for one room is a fact about the document. It becomes a conflict, blocks a
tightened price, and turns into a question. Averaging or picking the newer
sheet is guessing.

**Suspected duplicate repairs are FLAGGED, never merged** (`shared/re10/
duplicates.ts`). Restatements get priced twice if ignored, but a threshold
confident enough to catch every one will eventually eat "bedroom 1" vs
"bedroom 2" - which is the silent-vanish bug wearing a hat. Asking costs one
line of screen.

Live proof (`npm run check:large-documents`): 104 sheets, all 104 read, 55
deep-read, 91s; the deliberate 303-vs-268 SF conflict detected; 6 out-of-
contract items caught. 62-item RE-10: 65 of 65 requests.

**Fixtures live in `scripts/lib/syntheticPlanSet.ts`** and carry the real traps
on purpose. Two fixture bugs cost debugging rounds and are now asserted
against in `verify:documents`: text rendered above the MediaBox (invisible to
the reader, looks exactly like a dropped item), and generated items that
repeated every 20 (so "62 items" held 23 distinct ones and a correct read
looked like truncation). **If a completeness check fails, suspect the fixture
before the pipeline.**

**Structured-output schemas cap at 16 union-typed parameters.** Adding one
nullable field to the plan schema took it to 17 and the API rejected EVERY
request with "too many parameters with union types" - a runtime failure on all
traffic, invisible to tsc and to the build. Use 0 or "" as the absent value
instead of a nullable union. `verify:documents` now counts them and fails the
build first; the plan schema sits exactly at 16.

**Allowances and alternates are not base scope.** `commercialStatus` on each
scope item separates base / allowance / alternate / optional, and the estimate
route filters base-only into the priced list while carrying the others through
to the lead and the result screen. An allowance is a placeholder whose figure
moves with a selection nobody has made; an alternate is explicitly NOT in the
base bid. Pricing either as ordinary work overstates the job, and dropping
them loses a request the customer made.

### Bidding anything: takeoff engine + open rate book

`shared/takeoff/{units,costBook,bid}.ts`. The goal is to bid commercial as
well as residential, and the split that makes it possible is: **takeoff is
general, rates are not.** A quantity with a unit is the same problem on a
house or a steakhouse; a dollar-per-linear-foot of bar millwork is a business
fact this repo cannot derive.

- Plan scope items now carry `quantity`, `unit` (EA/LF/SF/SY/CY/TON/LB/HR/LS)
  and `trade` (25 trades, at the granularity a sub bids). `parseFeet()` turns
  `18'-2 3/4"` into 18.23 because nothing multiplies a dimension string by a
  rate. Quantity 0 means the drawings did not say - NEVER a guess.
- `COST_BOOK` **ships empty on purpose.** Seeding it with plausible national
  averages would make the estimator produce a number for anything, which is
  the exact failure this codebase exists to prevent. Every rate carries its
  basis (historical / subcontractor / published / judgement), its source, and
  an effective date; anything over a year old prices but is flagged stale.
- `buildBid()` returns THREE outcomes, not two: priced, **measured but
  unpriced** (we know the quantity, nobody has given us a rate), and
  **unmeasured** (the drawings did not say enough). That distinction is the
  useful one: the first is an afternoon with a rate card, the second is a
  question for the architect. `completeBid` is false unless every base item
  priced, and the total is only ever the sum of priced lines.
- Margin is a true gross margin (`cost / (1 - margin)`), asserted in
  `verify:documents` so a third engine cannot drift from the other two.

Verified on a real 103-sheet commercial set (Prime American Steakhouse) with
"estimate all of the millwork and casework only": 22.69 LF and 19.89 LF bar
fronts, 15.69 LF bar island, waterfall edges and glass shelving as EA, server
stations at 12.78 and 6.79 LF, across 13 trades - and a $0 total with
`completeBid: false` because the book is empty. That is the correct output.

**To make it price, the owner supplies rates.** Nothing else is blocking.

### Cost-stack gaps, NAMED not guessed

Equipment is now priced: `03-02-03`, `03-02-01` and `03-02-05` sat in the card,
priced, referenced by no scope rule, so every estimate ever produced carried
zero equipment - no lift or scaffold on a two-storey addition. Wired where
applicable only; kitchen and bathroom unchanged; goldens updated 2026-08-13
with per-project deltas.

**Two RE-10 components still need the owner's numbers** and are documented at
`CLEANUP` in `re10Repairs.ts` rather than invented:
- **disposal beyond clean-up labour** (haul + tip fee; ~$8.40/repair of tidying
  is priced, haulage is not)
- **permits** ($0 today; `permit-uncertain` is a review reason on one recipe)

Both are DISCLOSED to the customer as excluded, so the omission is visible
rather than absorbed. Also flagged: `RE10_CONTINGENCY_RATE` is 0.08 while its
comment claimed "above the 10% used on remodels" - comment corrected to match
the running value, owner to decide which was intended.

## Estimating assistant - BUILT, needs the redeploy

A chat assistant mounted site-wide (`components/assistant/AssistantWidget.tsx`,
launcher bottom-right) that prices conversationally. `/api/assistant/chat` runs
a tool loop where the tools ARE the estimators: `price_remodel_estimate` runs
`calculateEstimate` + `resolveQuotedRange`, `price_repair_list` runs
`estimateRe10`, `capture_lead` delivers to the same three destinations as every
other lead (`server/services/assistantLead.ts`). Verified live: chat prices
match direct engine runs to the dollar, and a pool question yields zero numbers
and a redirect to what we do price.

**Pricing accuracy is structural, not prompted, in this order:**

1. Prices exist only in tool results. The model gathers inputs; the engines
   compute. Tool results carry the customer-safe shape only - never cost,
   margin, or an internal band - so the disclosure wall holds in chat.
2. The grounding guard (`server/services/assistantGuard.ts`) scans every
   reply before it leaves: a dollar figure no tool returned and no customer
   typed gets one corrective retry, then the reply is dropped for a safe
   fallback and `[pricing-alert] assistant-ungrounded-price` fires. Exact
   integers only - a "close" number is a different number.
3. The route is stateless; the client stores the transcript HMAC-signed
   (SESSION_SECRET) and the server only continues a history it wrote. A
   forged transcript is a 409 reset, so a crafted client cannot seed "the
   assistant already promised $X".

The lead's estimate block comes from server-side session state written when a
pricing tool ran, never from model arguments. Context pickup sends estimator
settings (project/finish/sqft) but deliberately no prices - the assistant
re-runs the engine instead of trusting the page. `verify:assistant` (in
prebuild) pins all of it without a model: tool prices equal direct engine runs
exactly, no internal field names in any tool result, the guard catches
fabricated/nearby numbers, tampered transcripts fail, capture_lead fails safe
offline, and every partial-scope chip still changes the priced result.

CONTACT_FAQS moved to `shared/content/contactFaqs.ts` (contact page + assistant
fact sheet read the same list). Assistant funnel events:
`shared/assistant/analyticsEvents.ts`.

## Environment

`ANTHROPIC_API_KEY` is set in Replit Secrets (production only - not local, so
extraction cannot be tested from a dev machine without adding it to
`.env.local`). No `BLOB_READ_WRITE_TOKEN` and none wanted; storage uses
Postgres.

**DEPLOYING TAKES BOTH STEPS, AND EITHER ONE ALONE LOOKS LIKE IT WORKED.**
`git pull` updates the Replit workspace but not the deployment. Redeploy ships
the WORKSPACE, not origin/main - so a Redeploy without a pull first quietly
republishes the previous commit. This has now cost one full validation round:
`e6797fd` was pushed and a redeploy was run, and production came back still
serving `b6abaa0`. Pull, then Redeploy, then confirm against a behaviour only
the new build has rather than against the fact that a deploy ran.
