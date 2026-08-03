/**
 * The site-wide Open Graph card: public/images/og-default.png.
 *
 * WHY THIS IS A SCRIPT AND NOT A ONE-OFF EXPORT. Fifteen pages point at this
 * single file, so it is the image most people will ever see of this brand -
 * every share of the homepage, the estimator, the two landing pages, the legal
 * pages. When the mark changes it has to change with it, and a hand-made PNG
 * sitting in public/ is exactly the asset that silently keeps the old logo for
 * a year. Same toolchain as generate-og-images.mjs (satori + resvg + sharp) so
 * there is one way of making cards here, not two.
 *
 *   node scripts/generate-og-default.mjs
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

/* Brand tokens. Sage is the single accent the kit permits; there is no second
   near-sage any more. */
const BONE = '#F7F5F3';
const SAGE = '#9AA098';
const CHARCOAL = '#1C1F1E';

const fontMedium = fs.readFileSync(path.join(assets, 'Montserrat-Medium.ttf'));

const h = (type, style, children) => ({
  type,
  props: { style, ...(children !== undefined ? { children } : {}) },
});

/** One corner bracket, drawn as two hairlines so it stays crisp at any scale. */
function bracket(pos) {
  const arm = 34;
  const t = 1;
  const inset = 44;
  const v = { position: 'absolute', backgroundColor: BONE, opacity: 0.28, display: 'flex' };
  const [vert, horz] = {
    tl: [{ top: inset, left: inset, width: t, height: arm }, { top: inset, left: inset, width: arm, height: t }],
    tr: [{ top: inset, right: inset, width: t, height: arm }, { top: inset, right: inset, width: arm, height: t }],
    bl: [{ bottom: inset, left: inset, width: t, height: arm }, { bottom: inset, left: inset, width: arm, height: t }],
    br: [{ bottom: inset, right: inset, width: t, height: arm }, { bottom: inset, right: inset, width: arm, height: t }],
  }[pos];
  return [h('div', { ...v, ...vert }), h('div', { ...v, ...horz })];
}

async function generate() {
  /* The wordmark comes from the brand kit itself rather than being retyped, so
     the card cannot drift from the mark used everywhere else on the site. The
     2400w master is downscaled by satori, which keeps the small descriptor line
     legible. */
  const wordmarkPath = path.join(
    root, 'public', 'brand', 'png', 'wordmark-full', 'dark',
    'boise-remodeling-co-wordmark-full-bone-accent-2400w.png',
  );
  if (!fs.existsSync(wordmarkPath)) throw new Error(`Wordmark not found: ${wordmarkPath}`);
  const wordmark = `data:image/png;base64,${fs.readFileSync(wordmarkPath).toString('base64')}`;

  const tree = h(
    'div',
    {
      width: W, height: H, display: 'flex', position: 'relative',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      backgroundColor: CHARCOAL, fontFamily: 'Montserrat',
    },
    [
      ...bracket('tl'), ...bracket('tr'), ...bracket('bl'), ...bracket('br'),
      h('img', { width: 700, height: 138, display: 'flex' }, undefined),
      h('div', { width: 56, height: 2, backgroundColor: SAGE, marginTop: 44, marginBottom: 26, display: 'flex' }),
      h('div', {
        display: 'flex', fontSize: 26, fontWeight: 500, color: SAGE, letterSpacing: 3,
      }, 'BOISEREMODELING.CO'),
    ],
  );
  // satori will not fetch for us; hand it the data URI directly.
  tree.props.children[8].props.src = wordmark;

  const svg = await satori(tree, {
    width: W, height: H,
    fonts: [{ name: 'Montserrat', data: fontMedium, weight: 500, style: 'normal' }],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const dest = path.join(root, 'public', 'images', 'og-default.png');
  await sharp(png).png({ compressionLevel: 9, palette: true }).toFile(dest);
  return dest;
}

generate()
  .then((dest) => console.log(`og-default written: ${dest} (${Math.round(fs.statSync(dest).size / 1024)}KB)`))
  .catch((e) => { console.error('ERR', e.message); process.exit(1); });
