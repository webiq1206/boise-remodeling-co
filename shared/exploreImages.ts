/**
 * Photographs for the "Keep exploring" cards. A card shows the photograph of
 * the page it opens, unless that picture is already on the current page (in
 * the hero, a band, the gallery cards or another card): then it takes the next
 * unused photograph of the same subject. Identity is visual, as everywhere
 * else on the landing template (shared/imageIdentity.ts).
 */
import { imageIdentity } from './imageIdentity';
import { SUBJECT_ALTERNATES } from './landingImages';

export interface ExploreCardInput {
  href: string;
  /** The linked page's own photograph. */
  image?: string;
  /** Service slug whose alternates may stand in. */
  subject?: string;
}

export function resolveExploreImages(cards: readonly ExploreCardInput[], usedOnPage: readonly (string | undefined)[]): (string | undefined)[] {
  const used = new Set<string>();
  for (const src of usedOnPage) if (src) used.add(imageIdentity(src));
  return cards.map((card) => {
    const candidates = [card.image, ...(SUBJECT_ALTERNATES[card.subject ?? 'general'] ?? []), ...SUBJECT_ALTERNATES.general];
    for (const src of candidates) {
      if (!src) continue;
      const id = imageIdentity(src);
      if (used.has(id)) continue;
      used.add(id);
      return src;
    }
    return card.image;
  });
}
