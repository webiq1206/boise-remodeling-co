import Script from 'next/script';
import { afterInteraction } from '@/lib/thirdPartyGate';

const CLARITY_PROJECT_ID = 'x5wrjdadlb';

/**
 * Microsoft Clarity. The clarity() command stub is installed right away so
 * calls queue; the www.clarity.ms tag itself waits for the visitor
 * (lib/thirdPartyGate.ts: first pointerdown, keydown, scroll or touchstart,
 * or 5 seconds after load) and drains the queue when it arrives. Field
 * masking is stamped from first paint by the clarity-field-mask script in the
 * root layout, so it is in place before Clarity records anything.
 */
export function MicrosoftClarity() {
  // Production-only: keep dev sessions out of Clarity heatmaps/recordings.
  if (process.env.NODE_ENV !== 'production') return null;
  if (!CLARITY_PROJECT_ID) return null;
  return (
    <Script
      id="clarity-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            ${afterInteraction('t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);')}
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`,
      }}
    />
  );
}
