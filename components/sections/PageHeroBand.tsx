import { InteriorHero } from '@/components/approved/InteriorLayout';

interface PageHeroBandProps {
  imageSrc: string;
  imageAlt: string;
  /** Optional extra scrim strength 0–1 (default 0.66). Values much above
      ~0.75 flatten the photograph into the charcoal ground - the band's text
      sits at the bottom where this gradient is already at full strength, so
      the top two-thirds of the image can stay visible. */
  scrim?: number;
  /**
   * For pages whose real content is the tool below: on phones the copy and its
   * action come before the photograph, and the action sits right under the
   * headline, so the first screen holds the H1 and the primary button.
   */
  compact?: boolean;
  children: React.ReactNode;
}

/** Editorial index introduction followed by wide imagery. */
export function PageHeroBand({
  imageSrc,
  imageAlt,
  compact = false,
  children,
}: PageHeroBandProps) {
  const hero = (
    <InteriorHero imageSrc={imageSrc} imageAlt={imageAlt} layout="editorial">
      {children}
    </InteriorHero>
  );
  return compact ? <div className="page-hero-compact">{hero}</div> : hero;
}
