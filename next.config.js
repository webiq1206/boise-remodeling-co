const path = require('path');

process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
  },
  images: {
    // The site's project imagery is already compressed WebP. Serve those
    // assets directly to avoid stalled on-demand image encoding jobs while
    // retaining Next Image layout sizing and native lazy loading.
    unoptimized: true,
    formats: ['image/webp'],
    // Next defaults to 8 device widths x 8 image widths, so a single photo can
    // spawn a large matrix of on-demand encodes and cache misses. These trimmed
    // sets still cover phone / tablet / laptop / retina while cutting the number
    // of variants the server has to generate and keep warm.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [96, 256, 384],
    // Next defaults this to 60 SECONDS, so optimized variants expired and were
    // re-encoded about once a minute - the main reason images felt slow again
    // and again. Optimized URLs are keyed by src + width + quality, so a long
    // TTL is safe: changing an image changes its URL.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  trailingSlash: false,
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/shared': path.resolve(__dirname, 'shared'),
      '@shared': path.resolve(__dirname, 'shared'),
    };
    return config;
  },

  async redirects() {
    const r = (source, destination) => [
      { source, destination, permanent: true },
      { source: source + '/', destination, permanent: true },
    ];

    const redirects = [];

    // www.boiseremodeling.co answers 200 with the same content as the apex host. The
    // canonical tag already points at the apex, but a single host is cleaner
    // for crawlers and analytics, so the www variant redirects permanently.
    redirects.push({
      source: '/:path*',
      has: [{ type: 'host', value: 'www.boiseremodeling.co' }],
      destination: 'https://boiseremodeling.co/:path*',
      permanent: true,
    });

    // Legacy page aliases → canonical BRC routes
    const pageAliases = {
      '/about-us': '/about',
      '/our-story': '/',
      '/meet-the-team': '/',
      '/contact-us': '/contact',
      '/get-in-touch': '/#consult',
      '/get-quote': '/#consult',
      '/free-quote': '/#consult',
      '/free-estimate': '/#calculator',
      '/request-quote': '/#consult',
      '/request-estimate': '/#consult',
      '/get-estimate': '/#calculator',
      '/get-a-quote': '/#consult',
      '/get-a-free-quote': '/#consult',
      '/quote': '/#consult',
      // '/estimate' is NOT a legacy alias - it is the real canonical page
      // (app/estimate/page.tsx, sitemap priority 0.9). This redirect was
      // predating that page and was permanently 308-redirecting every visit
      // to /estimate back to the homepage's inline calculator instead,
      // silently making the dedicated page unreachable from anywhere on the
      // site (nav, footer, every EstimateCTA click off the homepage) and
      // from search results.
      '/portfolio': '/testimonials',
      '/gallery': '/#gallery',
      '/our-work': '/testimonials',
      '/projects': '/testimonials',
      '/reviews': '/testimonials',
      '/our-reviews': '/testimonials',
      '/our-services': '/#services',
      '/all-services': '/',
      '/pricing': '/#calculator',
      '/our-pricing': '/#calculator',
      '/rates': '/#calculator',
      '/faq': '/',
      '/frequently-asked-questions': '/',
      '/commercial': '/',
      '/commercial-services': '/',
      '/seasonal': '/',
      '/seasonal-services': '/',
      '/seasonal-guide': '/',
      '/news': '/blog',
      '/privacy': '/privacy-policy',
      '/terms': '/terms-of-service',
      '/terms-and-conditions': '/terms-of-service',
      '/home': '/',
      '/index': '/',
      '/index.html': '/',
      '/index.php': '/',
      '/site-map': '/sitemap',
      '/careers': '/',
      '/jobs': '/',
      '/employment': '/',
      '/wp-admin': '/',
      '/wp-login': '/',
      '/wp-login.php': '/',
    };

    for (const [source, destination] of Object.entries(pageAliases)) {
      redirects.push(...r(source, destination));
    }

    const blogRedirects = {
      '/blog/kitchen-remodel-cost-treasure-valley': '/blog/kitchen-remodel-cost-boise',
      '/blog/bathroom-remodel-cost-idaho': '/blog/bathroom-remodel-cost-boise',
      // ROI near-duplicate consolidation (audit §D)
      '/blog/kitchen-roi-remodeling': '/blog/kitchen-remodel-roi',
      '/blog/bathroom-roi-remodeling': '/blog/bathroom-remodel-roi',
    };
    for (const [source, destination] of Object.entries(blogRedirects)) {
      redirects.push(...r(source, destination));
    }

    return redirects;
  },
}

module.exports = nextConfig
