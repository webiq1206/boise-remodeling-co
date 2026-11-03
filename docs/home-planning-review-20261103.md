# Remodeling homepage planning review

Scope: `https://boiseremodeling.co/#planning-ranges` only. Base main `fcf23fc741acd8eb265274e4ea5828d172f144ce`. Requested more detailed planning calculator and persistent quote CTA. Prior engineering owner relinquished this calculator-only task. Preserve concurrent Cursor draft #131 without merging it.

Standards: Master Website Design Quality v2.3, implementation rules, review record; existing `docs/design-system.md`, `docs/approved-design-handoff.md`, current family tokens. No palette, fonts, logo, hero, SEO, pricing-engine, form, API, analytics, consent, delivery or CRM changes. Existing October 2 eight-step release protocol remains mandatory. One repository writer; Construction handled separately.

Baseline: live desktop inspected November 3. Existing three project buttons select fixed published bands; Kitchen $37,000–$110,000+, Primary bath $35,000–$85,000+, whole-home written master scope. Quote CTA points at #request. Large heading and narrow input treatment give little individual project detail. Mobile baseline capture pending hosted browser execution.

Implementation: five compact steps (project, area, finish, layout, editable review), immediate modeled range and contextual assumptions/inclusions/exclusions. Reuses existing `shared/estimateEngine.ts` unchanged. Defaults are visible, selectable, and reviewable. Does not invent rates, add markups, tighten the range for default answers, or send requests. Session-only local persistence stores nonpersonal selections. Existing /#request destination persists during all steps and at result. Marketing mobile bar yields only while the input card is visible; coordinated Back/Next task navigation replaces it on phones. Desktop summary is sticky, mobile selections expand in place, and review editing has Save/Cancel. The existing promotional overlay is not duplicated.

Preserve: brand color/type, existing homepage components/order, every route/metadata/schema, all engine constants and provider boundaries. Full detail remains a site-visit conversation; the calculator is not a bid, contractual price, or promise. No real submissions, protected estimator operations or external-provider test traffic.

Checks observed: TypeScript passed after complete checkout; estimate-engine verifier passed 15,492 invariant checks; all 15 family hashes unchanged; diff and JavaScript syntax checks passed. Live desktop screenshot inspected. Local headless browser launch blocked by sandbox socket permissions. No browser-setup escalation or access-control bypass attempted.

Hosted before/after capture and each step at 320x568, 360x640, 390x844, 430x932, 768x1024, 1024x768, 1280x720, 1440x900, 1920x1080, 844x390 are pending. Isolated preview and browser block outbound calls and API requests. Phone/keyboard and landscape checks must be reported honestly; viewport simulation is not a physical-device claim. No text-entry fields in changed planner.

Required review: independent F4 all ten dimensions, C10/D2 navigation and viewport fit, C14 proof/source honesty, stylesheet isolation, quote target, session refresh and browser Back, full editorial refinement. Any failure blocks release. No independent visual pass, merge, import, deployment or live revision verification claimed in this record.

Independent source review found initial D2 navigation/summary/editing/Enter/motion gaps, now corrected in the next revision pending rendered verification. First hosted run failed before rendering because shell git refused container checkout ownership; no guard was weakened. Exact original baseline component from fcf23fc is now a tracked .tsx.txt fixture, avoiding runtime Git configuration changes.
