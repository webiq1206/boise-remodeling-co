// Gap between the fixed header's bottom edge and the first content on every
// sample page, at desktop, tablet and phone widths.
import { chromium } from "playwright";
import fs from "node:fs";
const [,, samplesFile] = process.argv;
const pages = fs.readFileSync(samplesFile, "utf8").split("\n").filter(Boolean).map(l => { const [site, url, pattern] = l.split(" "); return { site, url, pattern }; });
const b = await chromium.launch();
const rows = [];
for (const [w, h] of [[1440, 900], [834, 1112], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  for (const pg of pages) {
    try {
      await p.goto(pg.url, { waitUntil: "load", timeout: 90000 });
      await p.addStyleTag({ content: "*{transition:none!important;animation:none!important}.reveal-init{opacity:1!important;transform:none!important}" });
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const header = document.querySelector("header") || document.querySelector("nav");
        const hb = header ? header.getBoundingClientRect().bottom : 0;
        const main = document.querySelector("main") || document.body;
        const vis = (e) => { const cs = getComputedStyle(e); const q = e.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && q.width > 4 && q.height > 4; };
        // first visible element in main carrying its own text (breadcrumb, eyebrow, h1...)
        let first = null;
        for (const e of main.querySelectorAll("*")) {
          if (!vis(e)) continue;
          if (e.closest("header, [data-testid=estimate-app-frame]")) continue;
          const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const q = e.getBoundingClientRect();
          if (q.top < 0) continue;
          if (!first || q.top < first.top) first = { top: q.top, text: e.textContent.trim().slice(0, 40), tag: e.tagName };
        }
        return { headerBottom: Math.round(hb), first, headerPos: header ? getComputedStyle(header).position : null };
      });
      const gap = r.first ? Math.round(r.first.top - r.headerBottom) : null;
      rows.push({ site: pg.site, url: pg.url, w, gap, headerBottom: r.headerBottom, first: r.first?.text, tag: r.first?.tag });
    } catch (e) { rows.push({ site: pg.site, url: pg.url, w, error: String(e.message).slice(0, 80) }); }
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync("/private/tmp/claude-501/-Volumes-SSK-Drive-P5-Citations/9b6dda05-b71a-45ef-8956-8c534694d245/scratchpad/hero-gap.json", JSON.stringify(rows, null, 1));
const bad = rows.filter(r => r.gap !== null && r.gap !== undefined && r.gap < 32);
console.log(`checked ${rows.length} page/width combos; ${bad.length} with gap under 32px`);
for (const r of bad.sort((a, b) => a.gap - b.gap)) console.log(`  ${r.site} ${r.url.replace(/https?:\/\/[^/]+/, "")} @${r.w}: gap ${r.gap}px (header bottom ${r.headerBottom}, first "${r.first}" <${r.tag}>)`);
for (const r of rows.filter(r => r.error)) console.log("  ERR", r.url, r.w, r.error);
