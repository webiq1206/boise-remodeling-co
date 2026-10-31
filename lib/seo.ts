/**
 * SEO Utilities for Boise Remodeling Co
 * Generates optimized meta tags, titles, and descriptions
 * for service and location pages
 */

import { SHOW_UNPROVEN_SATISFACTION_GUARANTEE } from '@/shared/publicClaims';
import { SITE_CONFIG } from '@/shared/siteConfig';
import { getExternalProfileUrls } from '@/shared/gbpProfile';
import {
  publicPreviewPath,
  SHOW_FOUNDED_YEAR,
  SHOW_UNPROVEN_TOP_RATED,
} from '@/shared/foundingClaim';

interface SEOMetaData {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
}

interface ServiceSEOParams {
  serviceName: string;
  serviceSlug: string;
  city?: string;
  citySlug?: string;
  isHomePage?: boolean;
}

/**
 * Intelligently truncate service name while keeping key words
 * Works on whole words to avoid breaking legitimate terms
 */
function truncateServiceName(serviceName: string, maxLength: number): string {
  if (serviceName.length <= maxLength) return serviceName;
  
  // Split into words
  const words = serviceName.split(' ');
  
  // Remove low-value filler words first (whole word removal only)
  const fillerWords = ['&', 'and', 'or', 'the', 'of', 'for', 'with', 'in', 'a', 'an'];
  let importantWords = words.filter(word => !fillerWords.includes(word.toLowerCase()));
  
  // Rebuild and check length
  let shortened = importantWords.join(' ');
  if (shortened.length <= maxLength) return shortened;
  
  // If still too long, remove words from end until it fits
  while (importantWords.length > 1 && shortened.length > maxLength) {
    importantWords.pop();
    shortened = importantWords.join(' ');
  }
  
  // If single word is too long, truncate it cleanly
  if (shortened.length > maxLength) {
    return shortened.substring(0, maxLength);
  }
  
  return shortened;
}

/**
 * Generate SEO-optimized page title
 * Format: "[Service] in [City], ID | Boise Remodeling Co | Free Quotes"
 * Max 60 characters for optimal Google display
 * GUARANTEED ≤60 chars through intelligent truncation
 */
export function generatePageTitle(params: ServiceSEOParams): string {
  const { serviceName, city, isHomePage } = params;
  
  if (isHomePage) {
    return "Boise Remodeling Co | Remodeling & Design";
  }
  
  if (city && serviceName) {
    // Full formula: "[Service] in [City], ID | Boise Remodeling Co | Free Quotes"
    const fullTitle = `${serviceName} in ${city}, ID | Boise Remodeling Co | Free Quotes`;
    
    if (fullTitle.length <= 60) {
      return fullTitle;
    }
    
    // Level 2: Drop "Free Quotes"
    const mediumTitle = `${serviceName} in ${city}, ID | Boise Remodeling Co`;
    if (mediumTitle.length <= 60) {
      return mediumTitle;
    }
    
    // Level 3: Shorten brand
    const shortTitle = `${serviceName} in ${city}, ID | Remodeling`;
    if (shortTitle.length <= 60) {
      return shortTitle;
    }
    
    const maxServiceLength = 60 - ` in ${city}, ID | Remodeling`.length;
    const truncatedService = truncateServiceName(serviceName, maxServiceLength);
    return `${truncatedService} in ${city}, ID | Remodeling`;
  }
  
  if (city) {
    const fullTitle = `Remodeling in ${city}, ID | Boise Remodeling Co`;
    if (fullTitle.length <= 60) {
      return fullTitle;
    }
    return `Remodeling Contractor ${city}, ID`;
  }
  
  // Service-only title (defaults to Kuna as home base)
  if (!serviceName) {
    return "Boise Remodeling Co | Remodeling & Design";
  }
  
  const fullTitle = `${serviceName} | Boise Remodeling Co | Free Quotes`;
  if (fullTitle.length <= 60) {
    return fullTitle;
  }
  
  const mediumTitle = `${serviceName} | Boise Remodeling Co`;
  if (mediumTitle.length <= 60) {
    return mediumTitle;
  }
  
  // Truncate service name intelligently
  const maxServiceLength = 60 - ' | Boise Remodeling Co'.length;
  const truncatedService = truncateServiceName(serviceName, maxServiceLength);
  return `${truncatedService} | Boise Remodeling Co`;
}

