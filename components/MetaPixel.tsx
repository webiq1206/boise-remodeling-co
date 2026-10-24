import Script from 'next/script';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '2461987544292871';

/**
 * Loads the Meta (Facebook) Pixel with strategy="afterInteractive" so the
 * automatic PageView fires as soon as the page is interactive - NOT after the
 * full page load + browser idle that "lazyOnload" waits for.
 *
 * Why this matters: Meta counts that PageView as a Landing Page View and uses
 * it (plus Lead) to optimize delivery. With lazyOnload, paid traffic that
 * bounced in the first few seconds left before the pixel fired, so those visits
 * never registered an LPV - undercounting landing-page views and starving the
 * optimizer of early signal. afterInteractive keeps the fbevents payload off
 * the LCP critical path while still firing PageView promptly and reliably.
 *
 * Conversion events (e.g. Lead on estimate completion) fire from
 * lib/analytics.ts via trackMetaEvent, which guards on fbq existing anyway.
 * No-op outside production, so local/dev traffic never pollutes the real dataset.
 */
export function MetaPixel() {
  if (process.env.NODE_ENV !== 'production') return null;
  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${META_PIXEL_ID}');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
