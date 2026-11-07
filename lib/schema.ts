import {schemaTime} from './schemaTime';
/**
 * JSON-LD Schema Markup Generators
 * Creates structured data for Google rich snippets and search features
 */

import { BUSINESS_INFO, getBaseUrl } from './seo';
import { SERVICES } from '@/shared/contentData';
import { SHOW_FOUNDING_YEAR, publishFoundingCopy } from '@/shared/publicClaims';
import { SHOW_TESTIMONIALS } from '@/shared/testimonialsData';
import { P5_GBP_URL } from '@/shared/gbpProfile';

interface SchemaContext {
  '@context': string;
  '@type': string | string[];
  [key: string]: unknown;
}

// Get the base URL for schema markup
const baseUrl = getBaseUrl();

/**
 * Stable entity identifiers for a connected @graph. Using fragment-based @ids
 * lets Organization, WebSite, and LocalBusiness reference each other instead of
 * existing as disconnected nodes, and prevents the previous @id collision where
 * every per-city LocalBusiness reused `baseUrl` with different coordinates.
 */
export const ORG_ID = `${baseUrl}/#organization`;
/** One business node for this brand. */
export const LOCALBUSINESS_ID = `${baseUrl}/#business`;
export const WEBSITE_ID = `${baseUrl}/#website`;

/**
 * Boise Remodeling Co is a brand of P5 Home Co. LLC. parentOrganization points
 * at P5's business node.
 */
const P5_ORIGIN = 'https://p5homeco.com';
export const P5_ORG_ID = `${P5_ORIGIN}/#business`;
/** Shared person node. The @id lives on p5homeco.com so every brand merges to one Nick Perkins. */
export const NICK_PERKINS_ID = `${P5_ORIGIN}/#nick-perkins`;
/**
 * Verified P5 profiles only. BBB, Houzz, and BuildZoom stay off.
 * The existing kgmid entry stays. Nextdoor is the same P5 page, so this
 * brand does not add it.
 */
export const P5_SAME_AS = [
  'https://www.facebook.com/p5homeco',
  'https://ezlocal.com/id/meridian/home-remodeling/0919899218',
  'https://www.cylex.us.com/company/p5-home-co--llc-40749871.html',
  'https://www.google.com/maps?cid=11869148461693849141',
  P5_GBP_URL,
] as const;
export const P5_PARENT_ORGANIZATION = {
  '@id': P5_ORG_ID,
  name: 'P5 Home Co',
  url: P5_ORIGIN,
  sameAs: P5_SAME_AS,
} as const;
/**
 * This brand's own sameAs. There is no Boise Remodeling Co Facebook or
 * Instagram. Directory listings stay on the parent.
 * TODO(Quinn): add this brand's GBP Maps URL and Yelp URL when they exist.
 */
export const BRAND_SAME_AS = [P5_ORIGIN] as const;
/**
 * Year-free square mark. The seal still reads EST 2020, so schema logo uses
 * this icon instead. Square, and above Google's 112px floor.
 */
const LOGO_URL = `${baseUrl}/brand/search-icon-180.png`;

/**
 * Generate LocalBusiness schema for homepage and location pages
 */
/**
 * Wikipedia URLs for areaServed city disambiguation (entity resolution for
 * knowledge graphs and generative engines). Keys match CITY_SEO_DATA.
 */
const CITY_WIKIPEDIA: Record<string, string> = {
  Boise: 'https://en.wikipedia.org/wiki/Boise',
  Meridian: 'https://en.wikipedia.org/wiki/Meridian,_Idaho',
  Eagle: 'https://en.wikipedia.org/wiki/Eagle,_Idaho',
  Nampa: 'https://en.wikipedia.org/wiki/Nampa,_Idaho',
  Kuna: 'https://en.wikipedia.org/wiki/Kuna,_Idaho',
  Star: 'https://en.wikipedia.org/wiki/Star,_Idaho',
  Middleton: 'https://en.wikipedia.org/wiki/Middleton,_Idaho',
  Caldwell: 'https://en.wikipedia.org/wiki/Caldwell,_Idaho',
};

