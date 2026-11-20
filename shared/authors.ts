/**
 * Content author for articles and guides (owner answer, 20 November 2026,
 * SEO audit REM-T7): Nick Perkins, founder of P5 Home Co, as named on the
 * p5homeco.com about page. The Article schema emits him as a Person with the
 * same @id the P5 graph uses, and the company stays the publisher. The visible
 * byline reads "By Nick Perkins, founder of P5 Home Co" and links his page.
 */
export const CONTENT_AUTHOR = {
  name: 'Nick Perkins',
  role: 'founder of P5 Home Co',
  jobTitle: 'Founder',
  url: 'https://p5homeco.com/about',
} as const;

export const CONTENT_AUTHOR_BYLINE = `By ${CONTENT_AUTHOR.name}, ${CONTENT_AUTHOR.role}`;
