// Real-scroll viewport captures: what a phone user actually sees at each scroll
// position, sticky and fixed elements included. Full-page stitching misplaces
// those, so it is not used here.
import { chromium } from "playwright";
const [,, url, prefix] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
await p.goto(url,{waitUntil:"networkidle",timeout:120000});
await p.evaluate(async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,400));});
const H = await p.evaluate(()=>document.documentElement.scrollHeight);
let n=0; for (let y=0;y<H;y+=760){ await p.evaluate((y)=>window.scrollTo(0,y),y); await p.waitForTimeout(350); await p.screenshot({path:`${prefix}-${String(n).padStart(2,'0')}.png`}); n++; }
console.log(`  ${prefix.split('/').pop()}: ${n} screens (page ${H}px)`); await b.close();