/**
 * Public contractor type. HomeAndConstructionBusiness is the specific type;
 * GeneralContractor stays so existing consumers of that type still match.
 */
const CONTRACTOR_TYPES = ['HomeAndConstructionBusiness', 'GeneralContractor'] as const;

/**
 * Service-area locality only. No street and no postal code.
 * streetAddress pending owner approval
 */
function publicPostalAddress() {
  return {
    '@type': 'PostalAddress' as const,
    addressLocality: 'Meridian',
    addressRegion: 'ID',
    addressCountry: 'US',
  };
}

/** Cities the site already lists, then the two counties those cities sit in. */
function businessAreaServed() {
  return [
    ...BUSINESS_INFO.serviceArea.map((area) => ({
      '@type': 'City' as const,
      name: area,
      ...(CITY_WIKIPEDIA[area] ? { sameAs: CITY_WIKIPEDIA[area] } : {}),
    })),
    { '@type': 'AdministrativeArea' as const, name: 'Ada County' },
    { '@type': 'AdministrativeArea' as const, name: 'Canyon County' },
  ];
}

/** Offers for the existing /services/[slug] pages only. */
function serviceOfferCatalog() {
  return {
    '@type': 'OfferCatalog' as const,
    name: 'Remodeling Services',
    itemListElement: SERVICES.map((service) => ({
      '@type': 'Offer' as const,
      url: `${baseUrl}/services/${service.slug}`,
      itemOffered: {
        '@type': 'Service' as const,
        name: service.name,
      },
    })),
  };
}

/**
 * Schema.org telephone. Visible pages keep the display format in
 * BUSINESS_INFO.phone. JSON-LD uses E.164 only.
 */
const SCHEMA_TELEPHONE = '+1-208-477-1169';

/** Customer-service contact shared by the public organization graph. */
function customerServiceContactPoint() {
  return {
    '@type': 'ContactPoint' as const,
    contactType: 'customer service',
    telephone: SCHEMA_TELEPHONE,
    email: BUSINESS_INFO.email,
    areaServed: 'US-ID',
    availableLanguage: 'English',
  };
}

/** The home-page entity sentence. City pages pass their own city name. */
export function contractorDescription(city = 'Boise'): string {
  return `Design-build remodeling contractor serving ${city} and the Treasure Valley, Idaho. Kitchen remodels, bathrooms, additions & whole-home renovations.`;
}

export function generateLocalBusinessSchema(city?: string): SchemaContext {
  // Served cities belong in areaServed; no home street or exact home pin is published.
  // The optional city customizes only the human-readable description.
  return {
    '@context': 'https://schema.org',
    '@type': [...CONTRACTOR_TYPES],
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    description: contractorDescription(city),
    image: `${baseUrl}/images/hero-great-room.webp`,
    logo: LOGO_URL,
    '@id': LOCALBUSINESS_ID,
    url: baseUrl,
    parentOrganization: P5_PARENT_ORGANIZATION,
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'registration',
      name: 'Idaho Registered Contractor',
      identifier: '8381215',
      recognizedBy: {
        '@type': 'GovernmentOrganization',
        name: 'Idaho Division of Occupational and Professional Licenses',
        url: 'https://dopl.idaho.gov/con/',
      },
    },
    telephone: SCHEMA_TELEPHONE,
    email: BUSINESS_INFO.email,
    contactPoint: customerServiceContactPoint(),
    address: publicPostalAddress(),
    openingHoursSpecification: Object.entries(BUSINESS_INFO.hours).map(([day, hours]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
      opens: hours === 'Closed' ? undefined : schemaTime(hours.split(' - ')[0]),
      closes: hours === 'Closed' ? undefined : schemaTime(hours.split(' - ')[1]),
    })).filter(spec => spec.opens),
    areaServed: businessAreaServed(),
    ...(SHOW_FOUNDING_YEAR ? { foundingDate: BUSINESS_INFO.founded } : {}),
    slogan: 'Boise\'s Design-Build Remodeling Company',
    paymentAccepted: 'Cash, Credit Card, Check, Financing',
    currenciesAccepted: 'USD',
    hasOfferCatalog: serviceOfferCatalog(),
    sameAs: [...BRAND_SAME_AS],
  };
}

