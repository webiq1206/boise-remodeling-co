/**
 * SEO Utilities for Boise Remodeling Co
 * Generates optimized meta tags, titles, and descriptions
 * for service and location pages
 */

import { SITE_CONFIG } from '@/shared/siteConfig';
import { GBP_SOCIAL, getExternalProfileUrls } from '@/shared/gbpProfile';

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

const CITY_DESCRIPTION_VARIANTS: Record<string, string> = {
  Kuna: "Kuna's trusted design-build",
  Boise: "Boise's design-build",
  Meridian: "Meridian's trusted",
  Eagle: "Eagle's preferred",
  Star: "Star's reliable",
  Middleton: "Middleton's expert",
  Nampa: "Nampa's trusted",
  Caldwell: "Caldwell's trusted",
};

const CITY_CTA_VARIANTS: Record<string, string> = {
  Kuna: "Free in-home consultation",
  Boise: "Treasure Valley design-build",
  Meridian: "Licensed & insured",
  Eagle: "Clear written scope",
  Star: "Weekly project updates",
  Middleton: "Workmanship guarantee",
  Nampa: "Ada & Canyon County permits",
  Caldwell: "Design-build remodeling",
};

/**
 * Generate SEO-optimized meta description
 * 150-160 characters with phone number, CTA, and unique value prop
 * Phone: (208) 477-1169
 */
export function generateMetaDescription(params: ServiceSEOParams): string {
  const { serviceName, city } = params;
  const phone = SITE_CONFIG.phone;
  
  if (params.isHomePage) {
    return `Design-build remodeling contractor serving Boise, Meridian, Eagle & the Treasure Valley. Licensed, insured, top-rated. Call ${phone} for your free consultation!`;
  }
  
  if (city && serviceName) {
    const serviceLC = serviceName.toLowerCase();
    const cityVariant = CITY_DESCRIPTION_VARIANTS[city] || `${city}'s trusted`;
    const ctaVariant = CITY_CTA_VARIANTS[city] || "Satisfaction guaranteed";
    return `${cityVariant} ${serviceLC} team. Licensed & insured. ${ctaVariant}. Call ${phone} for a free consultation!`;
  }
  
  if (city) {
    return `Remodeling contractor in ${city}, Idaho. Licensed, insured & locally owned. Call ${phone} for a free in-home consultation in ${city}!`;
  }
  
  if (!serviceName) {
    return `Professional remodeling contractor in Boise & Treasure Valley. Licensed, insured. Call ${phone} for a free consultation. Residential design-build services!`;
  }
  
  const serviceLC = serviceName.toLowerCase();
  return `Expert ${serviceLC} in Boise & the Treasure Valley. Licensed, insured & satisfaction guaranteed. Call ${phone} for a free consultation!`;
}

/**
 * Generate varied city-service title (used for page metadata title field)
 * Does NOT include brand name since layout template appends "| Boise Remodeling Co"
 * Target: under 40 chars so final rendered title stays under 60 chars
 */
export function generateCityServiceTitle(serviceName: string, cityName: string): string {
  const short = `${serviceName} in ${cityName}, Idaho`;
  if (short.length <= 40) {
    return short;
  }
  return `${serviceName} in ${cityName}, ID`;
}

/**
 * Generate varied city-service meta description
 * Guaranteed under 160 characters
 */
export function generateCityServiceDescription(
  serviceName: string,
  cityName: string,
  shortDescription?: string,
): string {
  const phone = SITE_CONFIG.phone;
  const serviceLC = serviceName.toLowerCase();
  const cityVariant = CITY_DESCRIPTION_VARIANTS[cityName] || `${cityName}'s trusted`;
  const cityData = CITY_SEO_DATA[cityName as keyof typeof CITY_SEO_DATA];
  const neighborhood = cityData?.neighborhoods?.[0];

  if (neighborhood) {
    const withNeighborhood = `${cityVariant} ${serviceLC}. Serving ${neighborhood} & all ${cityName}. Licensed & insured. Call ${phone}!`;
    if (withNeighborhood.length <= 160) return withNeighborhood;
  }

  if (shortDescription) {
    const desc = `${cityVariant} ${serviceLC}. ${shortDescription}. Licensed & insured. Call ${phone}!`;
    if (desc.length <= 160) return desc;
  }

  const base = `${cityVariant} ${serviceLC} in ${cityName}, ID. Licensed & insured. Call ${phone} for a free quote!`;
  if (base.length <= 160) return base;

  return `${serviceLC} in ${cityName}, ID. Licensed & insured pros. Call ${phone} for a free quote today!`;
}

/**
 * Generate a page title for any service or area page
 * Ensures final rendered title (with layout template " | Boise Remodeling Co")
 * stays under 60 characters
 */
