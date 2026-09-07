/**
 * Thin, safe wrapper over gtag for conversion events. GA is loaded via
 * @next/third-parties, which exposes window.gtag once ready; if it is not
 * present (GA disabled, blocked, or SSR) the call is a no-op.
 */
type GtagParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, params);
}

/** Optional first-party identifiers for Conversions API match quality. */
export interface MetaUserData {
  email?: string;
  phone?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Fires a Meta (Facebook) standard event through BOTH the browser Pixel and the
 * server-side Conversions API, sharing one eventID so Meta deduplicates them
 * (counts the conversion once, but keeps the signal that ad blockers / ITP would
 * otherwise strip from the browser). The Pixel is loaded via components/MetaPixel
 * (lazyOnload). Both paths are best-effort no-ops when unavailable:
 * fbq is guarded, and /api/meta-capi silently skips if the CAPI token is unset.
 *
 * Pass a standard event name (e.g. 'Lead'). `userData` (email/phone) is optional
 * but greatly improves server-side match quality; it is hashed on the server and
 * never sent to the Pixel.
 */
export function trackMetaEvent(
  name: string,
  params: GtagParams = {},
  userData?: MetaUserData,
  stableEventId?: string,
): void {
  if (typeof window === 'undefined') return;

  const eventId =
    stableEventId ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq === 'function') {
    fbq('track', name, params, { eventID: eventId });
  }

  // Server-side copy, deduped via eventId. Fire-and-forget; never block or throw.
  try {
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName: name,
        eventId,
        eventSourceUrl: window.location.href,
        actionSource: 'website',
        customData: params,
        userData,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
