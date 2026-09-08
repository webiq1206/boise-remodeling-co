import { MetadataRoute } from 'next';

const SEARCH_CRAWLERS = [
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Bingbot',
  'MicrosoftPreview',
  'Slurp',
  'DuckDuckBot',
  'YandexBot',
  'Baiduspider',
  'Applebot',
];

// AI answer engines and training crawlers, named individually because a
// cautious crawler backs off when its access is ambiguous under a wildcard.
// Same list as p5homeco.com so the family reads consistently. To opt one out
// later, move it to its own Disallow rule; deleting it falls back to '*'.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'Bytespider',
  'DuckAssistBot',
  'MistralAI-User',
  'cohere-ai',
  'YouBot',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://boiseremodeling.co';
  const disallow = ['/api/', '/admin/', '/subcontractor/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      ...[...SEARCH_CRAWLERS, ...AI_BOTS].map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow,
      })),
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-images.xml`],
  };
}