export function generateSafePageTitle(primary: string, suffix?: string): string {
  const templateSuffix = " | Boise Remodeling Co";
  const maxLen = 60 - templateSuffix.length;

  if (suffix) {
    const full = `${primary} | ${suffix}`;
    if (full.length <= maxLen) return full;
  }

  if (primary.length <= maxLen) return primary;

  // Truncate on a word boundary without a baked-in ellipsis (the ellipsis would
  // become a literal part of the <title>, not SERP truncation).
  const words = primary.split(' ');
  let truncated = '';
  for (const word of words) {
    const candidate = truncated ? `${truncated} ${word}` : word;
    if (candidate.length > maxLen) break;
    truncated = candidate;
  }

  // A word-boundary cut can still land on a dangling connector, producing
  // titles like "Aging-in-Place Remodeling in the". Drop trailing connectors so
  // an overflowing title degrades to a clean phrase instead of a broken one.
  const DANGLING = new Set(['in', 'the', 'a', 'an', 'of', 'for', 'and', '&', 'to', 'at', 'on', 'with']);
  let cleaned = truncated.trim();
  let parts = cleaned.split(' ');
  while (parts.length > 1 && DANGLING.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
    cleaned = parts.join(' ');
  }

  return cleaned || truncated || primary.substring(0, maxLen).trim();
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
  return `${getBaseUrl().replace(/\/$/, '')}${DEFAULT_OG_IMAGE_PATH}`;
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
    return `Boise Remodeling Co logo - ${serviceName} services in ${city} Idaho - Licensed remodeling professionals`;
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
    ogImage: `${baseUrl}/images/og-default.png`,
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
    neighborhoods: ['Indian Creek', 'Black Cat', 'Crimson Point', 'Ten Mile Creek'],
    landmarks: ['Kuna Caves', 'Swan Falls Dam', 'Indian Creek Plaza'],
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
    landmarks: ['The Village at Meridian', 'Julius M. Kleiner Memorial Park', 'Eagle Island State Park'],
    climate: 'semi-arid with hot, dry summers and cold winters',
    coordinates: { lat: 43.6121, lng: -116.3915 },
  },
  Eagle: {
    population: '30,346',
    founded: '1864',
    zipCodes: ['83616'],
    neighborhoods: ['Shadow Valley', 'Banbury', 'The Estates', 'Floating Feather'],
    landmarks: ['Eagle Island State Park', 'Heritage Park', 'Eagle Hills Golf Course'],
    climate: 'semi-arid with distinct four seasons',
    coordinates: { lat: 43.6954, lng: -116.3540 },
  },
  Star: {
    population: '12,701',
    founded: '1907',
    zipCodes: ['83669'],
    neighborhoods: ['Star River Ranch', 'Hillsdale', 'Paramount', 'Star Crossing'],
    landmarks: ['Boise River', 'Star Riverfront Park', 'Celebration Park'],
    climate: 'semi-arid climate with hot summers and cool winters',
    coordinates: { lat: 43.6921, lng: -116.4939 },
  },
  Middleton: {
    population: '10,141',
    founded: '1909',
    zipCodes: ['83644'],
    neighborhoods: ['Middleton Heights', 'Purple Sage', 'Puckett Estates', 'Windermere'],
    landmarks: ['Boise River', 'Middleton City Park', 'Purple Sage Golf Course'],
    climate: 'semi-arid high desert climate with warm summers and cool winters',
    coordinates: { lat: 43.7068, lng: -116.6209 },
  },
  Nampa: {
    population: '108,188',
    founded: '1886',
    zipCodes: ['83651', '83653', '83686', '83687'],
    neighborhoods: ['Downtown Nampa', 'Karcher', 'Greenhurst', 'Columbia Village'],
    landmarks: ['Ford Idaho Center', 'Lake Lowell', 'Nampa Train Depot'],
    climate: 'semi-arid with hot summers and cold winters',
    coordinates: { lat: 43.5407, lng: -116.5635 },
  },
  Caldwell: {
    population: '65,359',
    founded: '1883',
    zipCodes: ['83605', '83607'],
    neighborhoods: ['Indian Creek', 'Cleveland Blvd', 'Ustick', 'Wilson'],
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
  // Canonical NAP sourced from SITE_CONFIG. Street + ZIP feed structured data
  // and off-site citations; locality (Meridian, Idaho) stays consistent.
  address: {
    street: SITE_CONFIG.address.street,
    city: SITE_CONFIG.address.city,
    state: 'Idaho',
    postalCode: SITE_CONFIG.address.postalCode,
    country: 'United States',
  },
  hours: {
    monday: '7:00 AM - 6:00 PM',
    tuesday: '7:00 AM - 6:00 PM',
    wednesday: '7:00 AM - 6:00 PM',
    thursday: '7:00 AM - 6:00 PM',
    friday: '7:00 AM - 6:00 PM',
    saturday: '8:00 AM - 4:00 PM',
    sunday: 'Closed',
  },
  founded: '2020',
  serviceArea: ['Boise', 'Meridian', 'Eagle', 'Nampa', 'Kuna', 'Star', 'Middleton', 'Caldwell'],
  serviceRadius: '35 miles',
  licenses: ['License details available upon request'],
  certifications: ['Design-Build Remodeling', 'Bonded & Insured'],
  insurance: 'Fully Licensed & Insured',
  rating: 0,
  reviewCount: 0,
  yearlyServicesCompleted: 0,
  sameAs: [
    GBP_SOCIAL.facebook,
    GBP_SOCIAL.instagram,
    ...getExternalProfileUrls(),
  ],
};

export type { SEOMetaData, ServiceSEOParams };
