'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { trackDelegatedContactClick } from '@/lib/googleAdsConversion';

/**
 * Site-wide conversion tracking for call/text/email intent. Uses a single
 * delegated click listener so every tel:/sms:/mailto: link across the site
 * (nav, hero, footer, sticky bar, contact page) fires a GA event without
 * instrumenting each one. Form submits are tracked at the form (generate_lead).
 */
export function ConversionTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('tel:')) {
        trackEvent('contact_click', { method: 'phone', link_url: href });
      } else if (href.startsWith('sms:')) {
        trackEvent('contact_click', { method: 'sms', link_url: href });
      } else if (href.startsWith('mailto:')) {
        trackEvent('contact_click', { method: 'email', link_url: href });
      }
      trackDelegatedContactClick(e);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
