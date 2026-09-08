import { chromium } from "playwright";
const out = process.argv[2];
const sites = { p5: "http://localhost:3101", brc: "http://localhost:3102", bconc: "http://localhost:3103", bhc: "http://localhost:3104", bcc: "http://localhost:3105" };
const b = await chromium.launch();
for (const [site, base] of Object.entries(sites)) {
  for (const [w, h] of [[1440, 900], [834, 1112], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    try {
      await p.goto(base + "/", { waitUntil: "load", timeout: 90000 });
      await p.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${out}/${site}-${w}-header.png`, clip: { x: 0, y: 0, width: w, height: 120 } });
      // open the menu: hamburger button
      const btn = p.locator('header button[aria-label*="menu" i], header button[aria-label*="Menu" i], header button:has(svg.lucide-menu), button[aria-label="Open menu"], button[aria-label="Toggle menu"], header button[aria-expanded], button[aria-label="Open navigation menu"]').first();
      if (await btn.count() && await btn.isVisible()) { await btn.click(); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${site}-${w}-menu.png`, fullPage: false }); }
      // footer
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(800);
      const f = p.locator("footer").first();
      await f.screenshot({ path: `${out}/${site}-${w}-footer.png`, animations: "disabled" });
    } catch (e) { console.log(site, w, "ERR", String(e.message).slice(0, 100)); }
    await ctx.close();
  }
  console.log(site, "done");
}
await b.close();
