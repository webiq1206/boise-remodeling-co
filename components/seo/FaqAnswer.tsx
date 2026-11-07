import { Fragment, type ReactNode } from 'react';
import { REGISTRATION_LINE, RegistrationLink } from '@/components/RegistrationLink';
import { ADU_QUOTE_LABEL, ADU_QUOTE_URL } from '@/shared/content/p5Visibility';

const linkClass = 'underline underline-offset-2';

/**
 * Renders an FAQ answer whose text content matches the JSON-LD string.
 * Links are limited to phrases that already appear in that string.
 */
export function FaqAnswer({ text }: { text: string }) {
  const markers: Array<{ key: string; node: ReactNode }> = [
    { key: REGISTRATION_LINE, node: <RegistrationLink className={linkClass} /> },
    {
      key: ADU_QUOTE_LABEL,
      node: (
        <a href={ADU_QUOTE_URL} className={linkClass}>
          {ADU_QUOTE_LABEL}
        </a>
      ),
    },
    {
      key: 'For an addition or ADU',
      node: (
        <>
          For an addition or{' '}
          <a href={ADU_QUOTE_URL} className={linkClass}>
            ADU
          </a>
        </>
      ),
    },
    {
      key: 'For an ADU',
      node: (
        <>
          For an{' '}
          <a href={ADU_QUOTE_URL} className={linkClass}>
            ADU
          </a>
        </>
      ),
    },
  ];

  const pieces: ReactNode[] = [];
  let rest = text;
  let index = 0;
  while (rest.length > 0) {
    let hit: { at: number; marker: (typeof markers)[number] } | null = null;
    for (const marker of markers) {
      const at = rest.indexOf(marker.key);
      if (at === -1) continue;
      if (!hit || at < hit.at || (at === hit.at && marker.key.length > hit.marker.key.length)) {
        hit = { at, marker };
      }
    }
    if (!hit) {
      pieces.push(<Fragment key={index}>{rest}</Fragment>);
      break;
    }
    if (hit.at > 0) pieces.push(<Fragment key={index}>{rest.slice(0, hit.at)}</Fragment>);
    pieces.push(<Fragment key={`${index}-m`}>{hit.marker.node}</Fragment>);
    rest = rest.slice(hit.at + hit.marker.key.length);
    index += 1;
  }
  return <>{pieces}</>;
}
