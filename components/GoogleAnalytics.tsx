import { googleTagBootstrap } from '@/lib/analyticsBootstrap';
import Script from 'next/script';

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-NGE449QF9Y';

/** Load only for real visitors on this brand's live hostname. */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== 'production' || !GA_MEASUREMENT_ID) return null;
  return (
    <Script id="ga-init" strategy="lazyOnload">
      {googleTagBootstrap({
        hostname: 'boiseremodeling.co',
        measurementId: GA_MEASUREMENT_ID,
        adsId: 'AW-18354188204',
        phoneConversionLabel: 'YHR0CIaPz_ccEKzf-q9E',
        phoneNumber: '(208) 477-1169',
      })}
    </Script>
  );
}
