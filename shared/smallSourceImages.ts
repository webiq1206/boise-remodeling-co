/**
 * Photographs whose source file is narrower than the widest frame that shows
 * them. A frame never stretches one past its own pixels: the article banner
 * reads the width here and stays that wide, centred, on a large screen.
 * Replace the file with a 2000px source and delete its line.
 * Guard: tests/small-source-images.test.ts.
 */
export const SMALL_SOURCE_WIDTH: Readonly<Record<string, number>> = {
  // Empty since 19 November 2026: every blog photograph is at least as wide as
  // the article banner. A narrower file added later must be listed here.
};

export function sourceWidthCap(src: string): number | undefined {
  return SMALL_SOURCE_WIDTH[src.split('?')[0]];
}
