/**
 * Mobile layout gate: full-page capture at 390x844 plus an automated audit for
 * horizontal overflow, clipped text, small tap targets, overlapping blocks and
 * stretched images. Run: node scripts/verify-mobile-layout.mjs <SITE> <port> <outDir> <routes...>
 */
import { chromium } from "playwright";
const [,, site, port, outDir, ...routes] = process.argv;
const b = await chromium.launch();
let failures = 0;
const HARD = new Set(['overflow-right','overflow-left','text-clipped','overlap','image-stretched']);
for (let i=0;i<60;i++){ try{ const r=await fetch(`http://localhost:${port}/`); if(r.ok) break; }catch{} await new Promise(r=>setTimeout(r,2000)); }
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
for (const route of routes) {
  let res; try { res = await p.goto(`http://localhost:${port}${route}`, { waitUntil: "networkidle", timeout: 120000 }); } catch(e) { console.log(`  ${site} ${route}: LOAD FAIL ${e.message.slice(0,50)}`); continue; }
  if (!res || res.status()>=400) { console.log(`  ${site} ${route}: HTTP ${res?res.status():'?'}`); continue; }
  // scroll through the page so reveal animations fire, then back to top
  await p.evaluate(async () => { const h=document.body.scrollHeight; for (let y=0;y<h;y+=500){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,90)); } window.scrollTo(0,0); document.querySelectorAll('.reveal-init').forEach(e=>e.classList.add('reveal-visible')); await new Promise(r=>setTimeout(r,700)); });
  const audit = await p.evaluate(() => {
    const W = window.innerWidth; const issues = [];
    const vis = (el) => { const cs=getComputedStyle(el); const r=el.getBoundingClientRect(); return cs.display!=='none' && cs.visibility!=='hidden' && r.width>0 && r.height>0; };
    // Screen-reader-only text is clipped by design, and anything inside a
    // horizontal scroller is MEANT to sit past the right edge.
    // Scrollers are MEANT to run past the edge; overflow:hidden ancestors clip, so a decorative shape
    // tucked behind a card's edge is not painted past the viewport either.
    const scroller = (el) => { for (let a=el.parentElement; a && a!==document.body; a=a.parentElement) { const o=getComputedStyle(a).overflowX; if (o==='auto'||o==='scroll'||o==='hidden'||o==='clip') return true; } return false; };
    const ignored = (el) => { if (el.closest('.sr-only, [aria-hidden="true"]')) return true; const cs=getComputedStyle(el); if (cs.position==='absolute' && cs.clip && cs.clip.startsWith('rect(0')) return true; return scroller(el); };
    const label = (el) => el.tagName.toLowerCase() + (el.id?'#'+el.id:'') + '.' + String(el.className||'').split(' ').filter(Boolean).slice(0,3).join('.') + (el.textContent?` "${el.textContent.trim().slice(0,28)}"`:'');
    // 1. anything painted past the right edge of the viewport
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el) || ignored(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > W + 2 && r.width > 8) { issues.push({ kind: 'overflow-right', by: Math.round(r.right - W), el: label(el) }); }
      if (r.left < -2 && r.width > 8 && r.right > 2) { issues.push({ kind: 'overflow-left', by: Math.round(-r.left), el: label(el) }); }
    }
    // 2. clipped/overflowing text on leaf text elements
    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,a,li,dt,dd,button,label,figcaption')) {
      if (!vis(el) || ignored(el)) continue; if (![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) continue;
      if (el.scrollWidth > el.clientWidth + 3 && getComputedStyle(el).overflow !== 'visible' && !getComputedStyle(el).textOverflow.includes('ellipsis')) issues.push({ kind: 'text-clipped', by: el.scrollWidth-el.clientWidth, el: label(el) });
      if (el.scrollWidth > W + 2) issues.push({ kind: 'text-wider-than-viewport', by: el.scrollWidth - W, el: label(el) });
    }
    // 3. tap targets
    for (const el of document.querySelectorAll('a,button,[role="button"],input,select,textarea,summary')) {
      if (!vis(el) || ignored(el)) continue; const r=el.getBoundingClientRect(); if (el.closest('footer') ) continue;
      if (r.height < 32 || r.width < 32) { if (el.textContent.trim() || el.getAttribute('aria-label')) issues.push({ kind: 'tap-target-small', by: Math.round(Math.min(r.height,r.width)), el: label(el) }); }
    }
    // 4. overlapping sibling blocks (same parent, both block-ish, intersecting by > 12px)
    for (const parent of document.querySelectorAll('section, div')) {
      const kids = [...parent.children].filter(k => vis(k) && ['DIV','SECTION','ARTICLE','P','H1','H2','H3','UL','OL','FIGURE','A','BUTTON','IMG'].includes(k.tagName));
      for (let i=0;i<kids.length;i++) for (let j=i+1;j<kids.length;j++) {
        const a=kids[i].getBoundingClientRect(), c=kids[j].getBoundingClientRect();
        const ix=Math.min(a.right,c.right)-Math.max(a.left,c.left), iy=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
        const pa=getComputedStyle(kids[i]).position, pc=getComputedStyle(kids[j]).position;
        if (ix>12 && iy>12 && !['absolute','fixed','sticky'].includes(pa) && !['absolute','fixed','sticky'].includes(pc)) issues.push({ kind: 'overlap', by: Math.round(Math.min(ix,iy)), el: label(kids[i])+'  x  '+label(kids[j]) });
      }
    }
    // 5. stretched images
    for (const img of document.querySelectorAll('img')) { if (!vis(img) || !img.naturalWidth) continue; const r=img.getBoundingClientRect(); const cs=getComputedStyle(img); if (cs.objectFit==='cover'||cs.objectFit==='contain') continue; const ar=r.width/r.height, nr=img.naturalWidth/img.naturalHeight; if (Math.abs(ar-nr)/nr>0.12) issues.push({ kind:'image-stretched', by: Math.round(Math.abs(ar-nr)/nr*100), el: label(img) }); }
    const seen=new Set(); const dedup=issues.filter(x=>{const k=x.kind+'|'+x.el; if(seen.has(k))return false; seen.add(k); return true;});
    return { height: document.documentElement.scrollHeight, scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth, issues: dedup };
  });
  const name = route === '/' ? 'home' : route.replace(/^\//,'').replace(/[\/\[\]]/g,'-');
  await p.screenshot({ path: `${outDir}/${site.toLowerCase()}-${name}.png`, fullPage: true });
  const counts = audit.issues.reduce((m,x)=>{m[x.kind]=(m[x.kind]||0)+1;return m;},{});
  console.log(`  ${site} ${route}: h=${audit.height} scrollX=${audit.scrollX} ${JSON.stringify(counts)}`);
  const ordered = [...audit.issues].sort((a,b)=>(HARD.has(b.kind)?1:0)-(HARD.has(a.kind)?1:0));
  for (const x of ordered.slice(0,14)) console.log(`      - ${x.kind} +${x.by}: ${x.el}`);
  if (audit.scrollX) failures++;
  failures += audit.issues.filter(x => HARD.has(x.kind)).length;
}
await b.close();
if (failures) { console.log(`  ${site}: ${failures} mobile layout failure(s)`); process.exit(1); }
console.log(`  ${site}: mobile layout OK`);
