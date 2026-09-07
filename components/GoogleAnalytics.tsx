import Script from 'next/script';

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-NGE449QF9Y';
const GOOGLE_ADS_ID = 'AW-18354188204';

/**
 * Loads GA4 with strategy="lazyOnload" so the ~150KB gtag payload stays off the
 * mobile critical path (a Speed Index / LCP win on throttled connections) while
 * still defining window.gtag before any user interaction. Conversion events fire
 * from lib/analytics.ts on click, which always happens after idle, so nothing is
 * lost; lib/analytics guards on gtag existing anyway.
 */
export function GoogleAnalytics() {
  // Only load analytics in production so local/dev traffic never pollutes the
  // real GA property (and dev network stays quiet for tooling/screenshots).
  if (process.env.NODE_ENV !== 'production') return null;
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}
