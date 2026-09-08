// Section-level design audit. For each page and viewport: forces reveals,
// loads lazy media, then records per top-level section: grid balance, content
// pushed to one side, empty space, text-only sections, overflow, tiny type,
// small tap targets. Screenshots every section at the shot viewports.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const [,, site, samplesFile, outDir] = process.argv;
const VIEWPORTS = [[1920,1080],[1440,900],[1280,800],[1024,768],[834,1112],[768,1024],[430,932],[390,844],[360,740]];
const SHOT = new Set([1440, 834, 390]);
const pages = fs.readFileSync(samplesFile, "utf8").split("\n").filter(l => l.startsWith(site + " ")).map(l => { const [, url, pattern] = l.split(" "); return { url, pattern }; });
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const results = [];
const slug = (u) => (new URL(u).pathname.replace(/\//g, "_").replace(/^_$/, "home").replace(/^_/, "")) || "home";
for (const pg of pages) {
  const rec = { url: pg.url, pattern: pg.pattern, viewports: {} };
  for (const [w, h] of VIEWPORTS) {
    const mobile = w < 800;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    try {
      await p.goto(pg.url, { waitUntil: "load", timeout: 120000 });
      await p.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}.reveal-init{opacity:1!important;transform:none!important}[data-reveal]{opacity:1!important;transform:none!important}" });
      await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 300)); await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000); }))); });
      const data = await p.evaluate((vw) => {
        const vis = (e) => { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const isFixed = (e) => { let n = e; while (n && n !== document.body) { const pos = getComputedStyle(n).position; if (pos === "fixed") return true; n = n.parentElement; } return false; };
        const main = document.querySelector("main") || document.body;
        let secs = [...main.querySelectorAll("section")].filter(s => !s.parentElement.closest("section") && vis(s) && !isFixed(s));
        if (secs.length < 2) secs = [...main.children].filter(c => vis(c) && c.getBoundingClientRect().height > 120 && !isFixed(c));
        const header = document.querySelector("header"); const footer = document.querySelector("footer");
        const all = [...(header && vis(header) ? [header] : []), ...secs, ...(footer && vis(footer) ? [footer] : [])];
        const out = [];
        all.forEach((s, idx) => {
          s.setAttribute("data-audit-idx", String(idx));
          const r = s.getBoundingClientRect();
          const abs = { top: r.top + scrollY, h: r.height, w: r.width, left: r.left };
          const heading = s.querySelector("h1,h2,h3")?.textContent.trim().replace(/\s+/g, " ").slice(0, 70) || "";
          const text = (s.innerText || "").trim();
          const words = text ? text.split(/\s+/).length : 0;
          const mediaEls = [...s.querySelectorAll("img,picture,video,canvas,svg")].filter(e => vis(e) && e.getBoundingClientRect().width >= 48 && e.getBoundingClientRect().height >= 48);
          const bgEls = [...s.querySelectorAll("*")].filter(e => { const bi = getComputedStyle(e).backgroundImage; return bi && bi !== "none" && /url\(/.test(bi) && !/grain|noise/i.test(bi) && vis(e) && e.getBoundingClientRect().width >= 120; });
          const media = mediaEls.length + bgEls.length;
          // grids
          const grids = [];
          for (const g of s.querySelectorAll("*")) {
            const cs = getComputedStyle(g); if (!vis(g)) continue;
            const kids = [...g.children].filter(vis); if (kids.length < 3) continue;
            let cols = 0;
            if (cs.display === "grid" || cs.display === "inline-grid") cols = cs.gridTemplateColumns.split(" ").filter(x => x && x !== "/").length;
            else if ((cs.display === "flex" || cs.display === "inline-flex") && cs.flexWrap === "wrap") { const top0 = kids[0].getBoundingClientRect().top; cols = kids.filter(k => Math.abs(k.getBoundingClientRect().top - top0) < 4).length; if (cols === kids.length) continue; }
            else continue;
            if (cols <= 1) continue;
            const n = kids.length;
            // Row membership from real positions, so spanning cells count as a
            // full row and inline chip rows (short items) are skipped.
            const avgH = kids.reduce((a, k) => a + k.getBoundingClientRect().height, 0) / n;
            if (avgH < 56) continue;
            if (/(auto|scroll)/.test(getComputedStyle(g).overflowX)) continue;
            const rowsMap = new Map(); for (const k of kids) { const top = Math.round(k.getBoundingClientRect().top / 6) * 6; rowsMap.set(top, (rowsMap.get(top) || 0) + 1); }
            const rowTops = [...rowsMap.keys()].sort((a, b) => a - b); const rows = rowTops.length; const lastRowN = rowsMap.get(rowTops[rows - 1]);
            // Columns as the eye sees them: items in the first row, not track count.
            cols = rowsMap.get(rowTops[0]) || cols;
            const lastKid = kids[kids.length - 1]; const lastRect = lastKid.getBoundingClientRect(); const gRect = g.getBoundingClientRect();
            const lastSpansRow = (lastRect.width / gRect.width) > 0.9;
            const orphan = rows > 1 && lastRowN < cols && !lastSpansRow && (lastRowN / cols) <= 0.5 + 1e-9 && n !== lastRowN;
            grids.push({ cls: (g.className || "").toString().slice(0, 60), cols, n, lastRow: lastRowN, orphan });
          }
          // content extent (leaf text/media blocks)
          let cl = Infinity, cr = -Infinity, ct = Infinity, cb = -Infinity, area = 0;
          const ownText = (e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
          const leaves = [...s.querySelectorAll("*")].filter(e => vis(e) && !isFixed(e) && (ownText(e) || /^(IMG|VIDEO|SVG|CANVAS|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) && !e.closest("[aria-hidden=true]"));
          for (const e of leaves) { const q = e.getBoundingClientRect(); if (q.width < 4 || q.height < 4) continue; cl = Math.min(cl, q.left); cr = Math.max(cr, q.right); ct = Math.min(ct, q.top); cb = Math.max(cb, q.bottom); area += q.width * q.height; }
          const extent = isFinite(cl) ? { leftGap: (cl - r.left) / r.width, rightGap: (r.right - cr) / r.width, widthRatio: (cr - cl) / r.width, heightRatio: (cb - ct) / r.height, fill: area / (r.width * r.height) } : null;
          const inScroller = (e) => { let n = e.parentElement; while (n && n !== s) { if (/(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true; n = n.parentElement; } return false; };
          const overflow = [...s.querySelectorAll("*")].some(e => { const q = e.getBoundingClientRect(); return vis(e) && q.right > vw + 2 && getComputedStyle(e).position !== "fixed" && !inScroller(e); });
          const tiny = [...s.querySelectorAll("p,span,a,li,button,label,small,div")].filter(e => vis(e) && e.children.length === 0 && (e.textContent || "").trim().length > 2 && parseFloat(getComputedStyle(e).fontSize) < 11).length;
          const tap = vw < 800 ? [...s.querySelectorAll("a,button,[role=button],input,select")].filter(e => vis(e) && (e.textContent || e.value || e.getAttribute("aria-label")) && !e.closest("[aria-hidden=true]") && getComputedStyle(e).display !== "inline" && !e.closest("p, li:not([class*=grid] > li)")).filter(e => { const q = e.getBoundingClientRect(); return q.height < 32 || q.width < 32; }).length : 0;
          out.push({ idx, tag: s.tagName, id: s.id, cls: (s.className || "").toString().slice(0, 80), heading, top: Math.round(abs.top), h: Math.round(abs.h), w: Math.round(abs.w), words, media, grids, extent, overflow, tiny, tap });
        });
        return out;
      }, w);
      for (const sec of data) {
        const f = [];
        for (const g of sec.grids) if (g.orphan) f.push(`orphan grid ${g.n} in ${g.cols} cols (${g.cls})`);
        if (sec.extent && w >= 1024 && sec.words > 20 && sec.h > 300) {
          if ((sec.extent.leftGap > 0.38 || sec.extent.rightGap > 0.38) && sec.extent.widthRatio < 0.62) f.push(`one-sided (left gap ${Math.round(sec.extent.leftGap * 100)}%, right gap ${Math.round(sec.extent.rightGap * 100)}%)`);
          if (sec.extent.fill < 0.08 && sec.h > 700) f.push(`sparse (fill ${Math.round(sec.extent.fill * 100)}%, ${sec.h}px tall)`);
        }
        if (w >= 1024 && sec.media === 0 && sec.words > 160 && sec.tag === "SECTION") f.push(`text-only ${sec.words} words`);
        if (sec.overflow) f.push("horizontal overflow");
        if (sec.tiny) f.push(`${sec.tiny} text nodes under 12px`);
        if (sec.tap) f.push(`${sec.tap} tap targets under 36px`);
        sec.flags = f;
      }
      rec.viewports[w] = data;
      if (SHOT.has(w)) {
        const dir = path.join(outDir, slug(pg.url)); fs.mkdirSync(dir, { recursive: true });
        for (const sec of data) { try { await p.locator(`[data-audit-idx="${sec.idx}"]`).screenshot({ path: path.join(dir, `${w}-${String(sec.idx).padStart(2, "0")}.png`), timeout: 15000, animations: "disabled" }); } catch {} }
      } else {
        const dir = path.join(outDir, slug(pg.url)); fs.mkdirSync(dir, { recursive: true });
        for (const sec of data) if (sec.flags.length) { try { await p.locator(`[data-audit-idx="${sec.idx}"]`).screenshot({ path: path.join(dir, `${w}-${String(sec.idx).padStart(2, "0")}-flag.png`), timeout: 15000, animations: "disabled" }); } catch {} }
      }
    } catch (e) { rec.viewports[w] = { error: String(e.message).slice(0, 120) }; }
    await ctx.close();
  }
  results.push(rec);
  const flagged = Object.entries(rec.viewports).flatMap(([vw, secs]) => Array.isArray(secs) ? secs.filter(s => s.flags.length).map(s => `${vw}:${s.idx}`) : [`${vw}:ERR`]);
  console.log(`${site} ${pg.url.replace(/https?:\/\/[^/]+/, "") || "/"} flagged=${flagged.length}${flagged.length ? " " + flagged.slice(0, 12).join(",") : ""}`);
  fs.writeFileSync(path.join(outDir, "audit.json"), JSON.stringify(results));
}
await b.close();
