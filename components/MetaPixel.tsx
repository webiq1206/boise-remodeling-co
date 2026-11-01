import Script from 'next/script';
import { afterWindowLoad } from '@/lib/thirdPartyGate';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '2461987544292871';

/**
 * Meta (Facebook) Pixel. The fbq stub, autoConfig, init and the automatic
 * PageView are set up as soon as the page is interactive, so fbq exists from
 * the start and every call queues. The fbevents.js network request is made at
 * the window load event (lib/thirdPartyGate.ts afterWindowLoad), with no wait
 * for interaction and no 5 second fallback. fbevents.js drains the queue when
 * it arrives, so the PageView and any Lead fired before it loaded are still sent.
 *
 * Owner decision (2026-11-01): prompt loading is kept for Landing Page View
 * accuracy. Paid-ad landing views matter more than the small blocking-time
 * saving; behind the interaction gate, a visitor who left within 5 seconds
 * without touching the page sent no PageView. Clarity still waits for the
 * first interaction or 5 seconds (components/MicrosoftClarity.tsx).
 *
 * Conversion events (e.g. Lead on estimate completion) fire from
 * lib/analytics.ts via trackMetaEvent, which guards on fbq existing and also
 * posts to the Conversions API. No-op outside production, so local/dev
 * traffic never pollutes the real dataset.
 */
export function MetaPixel() {
  if (process.env.NODE_ENV !== 'production') return null;
  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
${afterWindowLoad("t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)")}
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${META_PIXEL_ID}');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
