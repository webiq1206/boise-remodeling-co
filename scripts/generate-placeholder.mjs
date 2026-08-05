/**
 * Generates a tasteful, on-brand PLACEHOLDER hero (WebP) and OG card (JPG) for a
 * blog post whose real photography has not been produced yet. The placeholder is
 * a charcoal field with a centered sage rule + diamond motif and a faint inset
 * frame - clearly an intentional brand graphic, not a broken image. When the real
 * AI photo is generated it simply overwrites these files at the same paths, so no
 * re-wiring is needed.
 *
 * Usage: node scripts/generate-placeholder.mjs <slug>
 * Requires: sharp (devDependency). No fonts used (pure SVG shapes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const CHARCOAL = '#1C1F1E';
// Single brand sage (#9AA098). It formerly split into a deep fill (#5D6561) and
// a lifted text tone (#899F95); the kit now uses one value on the dark ground.
const SAGE = '#9AA098';
const SAGE_LIGHT = '#9AA098';
const LINE = '#3A3F3D';

/** Build a placeholder SVG at the given dimensions (pure shapes, no fonts). */
function placeholderSvg(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const ruleW = Math.round(Math.min(w, h) * 0.14);
  const inset = Math.round(Math.min(w, h) * 0.06);
  const d = Math.round(Math.min(w, h) * 0.018); // diamond half-size
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${CHARCOAL}"/>
  <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${LINE}" stroke-width="2"/>
  <line x1="${cx - ruleW}" y1="${cy}" x2="${cx - d * 2}" y2="${cy}" stroke="${SAGE}" stroke-width="2"/>
  <line x1="${cx + d * 2}" y1="${cy}" x2="${cx + ruleW}" y2="${cy}" stroke="${SAGE}" stroke-width="2"/>
  <rect x="${cx - d}" y="${cy - d}" width="${d * 2}" height="${d * 2}" fill="${SAGE_LIGHT}" transform="rotate(45 ${cx} ${cy})"/>
</svg>`);
}

async function generatePlaceholders(slug) {
  const blogDir = path.join(root, 'public', 'images', 'blog');
  fs.mkdirSync(blogDir, { recursive: true });

  const heroDest = path.join(blogDir, `${slug}.webp`);
  await sharp(placeholderSvg(1792, 1024)).webp({ quality: 80 }).toFile(heroDest);

  const ogDest = path.join(blogDir, `${slug}-og.jpg`);
  await sharp(placeholderSvg(1200, 630)).jpeg({ quality: 86, mozjpeg: true }).toFile(ogDest);

  return { heroDest, ogDest };
}

const slug = process.argv[2];
if (slug) {
  generatePlaceholders(slug)
    .then(({ heroDest, ogDest }) =>
      console.log(`placeholder: ${path.basename(heroDest)} + ${path.basename(ogDest)}`),
    )
    .catch((e) => {
      console.error('ERR', e.message);
      process.exit(1);
    });
}

export { generatePlaceholders };
