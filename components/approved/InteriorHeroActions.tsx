'use client';
/**
 * Interior hero actions (service, city-service and area pages): one primary
 * "Request a quote" in the family button, and the phone as a text link. Same
 * label and destination as the header and the bottom bar (FAMILY_BRAND.cta),
 * and the same primary_cta_clicked event the old hero button sent.
 */
import { usePathname } from 'next/navigation';
import { FamilyButton } from '@/components/family/Button';
import { trackEvent } from '@/lib/analytics';
import { FAMILY_BRAND } from '@/lib/familyBrand';

export function InteriorHeroActions() {
  const pathname = usePathname();
  const { cta, phone } = FAMILY_BRAND;
  return (
    <div className="interior-hero-actions">
      <FamilyButton
        href={cta.href}
        variant="primary"
        size="lg"
        data-cta="primary"
        data-testid="link-hero-request-quote"
        onClick={() => trackEvent('primary_cta_clicked', { location: pathname ?? '', surface: 'interior-hero' })}
      >
        {cta.label}
      </FamilyButton>
      <a className="interior-hero-call" href={phone.telHref} data-testid="link-hero-call">
        Call or text {phone.display}
      </a>
    </div>
  );
}
