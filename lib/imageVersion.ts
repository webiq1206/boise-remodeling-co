import { IMAGE_VERSIONS } from '../shared/generated/imageVersions';

/**
 * The image optimizer's answer is cached for a year by browsers and by its own
 * disk cache, both keyed by the image URL (next.config.js minimumCacheTTL). A
 * photograph replaced under the same file name would keep showing the old
 * picture, so a replaced file gets ?v=<hash of its content> and becomes a new
 * URL. Files that were never replaced are left as they are. The list is
 * shared/generated/imageVersions.ts (npm run images:versions).
 *
 * Page code keeps using the plain path everywhere (alt text, picture identity,
 * sitemaps, structured data); the version is added only where the image is
 * handed to next/image: components/VersionedImage.tsx and the hero photo.
 */
export function versionedSrc(src: string): string {
  if (!src.startsWith('/') || src.startsWith('//') || src.includes('?')) return src;
  const version = IMAGE_VERSIONS[src];
  return version ? `${src}?v=${version}` : src;
}