const CITY_CTA_VARIANTS: Record<string, string> = {
  Kuna: "Free in-home consultation",
  Boise: "Treasure Valley design-build",
  Meridian: "Bonded and insured",
  Eagle: "Clear written scope",
  Star: "Weekly project updates",
  Middleton: "Workmanship guarantee",
  Nampa: "Ada & Canyon County permits",
  Caldwell: "Design-build remodeling",
};

/**
 * Generate SEO-optimized meta description
 * Keyword first, no phone number and no exclamation mark (phase 4: the phone
 * sits in the page and the header, never in a search snippet).
 */
export function generateMetaDescription(params: ServiceSEOParams): string {
  const { serviceName, city } = params;
  
  if (params.isHomePage) {
    const ratingClaim = SHOW_UNPROVEN_TOP_RATED ? ', top-rated' : '';
    return `Design-build remodeling in Boise and the Treasure Valley. Idaho Registered Contractor #8381215, insured${ratingClaim}. Free in-home visit.`;
  }
  
  if (city && serviceName) {
    const serviceLC = serviceName.toLowerCase();
    const ctaVariant = CITY_CTA_VARIANTS[city] || (SHOW_UNPROVEN_SATISFACTION_GUARANTEE ? "Satisfaction guaranteed" : "Free in-home consultation");
    return `${serviceName} in ${city}, Idaho from one design-build team. Idaho Registered Contractor #8381215. ${ctaVariant}.`;
  }
  
  if (city) {
    return `Plan kitchen, bathroom and whole-home remodeling in ${city}, ID. Explore services, start an online estimate or request an in-home consultation.`;
  }
  
  if (!serviceName) {
    return `Design-build remodeling in Boise and the Treasure Valley. Idaho Registered Contractor #8381215, insured. Written scope and a free in-home visit.`;
  }
  
  const serviceLC = serviceName.toLowerCase();
  const guarantee = SHOW_UNPROVEN_SATISFACTION_GUARANTEE ? " & satisfaction guaranteed" : "";
  return `${serviceName} across the Treasure Valley from one design-build team. Idaho Registered Contractor #8381215, bonded and insured${guarantee}. Free in-home visit.`;
}

/**
 * Generate varied city-service title (used for page metadata title field)
 * Does NOT include brand name since layout template appends "| Boise Remodeling Co"
 * Target: under 40 chars so final rendered title stays under 60 chars
 */
export function generateCityServiceTitle(serviceName: string, cityName: string): string {
  // 38 leaves room for the layout suffix " | Boise Remodeling Co" (22) so the
  // rendered title stays within 60 characters. Prefer the full service name.
  const budget = 38;
  const names = [
    serviceName,
    serviceName.replace(/ Remodeling$/, ''),
    serviceName.replace('Outdoor Living & Decks', 'Outdoor Living'),
    serviceName.replace('Aging-in-Place Remodeling', 'Aging-in-Place'),
    serviceName.replace('ADU / Guest House', 'ADU'),
  ];
  for (const name of names) {
    for (const region of ['Idaho', 'ID'] as const) {
      const candidate = `${name} in ${cityName}, ${region}`;
      if (candidate.length <= budget) return candidate;
    }
  }
  const fallback = `${names[names.length - 1]} in ${cityName}`;
  return fallback.length <= budget ? fallback : fallback.slice(0, budget).trim();
}

/**
 * City-service description, keyword first (phase 4). The old formula opened on
 * "{City}'s {filler adjective}", ended "Call (208) 477-1169!" and repeated on
 * all 64 pages. Now: "{Service} in {City}, Idaho: {scope}." then the license
 * line (city pages carry the registration number; the parent pages do not),
 * then the longest call to action that keeps the result within 140 to 155
 * characters. No phone number and no exclamation mark: verify:content fails
 * the build on either in any description.
 */
