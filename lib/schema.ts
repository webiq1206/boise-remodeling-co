/**
 * JSON-LD Schema Markup Generators
 * Creates structured data for Google rich snippets and search features
 */

import { BUSINESS_INFO, CITY_SEO_DATA, getBaseUrl } from './seo';
import { SERVICES } from '@/shared/contentData';

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
export const LOCALBUSINESS_ID = `${baseUrl}/#localbusiness`;
export const WEBSITE_ID = `${baseUrl}/#website`;
/**
 * THE SEAL ON ITS OWN CHARCOAL DISC, NOT THE TRANSPARENT BONE ONE.
 *
 * This URL goes into `Organization.logo` and every `ImageObject` below, which
 * means Google renders it on surfaces we do not control and which are usually
 * white. The dark/ seal is bone ink (#F7F5F3) on transparency, so on a white
 * knowledge panel it would be an invisible square. The `any/` variant carries
 * its own charcoal disc and reads correctly on any background, which is exactly
 * what the brand kit says the `any/` set is for.
 *
 * 512px square: comfortably above Google's 112px floor, and square suits the
 * panel and rich-result crops better than a wide wordmark would.
 */
const LOGO_URL = `${baseUrl}/brand/png/seal/any/boise-remodeling-co-seal-on-charcoal-512px.png`;

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

export function generateLocalBusinessSchema(city?: string): SchemaContext {
  // A single-location business has ONE set of coordinates (its HQ). Emitting
  // per-city coordinates under one @id confuses entity disambiguation, so geo
  // is always the HQ; the service area is expressed via `areaServed`. The
  // optional `city` only customizes the human-readable description.
  // HQ geo matches the NAP locality (Meridian) - previously pointed at Kuna.
  const coordinates = CITY_SEO_DATA.Meridian.coordinates;

  return {
    '@context': 'https://schema.org',
    '@type': 'GeneralContractor',
    name: BUSINESS_INFO.name,
    legalName: BUSINESS_INFO.legalName,
    description: `Design-build remodeling contractor serving ${city || 'Boise'} and the Treasure Valley, Idaho. Kitchen remodels, bathrooms, additions & whole-home renovations.`,
    image: `${baseUrl}/images/hero-great-room.webp`,
    logo: LOGO_URL,
    '@id': LOCALBUSINESS_ID,
    url: baseUrl,
    parentOrganization: { '@id': ORG_ID },
    telephone: BUSINESS_INFO.phone,
    email: BUSINESS_INFO.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS_INFO.address.city,
      addressRegion: BUSINESS_INFO.address.state,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: BUSINESS_INFO.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    },
    openingHoursSpecification: Object.entries(BUSINESS_INFO.hours).map(([day, hours]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
      opens: hours === 'Closed' ? undefined : hours.split(' - ')[0],
      closes: hours === 'Closed' ? undefined : hours.split(' - ')[1],
    })).filter(spec => spec.opens),
    priceRange: '$$',
    areaServed: BUSINESS_INFO.serviceArea.map(area => ({
      '@type': 'City',
      name: area,
      ...(CITY_WIKIPEDIA[area] ? { sameAs: CITY_WIKIPEDIA[area] } : {}),
    })),
    ...(BUSINESS_INFO.reviewCount > 0
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
    foundingDate: BUSINESS_INFO.founded,
    slogan: 'Boise\'s Design-Build Remodeling Company',
    paymentAccepted: 'Cash, Credit Card, Check, Financing',
    currenciesAccepted: 'USD',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Remodeling Services',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        url: `${baseUrl}/services/${s.slug}`,
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.shortDescription,
        },
      })),
    },
    sameAs: BUSINESS_INFO.sameAs,
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
    publisher: { '@id': ORG_ID },
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
      '@type': 'GeneralContractor',
      name: BUSINESS_INFO.name,
      telephone: BUSINESS_INFO.phone,
      email: BUSINESS_INFO.email,
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city || BUSINESS_INFO.address.city,
        addressRegion: BUSINESS_INFO.address.state,
        addressCountry: BUSINESS_INFO.address.country,
      },
    },
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
    ...(BUSINESS_INFO.alternateName.length
      ? { alternateName: BUSINESS_INFO.alternateName }
      : {}),
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
    },
    description: 'Design-build remodeling contractor serving the Treasure Valley since 2020. Kitchen remodels, bathrooms, additions, and whole-home renovations. Licensed, insured, and committed to excellence.',
    foundingDate: BUSINESS_INFO.founded,
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
    telephone: BUSINESS_INFO.phone,
    email: BUSINESS_INFO.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS_INFO.address.city,
      addressRegion: BUSINESS_INFO.address.state,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: BUSINESS_INFO.address.country,
    },
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
    sameAs: BUSINESS_INFO.sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BUSINESS_INFO.phone,
      contactType: 'Customer Service',
      areaServed: 'US-ID',
      availableLanguage: 'English',
    },
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
    '@type': 'GeneralContractor',
    '@id': LOCALBUSINESS_ID,
    name: BUSINESS_INFO.name,
    // AggregateRating is gated on a real, populated review count. Emitting a
    // zero/empty rating would publish a misleading 0-star signal, so it is only
    // included once BUSINESS_INFO.rating/reviewCount reflect genuine reviews.
    ...(BUSINESS_INFO.reviewCount > 0
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
}): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${baseUrl}${page.url}`,
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
): SchemaContext {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      stripSchemaContext(generateOrganizationSchema()),
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
