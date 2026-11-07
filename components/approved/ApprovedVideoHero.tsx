import { FAMILY_BRAND } from '@/lib/familyBrand';
import { FamilyButton } from '@/components/family/Button';
import { brandStyle } from '@/components/family/brandStyle';
import { HeroVideo } from './HeroVideo';

/** Keep the heading, poster and conversion control in the first server response. */
export function ApprovedVideoHero({ eyebrow, title, titleAccent, support, primary, answer }: {
  eyebrow: string;
  title: string;
  titleAccent: string;
  support: string;
  primary: { label: string; href: string };
  answer?: string;
}) {
  return (
    <section className="fam-hero" data-family-hero="" data-video-hero="" data-fit="viewport"
      data-desktop-from={FAMILY_BRAND.header.desktopFrom} style={brandStyle()} aria-labelledby="family-hero-title">
      <HeroVideo />
      <div className="fam-hero-scrim" aria-hidden="true" />
      <div className="fam-hero-inner">
        <div className="fam-hero-copy">
          <p className="fam-hero-eyebrow">{eyebrow}</p>
          <h1 className="fam-hero-title" id="family-hero-title">
            {title}{' '}<span className="fam-hero-accent">{titleAccent}</span>
          </h1>
          {answer ? <p className="aeo-paragraph fam-hero-support" data-aeo="answer">{answer}</p> : null}
          <p className="fam-hero-support">{support}</p>
          <div className="fam-hero-actions">
            <FamilyButton href={primary.href} variant="hero" size="lg" data-hero-cta="primary" data-cta="primary">
              {primary.label}
            </FamilyButton>
          </div>
        </div>
      </div>
    </section>
  );
}
