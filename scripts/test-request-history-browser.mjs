import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.P5_TEST_BASE_URL||'http://127.0.0.1:5000';
const origin=new URL(base).origin;
const results=[];
await fs.mkdir('p5-verification',{recursive:true});
try {
 for(const [name,engine] of Object.entries({chromium,webkit})) {
  const browser=await engine.launch();
  try { for(const width of [390,1440]) {
   const entries=[['main','main a[href="/#request"]','request'],['direct',null,'request']];
   if(width===1440)entries.push(['header','header a[href="/#request"]','request']);
   for(const [entry,selector,target] of entries) {
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin&&!u.pathname.startsWith('/api/')&&r.request().method()==='GET'?r.continue():r.abort('blockedbyclient');});
    const page=await context.newPage();
    try {
     await page.goto(base+'/',{waitUntil:'networkidle'});
     const homeHeading=await page.locator('h1').innerText();
     if(entry==='direct') {await page.goto('about:blank');await page.goto(base+'/#request',{waitUntil:'networkidle'});}
     else {const entryLink=page.locator(selector).first(); if(entry==='header'){await entryLink.focus();await page.keyboard.press('Enter');}else await entryLink.click();}
     await page.waitForURL(u=>u.pathname==='/'&&u.hash==='#'+target);
     await page.waitForFunction(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return r&&r.bottom>0&&r.top<innerHeight},target);
     assert.equal(await page.locator('#'+target).count(),1);
     assert.equal(await page.evaluate(()=>history.state?.__NA),true,'Request entry retains Next router history state');
     if(width<1024)await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
     const services=page.locator((width<1024?'[data-testid="mobile-nav-drawer"]':'header')+' a[href="/services"]:visible').first();
     await services.click();await page.waitForURL(u=>u.pathname==='/services');
     await page.waitForFunction(()=>document.querySelector('h1')?.textContent?.includes('Design-build expertise'));
     assert.equal(await page.locator('#calculator').count(),0);
     await page.goBack();await page.waitForURL(u=>u.pathname==='/'&&u.hash==='#'+target);
     await page.waitForFunction(h=>document.querySelector('h1')?.innerText===h,homeHeading);
     assert.equal(await page.locator('#'+target).count(),1,'Back must restore actual homepage content, not only URL/scroll');
     await page.goForward();await page.waitForURL(u=>u.pathname==='/services');
     await page.waitForFunction(()=>document.querySelector('h1')?.textContent?.includes('Design-build expertise'));
     assert.equal(await page.locator('#calculator').count(),0,'Forward must restore Services content');
     await page.goBack();await page.waitForFunction(h=>document.querySelector('h1')?.innerText===h,homeHeading);
     assert.equal(await page.locator('#'+target).count(),1);
     await page.screenshot({path:`p5-verification/request-history-${name}-${width}-${entry}.png`});
     results.push({browser:name,width,entry,passed:true});console.log(`${name} ${width} ${entry}: restored actual page content`);
    } finally {await context.close();}
   }
  }} finally {await browser.close();}
 }
} finally {await fs.writeFile('p5-verification/request-history-results.json',JSON.stringify(results,null,2)+'\n');}
assert.equal(results.length,10);
console.log(JSON.stringify(results));
console.log('10 real route/content Back/Forward journeys passed; no submissions or external requests');