/**
 * WebSite schema for homepage entity graph
 */
export function generateWebSiteSchema(): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BUSINESS_INFO.name,
    url: baseUrl,
    description:
      'Design-build remodeling contractor serving Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, Caldwell, and the Treasure Valley, Idaho.',
    publisher: { '@id': LOCALBUSINESS_ID },
    // NOTE: SearchAction intentionally omitted. The previous target
    // (/blog?q={search_term_string}) had no search handler, which advertised a
    // sitelinks search box that does not work. Re-add only when on-site search
    // is implemented.
  };
}

/**
 * Generate Service schema for individual service pages
 */
export function generateServiceSchema(serviceName: string, serviceDescription: string, city?: string): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description: serviceDescription,
    provider: {
      '@type': [...CONTRACTOR_TYPES],
      '@id': LOCALBUSINESS_ID,
      name: BUSINESS_INFO.name,
      telephone: SCHEMA_TELEPHONE,
      email: BUSINESS_INFO.email,
      parentOrganization: P5_PARENT_ORGANIZATION,
    },
    // The page city is the service area. It is not a second PostalAddress.
    areaServed: city ? {
      '@type': 'City',
      name: city,
      addressCountry: 'US',
      addressRegion: 'ID',
    } : BUSINESS_INFO.serviceArea.map(area => ({
      '@type': 'City',
      name: area,
    })),
    serviceType: serviceName,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD',
    },
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    })),
  };
}

/**
 * Generate Organization schema for brand identity
 */
export function generateOrganizationSchema(): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    parentOrganization: P5_PARENT_ORGANIZATION,
    ...(BUSINESS_INFO.alternateName.length
      ? { alternateName: BUSINESS_INFO.alternateName }
      : {}),
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    description: publishFoundingCopy('Design-build remodeling contractor serving the Treasure Valley since 2020. Kitchen remodels, bathrooms, additions, and whole-home renovations. Idaho Registered Contractor #8381215, bonded, and insured, and committed to excellence.'),
    ...(SHOW_FOUNDING_YEAR ? { foundingDate: BUSINESS_INFO.founded } : {}),
    // founder is gated: only emitted once a real named founder is supplied in
    // BUSINESS_INFO.founderName (see seo-audit/trust-signal-map.md).
    ...(BUSINESS_INFO.founderName
      ? {
          founder: {
            '@type': 'Person',
            name: BUSINESS_INFO.founderName,
            url: `${baseUrl}/about#team`,
          },
        }
      : {}),
    telephone: SCHEMA_TELEPHONE,
    email: BUSINESS_INFO.email,
    address: publicPostalAddress(),
    knowsAbout: [
      'kitchen remodeling',
      'bathroom remodeling',
      'whole-home renovation',
      'room additions',
      'accessory dwelling units',
      'design-build construction',
      'Ada County building permits',
      'Canyon County building permits',
    ],
    sameAs: [...BRAND_SAME_AS],
    contactPoint: customerServiceContactPoint(),
  };
}

/**
 * Generate Review schema for testimonials
 */