const CITY_SERVICE_PHRASES: Record<string, { phrase: string; scope: string }> = {
  'kitchen-remodel': { phrase: 'Kitchen remodeling', scope: 'layout, cabinets, counters and permits under one written scope' },
  'bathroom-remodel': { phrase: 'Bathroom remodeling', scope: 'showers, tile, vanities and layout changes, design-build' },
  'whole-home-remodel': { phrase: 'Whole-home remodeling', scope: 'phased or full renovations from one design-build team' },
  'room-addition': { phrase: 'Room additions', scope: 'bump-outs and in-footprint expansions, design-build' },
  adu: { phrase: 'ADU conversions', scope: 'garage, basement and attached units turned into living space' },
  'basement-remodel': { phrase: 'Basement remodeling', scope: 'egress, framing, moisture control and finished suites' },
  'outdoor-living': { phrase: 'Outdoor living spaces', scope: 'covered patios, decks and outdoor kitchens built for Idaho seasons' },
  'aging-in-place': { phrase: 'Aging-in-place remodeling', scope: 'curbless showers, wider doors, lighting and one-level living' },
};

const CITY_SERVICE_LICENSE = 'Idaho Registered Contractor #8381215.';
const CITY_SERVICE_CTAS = ['Book a free in-home visit.', 'Book a free visit.', 'Free in-home visit.', 'Book now.', ''];

/**
 * Per-page descriptions where the page has a local planning fact the template
 * cannot know. Taken from the phase 4 proposals and checked against the copy
 * already on the site (Eagle HOA design review: eagle-remodeling-guide and the
 * Eagle city pages). Keyed `${serviceSlug}/${citySlug}`.
 */
export const CITY_SERVICE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'kitchen-remodel/eagle':
    'Kitchen remodeling in Eagle, Idaho: layout, cabinets, counters and permits under one written scope. HOA design review planned in from day one. Book now.',
  'bathroom-remodel/eagle':
    'Bathroom remodeling in Eagle, Idaho: showers, tile, vanities and layout changes, design-build. HOA design review planned in from day one. Book now.',
  'whole-home-remodel/eagle':
    'Whole-home remodeling in Eagle, Idaho: phased or full renovations from one design-build team. HOA design review planned in from day one. Book now.',
  'room-addition/eagle':
    'Room additions in Eagle, Idaho: bump-outs and in-footprint expansions, design-build. HOA design review planned in from day one. Book a free visit.',
  'basement-remodel/eagle':
    'Basement remodeling in Eagle, Idaho: egress, framing, moisture control and finished suites. HOA design review planned in from day one. Book a free visit.',
  'outdoor-living/eagle':
    'Outdoor living spaces in Eagle, Idaho: covered patios, decks and outdoor kitchens built for Idaho seasons. HOA design review planned in from day one.',
  'aging-in-place/eagle':
    'Aging-in-place remodeling in Eagle, Idaho: curbless showers, wider doors, lighting, one-level living. HOA design review planned in from day one. Book now.',
};

export function generateCityServiceDescription(
  serviceName: string,
  cityName: string,
  serviceSlug?: string,
): string {
  const citySlug = cityName.toLowerCase().replace(/\s+/g, '-');
  const override = serviceSlug ? CITY_SERVICE_DESCRIPTION_OVERRIDES[`${serviceSlug}/${citySlug}`] : undefined;
  if (override) return override;

  const known = serviceSlug ? CITY_SERVICE_PHRASES[serviceSlug] : undefined;
  const phrase = known?.phrase ?? serviceName;
  const scope = known?.scope ?? 'design-build with a written scope before construction';
  const lead = `${phrase} in ${cityName}, Idaho: ${scope}.`;
  const candidates = CITY_SERVICE_CTAS.map((cta) => [lead, CITY_SERVICE_LICENSE, cta].filter(Boolean).join(' '));
  return (
    candidates.find((text) => text.length >= 140 && text.length <= 155) ??
    candidates.find((text) => text.length <= 155) ??
    `${lead} ${CITY_SERVICE_LICENSE}`
  );
}

/**
 * Child title budget. The root layout appends " | Boise Remodeling Co".
 * 60 - 22 = 38.
 */
