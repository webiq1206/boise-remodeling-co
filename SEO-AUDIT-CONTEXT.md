# SEO Audit Context - Boise Remodeling Co

**Domain:** boiseremodeling.co
**Stack:** Next.js 14.2 App Router, React 18, TypeScript, Tailwind, shadcn/ui
**Rendering:** Static (SSG via `generateStaticParams`) for all public pages
**Database:** Neon PostgreSQL (Drizzle ORM), non-SEO surface
**Analytics:** Google Analytics 4 (`G-1HD7RT8PKJ`) loaded in root layout via `next/script` (afterInteractive)
**Integrations (do NOT break):** GA4, Stripe, Resend, Replit Auth, Nominatim geocoding, Google Mail
**Image hosting:** local `/public/images/*` only (no CDN)

## Business NAP
- Name: Boise Remodeling Co
- Legal: Boise Remodeling Co LLC
- Phone: (208) 352-2011
- Email: hello@boiseremodeling.co
- Address: Meridian, ID 83646
- Founded: 2017
- Service Area: Kuna, Boise, Meridian, Eagle, Star, Middleton (Idaho Treasure Valley, USDA Zone 6b-7a)

## Existing SEO Infrastructure
| Asset | Location | Status |
|---|---|---|
| Root metadata + template | `app/layout.tsx` | Present; default title + template `%s | Boise Remodeling Co` |
| Sitemap | `app/sitemap.ts` | Present; covers all 294 public routes |
| robots.txt | `app/robots.ts` | Present; disallows `/api/`, `/admin/`, `/subcontractor/` |
| 404 page | `app/not-found.tsx` | Present (had no metadata - fixed) |
| LLM crawl manifest | `public/llms.txt` | Present (69 lines) |
| JSON-LD helpers | `lib/schema.ts` | LocalBusiness, Organization, Service, Breadcrumb, FAQ, Article, WebPage, Review, Speakable |
| SEO helpers | `lib/seo.ts` | Title/description generators, BUSINESS_INFO, CITY_SEO_DATA |
| Internal links | `data/internal-links.json` | Auto-generated via `scripts/internal-links/generate.ts`; audited via prebuild `npm run audit:links` |
| GA4 | `app/layout.tsx` | Hardcoded fallback ID, override via `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Web manifest | `public/site.webmanifest` | Added during this audit |
| Apple touch icon | `public/apple-touch-icon.png` | Present |
| Favicon | `public/favicon.png` | Present |
| OG image | `public/images/favicon.png` | Used as default (1200x630 alt declared); dedicated OG image recommended |

## Route Inventory (294 indexed routes)
- 1 homepage (`/`)
- 28 service pages (`/services/[slug]`) - generated via `PRIORITY_SERVICES`
- 6 area pages (`/areas/[slug]`)
- 168 city-service permutations (`/services/[slug]/[city]`) - 28 × 6
- 92 blog posts (`/blog/[slug]`) - from `shared/blogContent.ts`
- 14 utility pages (about, contact, services index, blog index, pricing, get-quote, faq, seasonal-guide, commercial, commercial/hoa-services, commercial/municipal-services, privacy-policy, terms-of-service, services-listed)

## Noindex Routes (intentional)
- `/admin/*` - admin dashboard (now has `noindex,nofollow` via `app/admin/layout.tsx` plus robots.txt disallow)
- `/subcontractor/*` - B2B portal (now has `noindex,nofollow` via `app/subcontractor/layout.tsx` plus robots.txt disallow)
- `/quote/edit` - tokenized edit (now has `noindex,nofollow` via `app/quote/layout.tsx`)
- `/quote-status` - tokenized lookup (now has `noindex` via `app/quote-status/layout.tsx`)
- `/api/*` - robots.txt disallow
- `/_next/*`, `/email/*` - default ignored

## Audit Constraints
- No em dashes (use hyphens or restructure)
- No visual redesign / no Tailwind structural changes
- No slug changes (would invalidate internal-links manifest)
- Do not edit `package.json`, `next.config.*`, `drizzle.config.ts`, `vite.config.ts`
- Preserve existing GA4 measurement ID and Stripe/Resend/Replit Auth flows