export function generateReviewSchema(reviews: Array<{
  author: string;
  rating: number;
  text: string;
  /** Optional ISO date. Omitted from output when not provided. */
  date?: string;
}>): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': [...CONTRACTOR_TYPES],
    '@id': LOCALBUSINESS_ID,
    name: BUSINESS_INFO.name,
    // Ratings and reviews publish only when SHOW_TESTIMONIALS is on and the
    // count is a real populated number. A zero count would publish a
    // misleading 0-star signal, so it stays omitted.
    ...(SHOW_TESTIMONIALS && BUSINESS_INFO.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: BUSINESS_INFO.rating,
            reviewCount: BUSINESS_INFO.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(SHOW_TESTIMONIALS
      ? {
          review: reviews.map(review => ({
            '@type': 'Review',
            author: {
              '@type': 'Person',
              name: review.author,
            },
            ...(review.date ? { datePublished: review.date } : {}),
            reviewRating: {
              '@type': 'Rating',
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
            reviewBody: review.text,
          })),
        }
      : {}),
  };
}

/**
 * Generate FAQPage schema for FAQ sections
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Article schema for blog posts
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  publishedAt: string;
  /** Last revision date; falls back to publishedAt. */
  updatedAt?: string;
  /**
   * Author name. When this is a real person (not the organization name), the
   * author is emitted as a Person entity linked to /about#team for E-E-A-T.
   * When omitted or equal to the org name, the Organization is the author.
   */
  author?: string;
  authorUrl?: string;
  image?: string;
  slug: string;
  /** Defaults to /blog/ */
  pathPrefix?: 'blog' | 'guides' | 'resources';
}): SchemaContext {
  const prefix = article.pathPrefix ?? 'blog';
  const isPersonAuthor =
    !!article.author && article.author.trim() !== BUSINESS_INFO.name;
  const author = isPersonAuthor
    ? {
        '@type': 'Person',
        name: article.author,
        url: article.authorUrl ?? `${baseUrl}/about#team`,
      }
    : { '@type': 'Organization', '@id': ORG_ID, name: BUSINESS_INFO.name };

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.image,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author,
    publisher: {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: BUSINESS_INFO.name,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/${prefix}/${article.slug}`,
    },
  };
}

/**
 * Generate HowTo schema for step-by-step process pages
 */
export function generateHowToSchema(howTo: {
  name: string;
  description: string;
  url: string;
  steps: Array<{ name: string; text: string }>;
}): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    url: `${baseUrl}${howTo.url}`,
    step: howTo.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function generateCollectionPageSchema(page: {
  title: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.title,
    description: page.description,
    url: `${baseUrl}${page.url}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: page.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: `${baseUrl}${item.url}`,
      })),
    },
  };
}

/**
 * Generate WebPage schema
 */
export function generateWebPageSchema(page: {
  title: string;
  description: string;
  url: string;
  /** Adds SpeakableSpecification on this node instead of a second WebPage node for the same URL. */
  speakable?: boolean;
}): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${baseUrl}${page.url}`,
    ...(page.speakable
      ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: ["[data-speakable='summary']"] } }
      : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: BUSINESS_INFO.name,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: BUSINESS_INFO.name,
    },
  };
}

/**
 * Generate SpeakableSpecification schema for AI assistants and voice search
 */
export function generateSpeakableSchema(page: {
  name: string;
  url?: string;
  path?: string;
}): SchemaContext {
  const pagePath = page.url ?? page.path ?? '/';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.name,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ["[data-speakable='summary']"],
    },
    url: `${baseUrl}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`,
  };
}

function stripSchemaContext(schema: SchemaContext): Record<string, unknown> {
  const { '@context': _context, ...rest } = schema;
  return rest;
}

/**
 * Consolidated @graph for the homepage so audit crawlers detect LocalBusiness
 * and related entities from a single JSON-LD block.
 */
export function generateHomePageSchemaGraph(
  faqs: Array<{ question: string; answer: string }>,
): { '@context': string; '@graph': Record<string, unknown>[] } {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      stripSchemaContext(generateLocalBusinessSchema('Boise')),
      stripSchemaContext(generateWebSiteSchema()),
      stripSchemaContext(generateFAQSchema(faqs)),
      stripSchemaContext(
        generateSpeakableSchema({
          path: '/',
          name: 'Boise Remodeling Co, Design-Build Remodeling in the Treasure Valley',
        }),
      ),
    ],
  };
}

export type { SchemaContext };
