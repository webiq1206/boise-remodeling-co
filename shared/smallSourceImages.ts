/**
 * Photographs whose source file is narrower than the widest frame that shows
 * them. A frame never stretches one past its own pixels: the article banner
 * reads the width here and stays that wide, centred, on a large screen.
 * Replace the file with a 2000px source and delete its line.
 * Guard: tests/small-source-images.test.ts.
 */
export const SMALL_SOURCE_WIDTH: Readonly<Record<string, number>> = {
  '/images/blog/basement-finishing-boise.webp': 1024,
  '/images/blog/bedroom-additions.webp': 1024,
  '/images/blog/how-long-does-a-bathroom-remodel-take.webp': 1024,
  '/images/blog/multigenerational-living-remodels.webp': 1024,
  '/images/blog/remodeling-mistakes-to-avoid.webp': 1024,
  '/images/blog/small-bathroom-remodel-ideas.webp': 1024,
};

export function sourceWidthCap(src: string): number | undefined {
  return SMALL_SOURCE_WIDTH[src.split('?')[0]];
}
