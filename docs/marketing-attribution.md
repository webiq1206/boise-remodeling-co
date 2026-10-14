# Boise Remodeling attribution

## Release behavior

- No public form fields, customer email templates, business numbers, notification recipients, or campaign settings change.
- Marketing capture runs invisibly in the existing layout. Existing Google/GA4/bootstrap/call configuration remains intact.
- Explicit consent is required for capture, local storage and hidden marketing metadata. Consent Mode must grant `ad_storage`, `analytics_storage` and `ad_user_data`, or an existing consent controller may dispatch `p5:marketing-consent` with detail `granted`, `denied` or `unknown`. GPC, DNT and explicit Consent Mode denials take precedence.
- There is no consent manager in this repository. Without a grant the new capture is deliberately inactive. This is not permission to assume consent or add a banner without approval.
- First-party storage expires after 30 days. Withdrawal deletes it. Unsupported storage leaves only current-page memory. URLs exclude query strings/fragments; referrers retain origin only. Only allowlisted campaign parameters are accepted.
- First and latest observations remain separate. Same-site navigation does not turn an ad visit into direct traffic. A later direct entry is recorded as direct, not organic. No missing campaign/ad IDs are fabricated.
- All observations are browser-reported, not proof that Google verified a click. Receiving brand is derived server-side.

## Existing CRM contracts

The source-reviewed P5 receiver has a strict project_review_v1 schema and no attribution property. Its HubSpot mapper retains request answers in the existing deal `description`. The sender therefore adds `_p5_marketing_attribution_v1` only to the outbound CRM answers as a JSON string. Customer answers, emails and scope text remain untouched. The existing source domain, external lead ID, operation key and reconciliation protocol remain unchanged. No new HubSpot property, contact, lead, or second delivery is created.

The legacy BRC dashboard explicitly accepts a passthrough `estimate` object and stores it in sourcePayload. Consultation metadata uses `estimate.marketingAttribution`; `source` remains `boiseremodeling.co`, not a marketing channel. Retries retain the saved attribution.

These are compatible metadata mappings, not native HubSpot Original Source overrides. Native reporting-property configuration and whether GA4 generate_lead is separately imported as a primary Ads conversion require account-side verification. Do not invent or alter those settings.

## Storage and QA

P5 attribution is part of the existing immutable intake snapshot. A changed browser observation cannot create a duplicate delivery or conflict with a retry of the same accepted scope. Consultation attribution uses an additive nullable JSONB column; no records are deleted or rewritten by the migration.

Run `npm run db:prepare` before startup using the existing process. The deployment build already runs it. Do not force schema synchronization.

Offline tests: `node --import tsx --test tests/marketing-attribution.test.ts tests/analytics-bootstrap.test.ts tests/p5-intake-store.test.ts tests/p5-intake-project-review.test.ts`.

Phone/email link events remain `contact_click` intent only. The unchanged Google website-call configuration owns eligible Ads forwarding and call duration measurement. No forwarding number is provisioned by the app. Primary form conversion dispatch follows accepted submission receipts with stable transaction IDs; lazy tag loading is retried. Browser/vendor blocking means delivery cannot be guaranteed, and account configuration must not count a GA4 import and the direct Ads action as two primary conversions.