export function indexedTitle(raw: string): string {
  let title = raw.replace(/\s+/g, ' ').trim();
  const budget = 38;
  if (title.length <= budget) return title;
  const withoutParen = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (withoutParen.length > 0 && withoutParen.length <= budget) return withoutParen;
  title = withoutParen || title;
  if (title.includes(' | ')) {
    const head = title.split(' | ')[0].trim();
    if (head.length > 0 && head.length <= budget) return head;
    if (head.length > 0) title = head;
  }
  title = title.replace(/, Idaho\b/g, ', ID');
  if (title.length <= budget) return title;

  // Drop a trailing qualifier or an interior filler before cutting the last
  // content word off the title.
  const trailing = new Set(['boise', 'homes', 'idaho', 'id']);
  const filler = new Set(['a', 'an', 'the', 'for', 'at', 'guide']);
  const bare = (word: string) => word.replace(/[^A-Za-z&]/g, '').toLowerCase();
  let words = title.split(' ');
  while (words.join(' ').length > budget && words.length > 3 && trailing.has(bare(words[words.length - 1]))) {
    words.pop();
  }
  while (words.join(' ').length > budget && words.length > 3) {
    let index = -1;
    for (let i = words.length - 2; i >= 1; i--) {
      if (filler.has(bare(words[i]))) {
        index = i;
        break;
      }
    }
    if (index === -1) break;
    words.splice(index, 1);
  }
  title = words.join(' ').replace(/[\s:|&,.-]+$/, '');
  if (title.length <= budget && title.length >= 18) return title;

  const cut = title.slice(0, budget).replace(/\s+\S*$/, '').replace(/[\s:|&,.-]+$/, '');
  return cut.length >= 18 ? cut : title.slice(0, budget).trim();
}

/** Keep the authored topic, then fit the rendered title to 60 characters. */
export function generateSafePageTitle(primary: string, suffix?: string): string {
  const title = primary.replace(/\s+/g, ' ').trim();
  const detail = suffix?.replace(/\s+/g, ' ').trim();
  if (detail) {
    const candidate = title + ' | ' + detail;
    if (candidate.length + (' | ' + SITE_CONFIG.name).length <= 60) return indexedTitle(candidate);
  }
  return indexedTitle(title);
}

/**
 * Default Open Graph / Twitter image path used as a site-wide fallback so every
 * page emits an og:image. Pages with their own hero (blog posts, guides) override
 * this with a more specific image.
 * Purpose-built 1200x630 dark social card: reverse wordmark + Maker's Seal on #1C1F1E.
 */
export const DEFAULT_OG_IMAGE_PATH = '/images/og-default.png';

/**
 * Absolute URL for the default Open Graph image.
 */
export function getDefaultOgImage(): string {
  const path = SHOW_FOUNDED_YEAR ? DEFAULT_OG_IMAGE_PATH : publicPreviewPath();
  return `${getBaseUrl().replace(/\/$/, '')}${path}`;
}

/**
 * Get base URL based on environment
 */
export function getBaseUrl(): string {
  // In Next.js, check for environment variable first
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Use current origin in development, production domain in production
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit')) {
      return window.location.origin;
    }
  }
  // Default to production URL for SSR/build time
  return 'https://boiseremodeling.co';
}

/**
 * Generate SEO-optimized alt tag for logo/icon featured image
 * Creates page-specific alt text that includes relevant keywords
 */
export function generateLogoAltTag(params: ServiceSEOParams): string {
  const { serviceName, city, isHomePage } = params;
  
  if (isHomePage) {
    return "Boise Remodeling Co logo - Design-build remodeling contractor in Boise, Idaho";
  }
  
  if (city && serviceName) {
    // City-specific alt tag with service context
    return `Boise Remodeling Co logo - ${serviceName} services in ${city} Idaho - Idaho Registered Contractor #8381215`;
  }
  
  if (city) {
    // City page alt tag without service
    return `Boise Remodeling Co logo - Professional remodeling services in ${city} Idaho`;
  }
  
  if (!serviceName) {
    // Fallback for pages without service
    return `Boise Remodeling Co logo - Design-build remodeling contractor serving the Treasure Valley, Idaho`;
  }
  
  // Service-specific alt tag
  return `Boise Remodeling Co logo - Professional ${serviceName.toLowerCase()} services in Treasure Valley Idaho`;
}

