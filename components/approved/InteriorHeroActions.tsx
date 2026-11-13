'use client';
/**
 * Interior hero actions (service, city-service, area and about pages): one
 * primary action in the family button, and the phone as a text link, with the
 * same primary_cta_clicked event the old hero button sent.
 *
 * Owner decision, 13 November 2026: the primary action is the central
 * estimator ("Get an instant estimate"). On a service page it opens on that
 * service's project. A service the estimator cannot price keeps "Request a
 * quote" to the short request (primaryCtaForService in shared/ctaCopy.ts). The
 * phone link beside it is the path to a person.
 */
import { usePathname } from 'next/navigation';
import { FamilyButton } from '@/components/family/Button';
import { trackEvent } from '@/lib/analytics';
import { FAMILY_BRAND } from '@/lib/familyBrand';
import { primaryCtaForService } from '@/shared/ctaCopy';

export function InteriorHeroActions({ serviceSlug }: { serviceSlug?: string }) {
  const pathname = usePathname();
  const { phone } = FAMILY_BRAND;
  const cta = primaryCtaForService(serviceSlug);
  return (
    <div className="interior-hero-actions">
      <FamilyButton
        href={cta.href}
        variant="primary"
        size="lg"
        data-cta="primary"
        data-testid={cta.kind === 'estimator' ? 'link-hero-instant-estimate' : 'link-hero-request-quote'}
        onClick={() => trackEvent('primary_cta_clicked', { location: pathname ?? '', surface: 'interior-hero', destination: cta.kind })}
      >
        {cta.label}
      </FamilyButton>
      <a className="interior-hero-call" href={phone.telHref} data-testid="link-hero-call">
        Call or text {phone.display}
      </a>
    </div>
  );
}
