import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const routes=JSON.parse(await fs.readFile('scripts/p5-visual-routes.json','utf8'));
const widths=[320,390,430,600,768,1024,1366,1440,1920];
const out='p5-component-review';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
const records=[];
const origin='http://127.0.0.1:5000';
const cabinet=process.env.P5_SITE==='cabinet';
const remodeling=process.env.P5_SITE==='remodeling';
const selected=[...new Set(['/', '/contact','/about','/testimonials',
 routes.find(r=>/^\/(services|cabinets)\/[^/]+$/.test(r)),
 routes.find(r=>/^\/services\/[^/]+\/[^/]+$/.test(r)),
 routes.find(r=>/^\/guides\/[^/]+$/.test(r)),
 routes.find(r=>/^\/blog\/[^/]+$/.test(r)),
 ...(cabinet?['/catalog','/cabinets','/compare','/construction','/builders','/warranty']:[])
].filter(Boolean))];
try {
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=1024});
  await context.route('**/api/**',r=>{
   if(!['GET','HEAD'].includes(r.request().method()))return r.fulfill({status:503,contentType:'application/json',body:'{"error":"Audit preview: submission disabled."}'});
   if(r.request().url().includes('/api/assistant/chat'))return r.fulfill({contentType:'application/json',body:'{"available":true}'});
   return r.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  for(const route of selected){
   const rec={width,route};
   try{
    await page.goto(origin+route,{waitUntil:'networkidle'});
    await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.documentElement.scrollHeight;y+=600){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,80));}});
    await page.locator('article details:not([open]) > summary').evaluateAll(es=>es.forEach(e=>e.click()));
    await page.evaluate(async()=>{const is=[...document.images].filter(i=>i.getClientRects().length);is.forEach(i=>i.loading='eager');await Promise.allSettled(is.map(i=>i.decode()));});
    await page.waitForTimeout(700);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
    assert(await page.evaluate(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0)),'Broken image');
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`${out}/${width}-${route.replaceAll('/','_')}.jpg`,fullPage:true,type:'jpeg',quality:72});
    if(route==='/'){
     const menu=page.getByRole('button',{name:'Open navigation menu',exact:true});
     if(width<1440){
      await menu.click();const dialog=page.getByRole('dialog').filter({visible:true}).first();await dialog.waitFor();
      const close=dialog.getByRole('button',{name:/close/i}).first();const rect=await close.boundingBox();assert(rect&&rect.width>=44&&rect.height>=44,'Menu close target');
      await page.screenshot({path:`${out}/${width}-menu.jpg`});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      await menu.click();await dialog.waitFor();await page.setViewportSize({width:1440,height:900});await dialog.waitFor({state:'hidden'});
      assert(await page.evaluate(()=>getComputedStyle(document.body).overflow!=='hidden'),'Resize leaves scroll locked');
      await page.setViewportSize({width,height:900});
     } else assert(!(await menu.isVisible()),'Desktop menu breakpoint');
     assert.equal(await page.locator('h1.ed-display').evaluate(e=>getComputedStyle(e).marginBottom),'32px','Hero spacing');
     assert.equal(await page.locator('dl.ed-hero-facts').count(),1,'Single facts group');
    }
    if(route==='/contact'){
     const form=page.getByTestId('input-name').filter({visible:true}).first();
     await form.scrollIntoViewIfNeeded();await form.focus();await page.waitForTimeout(400);
     const sticky=page.locator('[data-mobile-nav-bar]');
     if(await sticky.count())assert(!(await sticky.isVisible()),'Sticky CTA overlaps form');
     await page.screenshot({path:`${out}/${width}-contact-form.jpg`});
     await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(400);
     await form.blur();await page.waitForTimeout(200);
     if(await sticky.isVisible()){
      const style=await sticky.evaluate(e=>({background:getComputedStyle(e).backgroundColor,padding:getComputedStyle(e).paddingBottom}));
      assert(!style.background.startsWith('rgba')&&!['transparent',''].includes(style.background),'Sticky CTA must be opaque');
      const boxes=await sticky.locator('a,button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
      assert(boxes.every(b=>b.w>=44&&b.h>=44),'Sticky tap target');
      rec.sticky=style;
     }
     await page.screenshot({path:`${out}/${width}-footer-cta.jpg`});
    }
    if(remodeling&&route==='/'){
     const slider=page.getByRole('slider',{name:'Compare before and after'}).first();await slider.scrollIntoViewIfNeeded();
     await slider.focus();await page.keyboard.press('Home');assert.equal(await slider.getAttribute('aria-valuenow'),'0');
     await page.keyboard.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'100');
     await page.keyboard.press('ArrowLeft');assert.equal(await slider.getAttribute('aria-valuenow'),'96');
     await page.keyboard.press('Home');for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');
     await page.screenshot({path:`${out}/${width}-kitchen-comparison.jpg`});
     const imgs=await slider.locator('..').locator('img').evaluateAll(es=>es.map(i=>({w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height,nw:i.naturalWidth,nh:i.naturalHeight})));
     assert(imgs.length===2&&imgs.every(i=>Math.abs(i.w/i.h-1.5)<.01),'Comparison aspect ratio');
    }
    rec.ok=true;
   }catch(e){rec.ok=false;rec.error=String(e);await page.screenshot({path:`${out}/FAIL-${width}-${route.replaceAll('/','_')}.jpg`,fullPage:true}).catch(()=>{});}
   records.push(rec);await fs.writeFile(`${out}/results.json`,JSON.stringify(records,null,2));
  }
  const rec={width,route:'component-fixture'};
  try{
   await page.goto(origin+'/p5-audit-fixture',{waitUntil:'networkidle'});
   const slider=page.getByTestId('handle-before-after'),container=page.getByTestId('slider-before-after');
   await container.scrollIntoViewIfNeeded();await slider.focus();
   await page.keyboard.press('Home');assert.equal(await slider.getAttribute('aria-valuenow'),'0');
   const box=await container.boundingBox(),start=await slider.boundingBox();assert(start.x>=box.x,'Start handle clipping');
   await page.keyboard.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'100');
   const end=await slider.boundingBox();assert(end.x+end.width<=box.x+box.width+1,'End handle clipping');
   const y=box.y+box.height/2;
   await page.mouse.move(box.x+box.width*.25,y);await page.mouse.down();await page.mouse.move(box.x+box.width*.75,y,{steps:15});await page.mouse.up();
   assert(Math.abs(Number(await slider.getAttribute('aria-valuenow'))-75)<2,'Mouse drag');
   if(width<=1024){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.7,y}]});
    for(let i=0;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.7-.04*i),y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
    assert(Math.abs(Number(await slider.getAttribute('aria-valuenow'))-30)<3,'Touch drag');
   }
   const grid=await page.locator('#four-cards').evaluate(e=>[...e.children].map(c=>({x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y})));
   if(width>=1024)assert(grid[0].y===grid[1].y&&grid[2].y===grid[3].y&&grid[0].y!==grid[2].y,'Four cards must form two balanced rows');
   await page.screenshot({path:`${out}/${width}-slider-fixture.jpg`,fullPage:true});rec.ok=true;
  }catch(e){rec.ok=false;rec.error=String(e);}
  records.push(rec);await fs.writeFile(`${out}/results.json`,JSON.stringify(records,null,2));
  await context.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify({checks:records.length,failed:records.filter(r=>!r.ok)},null,2));
if(records.some(r=>!r.ok))process.exitCode=1;
