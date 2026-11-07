'use client';
/**
 * Interior hero actions: call and text on the site number are the primary
 * actions, with the same label as the header and the bottom bar. The quote
 * form is the secondary ask.
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
        href={phone.telHref}
        variant="primary"
        size="lg"
        data-cta="primary"
        data-testid="link-hero-call"
        onClick={() => trackEvent('primary_cta_clicked', { location: pathname ?? '', surface: 'interior-hero' })}
      >
        {cta.label}
      </FamilyButton>
      <FamilyButton
        href={phone.smsHref}
        variant="secondary"
        size="lg"
        data-testid="link-hero-text"
      >
        Text
      </FamilyButton>
      <FamilyButton
        href="/#request"
        variant="tertiary"
        size="lg"
        data-testid="link-hero-request-quote"
      >
        Request a quote
      </FamilyButton>
    </div>
  );
}
