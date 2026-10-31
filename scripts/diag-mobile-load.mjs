import {chromium} from '@playwright/test';
const base='http://127.0.0.1:5000';const delay=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch();
for(let attempt=1;attempt<=3;attempt++){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===new URL(base).origin&&!u.pathname.startsWith('/api/')&&r.request().method()==='GET'?r.continue():r.abort('blockedbyclient');});
 const page=await ctx.newPage();const t0=Date.now();const pending=new Map();const slow=[];
 page.on('request',r=>pending.set(r,Date.now()-t0));
 page.on('requestfinished',r=>{const s=pending.get(r);pending.delete(r);const d=Date.now()-t0-s;if(d>1000)slow.push(`${d}ms from ${s}: ${r.url().slice(21,170)}`);});
 page.on('requestfailed',r=>{pending.delete(r);});
 let loadAt=null;page.on('load',()=>{loadAt=Date.now()-t0;});
 await page.setViewportSize({width:320,height:844});
 await page.goto(base,{waitUntil:'domcontentloaded'});const dcl=Date.now()-t0;await delay(1200);
 await page.evaluate(()=>scrollTo({top:400,behavior:'instant'}));await delay(100);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 const deadline=Date.now()+20000;while(loadAt===null&&Date.now()<deadline)await delay(250);
 console.log(`== attempt ${attempt} dcl=${dcl} load=${loadAt}`);
 console.log(' slow',JSON.stringify(slow));
 console.log(' pending',JSON.stringify([...pending].map(([r,s])=>`${s}: ${r.resourceType()} ${r.url().slice(21,170)}`)));
 await ctx.close();
}
await browser.close();