/**
 * Generate complete SEO metadata object for a page
 */
export function generateSEOMetadata(params: ServiceSEOParams): SEOMetaData {
  const title = generatePageTitle(params);
  const description = generateMetaDescription(params);
  
  // Environment-aware canonical URL
  const baseUrl = getBaseUrl();
  let canonical = baseUrl;
  
  if (!params.isHomePage) {
    if (params.citySlug && params.serviceSlug) {
      canonical = `${baseUrl}/services/${params.serviceSlug}/${params.citySlug}`;
    } else if (params.citySlug && !params.serviceSlug) {
      canonical = `${baseUrl}/areas/${params.citySlug}`;
    } else if (params.serviceSlug) {
      canonical = `${baseUrl}/services/${params.serviceSlug}`;
    }
  }
  
  // Open Graph defaults to meta tags
  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    // A 1200x630 card, not the square seal: this feeds summary_large_image,
    // where a square logo gets letterboxed or cropped to a sliver.
    ogImage: getDefaultOgImage(),
    twitterCard: 'summary_large_image',
  };
}

/**
 * City-specific data for local SEO
 */
export const CITY_SEO_DATA: Record<string, {
  population: string;
  founded: string;
  zipCodes: string[];
  neighborhoods: string[];
  landmarks: string[];
  climate: string;
  coordinates: { lat: number; lng: number };
}> = {
  Kuna: {
    population: '24,011',
    founded: '1992',
    zipCodes: ['83634'],
    // Crimson Point leads so a generated intro does not open on Black Cat Road.
    // Ten Mile Creek is a waterway, not a neighborhood. Indian Creek is the creek.
    // Bernie Fisher Park is the city park. Indian Creek Plaza is in Caldwell.
    // Kuna Caves are about 5 miles south on BLM land. Swan Falls Dam is in Melba.
    neighborhoods: ['Crimson Point', 'Black Cat'],
    landmarks: ['Bernie Fisher Park'],
    climate: 'semi-arid high desert climate with hot summers and cold winters',
    coordinates: { lat: 43.4913, lng: -116.4201 },
  },
  Boise: {
    population: '235,421',
    founded: '1863',
    zipCodes: ['83702', '83703', '83704', '83705', '83706', '83709', '83712', '83713', '83714', '83716'],
    neighborhoods: ['North End', 'Bench', 'Downtown', 'East End', 'Southwest Boise'],
    landmarks: ['Idaho State Capitol', 'Boise River Greenbelt', 'Table Rock', 'Hyde Park'],
    climate: 'semi-arid climate with four distinct seasons',
    coordinates: { lat: 43.6150, lng: -116.2023 },
  },
  Meridian: {
    population: '117,635',
    founded: '1893',
    zipCodes: ['83642', '83646'],
    neighborhoods: ['Lochsa Falls', 'Tuscany', 'Paramount', 'Meridian Ranch'],
    // Settlers Park replaces Eagle Island State Park, which is in Eagle.
    landmarks: ['The Village at Meridian', 'Julius M. Kleiner Memorial Park', 'Settlers Park'],
    climate: 'semi-arid with hot, dry summers and cold winters',
    coordinates: { lat: 43.6121, lng: -116.3915 },
  },
  Eagle: {
    population: '30,346',
    founded: '1864',
    zipCodes: ['83616'],
    // Banbury leads so a generated intro does not open on Floating Feather Road.
    // Shadow Valley's course is addressed in Boise, and its Eagle annexation is still pending.
    // "The Estates" is the Dry Creek Ranch product, outside Eagle.
    neighborhoods: ['Banbury', 'Floating Feather'],
    landmarks: ['Eagle Island State Park', 'Heritage Park', 'Eagle Hills Golf Course'],
    climate: 'semi-arid with distinct four seasons',
    coordinates: { lat: 43.6954, lng: -116.3540 },
  },
  Star: {
    population: '12,701',
    founded: '1907',
    zipCodes: ['83669'],
    // Hillsdale and Paramount are in Meridian. No City of Star source names Star Crossing.
    neighborhoods: ['Star River Ranch'],
    // Official name is Star Riverwalk Park, 1000 S. Main Street.
    // Freedom Park is a city park. Celebration Park is near Melba.
    landmarks: ['Boise River', 'Star Riverwalk Park', 'Freedom Park'],
    climate: 'semi-arid climate with hot summers and cool winters',
    coordinates: { lat: 43.6921, lng: -116.4939 },
  },
  Middleton: {
    population: '10,141',
    founded: '1909',
    zipCodes: ['83644'],
    // Purple Sage Estates and the golf course are addressed in Caldwell.
    // No City of Middleton source names Puckett Estates or Windermere.
    neighborhoods: ['Middleton Heights'],
    // Purple Sage Golf Course is a Caldwell city course.
    // The city does not list a park named Middleton City Park.
    landmarks: ['Boise River'],
    climate: 'semi-arid high desert climate with warm summers and cool winters',
    coordinates: { lat: 43.7068, lng: -116.6209 },
  },
  Nampa: {
    population: '108,188',
    founded: '1886',
    zipCodes: ['83651', '83653', '83686', '83687'],
    // Columbia Village is in southeast Boise.
    neighborhoods: ['Downtown Nampa', 'Karcher', 'Greenhurst'],
    // Lake Lowell is the Deer Flat refuge just outside Nampa.
    landmarks: ['Ford Idaho Center', 'Nampa Train Depot'],
    climate: 'semi-arid with hot summers and cold winters',
    coordinates: { lat: 43.5407, lng: -116.5635 },
  },
  Caldwell: {
    population: '65,359',
    founded: '1883',
    zipCodes: ['83605', '83607'],
    // Wilson leads so a generated intro does not open on Cleveland Boulevard.
    // Indian Creek is the creek through downtown, not a neighborhood.
    // Indian Creek Plaza stays: it is in Caldwell.
    neighborhoods: ['Wilson', 'Ustick', 'Cleveland Blvd'],
    landmarks: ['Indian Creek Plaza', 'Caldwell Night Rodeo', 'College of Idaho'],
    climate: 'semi-arid high desert with four distinct seasons',
    coordinates: { lat: 43.6629, lng: -116.6874 },
  },
};

