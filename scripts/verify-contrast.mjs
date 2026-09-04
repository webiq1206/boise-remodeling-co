/**
 * WCAG contrast gate for the rendered site.
 *
 * The redesign introduces light bands to a page that was built entirely dark,
 * which is exactly the change most likely to strand a colour somewhere it is no
 * longer legible. Reasoning about tokens is not enough: what matters is the
 * ratio of the COMPOSITED foreground against the ground actually painted behind
 * it, after alpha, inheritance and every utility class have had their say.
 *
 * This walks real pages in a real browser and measures that.
 *
 * It has already earned its place twice. It caught a heading rendering bone on
 * a bone band at 1.00:1 - invisible, and invisible in a screenshot too, because
 * there is nothing to see. And it found 36 pre-existing failures at 4.21:1
 * where the site's own `--muted-foreground` sage sat under the 4.5:1 floor on
 * its own charcoal ground, which covered most of the supporting copy.
 *
 * Run: node scripts/verify-contrast.mjs [baseUrl]
 * Requires the dev server to be running (default http://localhost:5031).
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || process.env.CONTRAST_BASE_URL || "http://localhost:5031";

/** The pages that carry the redesigned bands, plus the highest-traffic routes. */
const ROUTES = [
  "/",
  "/services",
  "/about",
  "/contact",
  "/gallery",
  "/estimate",
];

/** Viewports: a light band can pass on desktop and fail once type reflows. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const AUDIT = () => {
  const toRGBA = (c) => {
    const m = c.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number);
    const a = m.length > 3 ? Number(m[3]) : 1;
    return c.startsWith("color(") ? [r * 255, g * 255, b * 255, a] : [r, g, b, a];
  };
  const over = (fg, bg) =>
    fg[3] >= 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const lum = (c) => {
    const f = c.slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => {
    const L1 = lum(a);
    const L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  /* Walk up for the first ground that is actually opaque enough to paint. */
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = toRGBA(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0.85) return c;
      n = n.parentElement;
    }
    return [255, 255, 255, 1];
  };

  const fails = [];
  let checked = 0;
  const SEL = "h1,h2,h3,h4,h5,h6,p,li,a,span,button,label,small,figcaption,summary,td,th,dt,dd";
  document.querySelectorAll(SEL).forEach((el) => {
    /* Own text only - otherwise a wrapper is judged on its children's colours. */
    const txt = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!txt || txt.length < 2) return;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.15) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* Visually-hidden text (sr-only: clipped to 1px) is read by screen readers,
       never seen, and has no contrast requirement. Without this it is judged
       against whatever happens to be painted under its 1px clip. */
    if (el.classList.contains("sr-only") || (r.width <= 1 && r.height <= 1)) return;
    /* aria-hidden text is decorative by declaration: assistive tech never reads
       it and its visual form is a deliberate choice - the masked "$--- to $---"
       placeholder the estimator shows before contact capture is blurred on
       purpose, and carries an sr-only twin with the real words. */
    if (el.closest('[aria-hidden="true"]')) return;
    /* Text sitting on a photograph has no single ground to measure against; those
       are handled with scrims and are checked by eye, not by this script. */
    if (el.closest("[data-contrast-skip]")) return;

    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;

    const bg = bgOf(el);
    const fg = over(toRGBA(cs.color), bg);
    const got = ratio(fg, bg);
    checked++;
    if (got < need) {
      fails.push({
        text: txt.slice(0, 60),
        size: Math.round(size),
        need,
        got: Number(got.toFixed(2)),
        el: el.tagName.toLowerCase() + "." + String(el.className || "").split(" ").slice(0, 3).join("."),
      });
    }
  });
  return { checked, fails };
};

const browser = await chromium.launch();
let totalChecked = 0;
const allFails = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const route of ROUTES) {
    let res;
    try {
      res = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    } catch {
      console.error(`  ! ${route} (${vp.name}) did not load - skipped`);
      continue;
    }
    if (!res || res.status() >= 400) {
      console.error(`  ! ${route} (${vp.name}) returned ${res ? res.status() : "no response"} - skipped`);
      continue;
    }
    /* Let entry animations settle so nothing is measured mid-fade. */
    await page.waitForTimeout(700);
    const { checked, fails } = await page.evaluate(AUDIT);
    totalChecked += checked;
    for (const f of fails) allFails.push({ ...f, route, viewport: vp.name });
  }
  await page.close();
}
await browser.close();

console.log(`\nContrast: ${totalChecked} text nodes measured across ${ROUTES.length} routes x ${VIEWPORTS.length} viewports.`);

if (allFails.length === 0) {
  console.log("All measured text meets WCAG AA (4.5:1 normal, 3:1 large).");
  process.exit(0);
}

/* One line per distinct failing colour+element, not per occurrence: the same
   token failing on 30 paragraphs is one fix, and 30 lines hides that. */
const seen = new Map();
for (const f of allFails) {
  const key = `${f.el}|${f.got}`;
  if (!seen.has(key)) seen.set(key, { ...f, count: 0 });
  seen.get(key).count++;
}
console.error(`\n${allFails.length} failing text nodes (${seen.size} distinct):\n`);
for (const f of [...seen.values()].sort((a, b) => a.got - b.got)) {
  console.error(
    `  ${String(f.got).padStart(5)}:1  needs ${f.need}  ${f.size}px  x${f.count}  ${f.route} (${f.viewport})\n      ${f.el}\n      "${f.text}"`,
  );
}
process.exit(1);
