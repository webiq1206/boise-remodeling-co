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
| `verify:plans` | the gates that let a plan set tighten a price |
| `verify:plans-delivery` | plans disclosure wall, funnel events, request contract |
| `verify:no-em-dash` | house style, blocks the build |
| `check:re10-extraction` | live API call, NOT in prebuild (costs money) |

**tsc baseline is 22 pre-existing errors.** Not zero. Compare against 22; do
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
3. Optional: add `ANTHROPIC_API_KEY` to `.env.local` so the analyze step can be
   exercised from a dev machine. Without it `/api/plans/analyze` answers 503 and
   the wizard shows the send-them-to-us-by-hand path, which is correct behaviour
   but untestable ground. (Confirmed still absent: no `.env.local` in the repo.)

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