/**
 * Business information for NAP consistency
 */
export const BUSINESS_INFO = {
  name: SITE_CONFIG.name,
  legalName: SITE_CONFIG.legalName,
  alternateName: ['Boise Remodeling', 'BRC'],
  /**
   * No named individual is published on the site by request. Left empty so the
   * Organization schema omits the `founder` Person entity (the emit is gated on
   * this being non-empty). Set a name here only if the owner opts in later.
   */
  founderName: '',
  phone: SITE_CONFIG.phone,
  email: SITE_CONFIG.email,
  // Full NAP for JSON-LD and citations. Visible pages stay city and state
  // only: service-area business, no storefront.
  address: {
    street: SITE_CONFIG.address.street,
    city: SITE_CONFIG.address.city,
    state: 'Idaho',
    postalCode: SITE_CONFIG.address.postalCode,
    country: 'United States',
  },
  hours: {
    monday: '9:00 AM - 6:00 PM',
    tuesday: '9:00 AM - 6:00 PM',
    wednesday: '9:00 AM - 6:00 PM',
    thursday: '9:00 AM - 6:00 PM',
    friday: '9:00 AM - 6:00 PM',
    saturday: '9:00 AM - 4:00 PM',
    sunday: 'Closed',
  },
  founded: '2020',
  serviceArea: ['Boise', 'Meridian', 'Eagle', 'Nampa', 'Kuna', 'Star', 'Middleton', 'Caldwell'],
  serviceRadius: '35 miles',
  licenses: ['Idaho Registered Contractor #8381215'],
  certifications: ['Design-Build Remodeling', 'Bonded & Insured'],
  insurance: 'Bonded and insured',
  rating: 0,
  reviewCount: 0,
  yearlyServicesCompleted: 0,
  // No brand social accounts exist (owner decision 2026-10-31); only listings
  // configured through env vars, once they are live, are named here.
  sameAs: [...getExternalProfileUrls()],
};

export type { SEOMetaData, ServiceSEOParams };
