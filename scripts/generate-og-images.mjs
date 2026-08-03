/**
 * Generates branded Open Graph share cards for blog posts / guides.
 *
 * Each card = featured photo (full-bleed) + dark charcoal overlay + the post
 * title in brand type (Montserrat) + the Boise Remodeling Co seal, output as a
 * 1200x630 PNG (best social/iMessage compatibility) at public/images/blog/{slug}-og.png.
 *
 * Usage:
 *   node scripts/generate-og-images.mjs <slug> "<Title>" [sourceImage]
 *
 * sourceImage defaults to public/images/blog/{slug}.webp (the post's featured image).
 * Requires dev tooling: sharp, satori, @resvg/resvg-js (devDependencies).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = path.join(__dirname, 'og-assets');

const W = 1200;
const H = 630;

// Brand tokens
const BONE = '#F7F5F3';
const BODY = '#E6E3DE';
const MIST = '#9AA098';
const SAGE = '#9AA098';  // the single brand accent
const CHARCOAL = '#1C1F1E';

const fontLight = fs.readFileSync(path.join(assets, 'Montserrat-Light.ttf'));
const fontMedium = fs.readFileSync(path.join(assets, 'Montserrat-Medium.ttf'));

/** Minimal hyperscript for satori's element tree (no JSX in .mjs). */
function h(type, style, children) {
  return { type, props: { style, ...(children !== undefined ? { children } : {}) } };
}

async function bgDataUri(sourceImage) {
  // satori's <img> is most reliable with JPEG/PNG; convert the WebP featured
  // image to a cover-cropped JPEG at card size.
  const buf = await sharp(sourceImage)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export async function generateOgCard(slug, title, sourceImage) {
  const src = sourceImage || path.join(root, 'public', 'images', 'blog', `${slug}.webp`);
  if (!fs.existsSync(src)) throw new Error(`Source image not found: ${src}`);

  const bg = await bgDataUri(src);

  // Centered, crop-safe composition. The seal and title live in the middle of
  // the frame so nothing is cut when a platform crops the 1.91:1 card to 4:3
  // (Google Business Profile) or square (iMessage/link thumbnails). Content
  // stays inside a centered safe zone rather than the left/bottom edges.
  const tree = h('div', {
    width: W, height: H, position: 'relative', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Montserrat', backgroundColor: CHARCOAL,
  }, [
    // Full-bleed photo
    h('img', { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' }),
    // Dark overlay - fairly even so centered text stays legible over any photo
    h('div', {
      position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex',
      backgroundImage:
        'linear-gradient(180deg, rgba(24,27,26,0.64) 0%, rgba(24,27,26,0.56) 50%, rgba(24,27,26,0.80) 100%)',
    }),
    // Centered content stack
    h('div', {
      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 820,
    }, [
      // Title - centered, constrained so it survives 4:3/square crops
      h('div', {
        display: 'flex', textAlign: 'center', fontSize: 58, fontWeight: 300, color: BONE,
        lineHeight: 1.14, letterSpacing: '-0.5px', maxWidth: 760,
      }, title),
      // Sage rule
      h('div', { width: 56, height: 2, backgroundColor: SAGE, marginTop: 32, marginBottom: 20, display: 'flex' }),
      // Eyebrow - brand + domain, centered
      h('div', {
        display: 'flex', textAlign: 'center', fontSize: 18, fontWeight: 500, color: MIST,
        letterSpacing: '2.4px',
      }, 'BOISE REMODELING CO   ·   BOISEREMODELING.CO'),
    ]),
  ]);

  // satori can't fetch remote/data <img> for us here, so inject the photo src.
  tree.props.children[0].props.src = bg;

  const svg = await satori(tree, {
    width: W, height: H,
    fonts: [
      { name: 'Montserrat', data: fontLight, weight: 300, style: 'normal' },
      { name: 'Montserrat', data: fontMedium, weight: 500, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  // Photo-based OG cards compress far smaller as JPEG (universally supported by
  // social scrapers/iMessage) while keeping the title crisp at q88.
  const dest = path.join(root, 'public', 'images', 'blog', `${slug}-og.jpg`);
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(dest);
  return dest;
}

// CLI
const [, , slugArg, titleArg, srcArg] = process.argv;
if (slugArg && titleArg) {
  generateOgCard(slugArg, titleArg, srcArg)
    .then((dest) => console.log(`OG card written: ${dest} (${Math.round(fs.statSync(dest).size / 1024)}KB)`))
    .catch((e) => { console.error('ERR', e.message); process.exit(1); });
}
