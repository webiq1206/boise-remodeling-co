import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateLocalBusinessSchema,
  generateServiceSchema,
  generateSpeakableSchema,
} from './schema';

export function landingBreadcrumbs(
  items: Array<{ name: string; url: string }>,
) {
  return generateBreadcrumbSchema(items);
}

export function landingFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return generateFAQSchema(
    faqs.map((f) => ({ question: f.question, answer: f.answer })),
  );
}

export function landingServiceSchema(
  name: string,
  description: string,
  city?: string,
) {
  return generateServiceSchema(name, description, city);
}

export function landingAreaBusinessSchema(cityName: string) {
  const schema = generateLocalBusinessSchema(cityName);
  // Area pages name the city through areaServed. They do not carry a
  // PostalAddress for that city. The Meridian locality stays on the
  // homepage, contact, and organization nodes.
  delete schema.address;
  return schema;
}

export function landingSpeakable(path: string, name: string) {
  return generateSpeakableSchema({ url: path, name });
}
