import NextImage, { type ImageProps } from 'next/image';
import { versionedSrc } from '@/lib/imageVersion';

/**
 * next/image, with the content version of a replaced photograph added to its
 * URL (see lib/imageVersion.ts). Import this instead of next/image:
 * tests/image-versions.test.ts fails on a direct import.
 */
export default function Image(props: ImageProps) {
  const src = typeof props.src === 'string' ? versionedSrc(props.src) : props.src;
  return <NextImage {...props} src={src} />;
}

export type { ImageProps };
