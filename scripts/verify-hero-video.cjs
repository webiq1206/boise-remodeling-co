/* Actual control-free homepage playback/fold checks; no external requests or form submissions. */
const {chromium,webkit} = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HERO_TEST_ORIGIN || 'http://127.0.0.1:34865';
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
const out = path.resolve('test-results/hero-video');
fs.mkdirSync(out,{recursive:true});
fs.rmSync(path.join(out,'failure.txt'),{force:true});
const records=[], failures=[], loops=[];
const viewports=[[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900],[1920,1080],[844,390],[667,375],[640,360]];
const check=(ok,message)=>{if(!ok)failures.push(message);};
async function context(browser,options={},mode='',saveData=false) {
  const c=await browser.newContext({serviceWorkers:'block',...options,...(saveData?{extraHTTPHeaders:{'Save-Data':'on'}}:{})});
  c.mediaRequests=[];
  if(saveData)await c.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'2g'}}));
  if(mode==='blocked')await c.addInitScript(()=>{
    // Simulate a browser that refuses both native and API-driven autoplay.
    window.__heroPlayAttempts=0;
    document.addEventListener('loadstart',event=>{if(event.target instanceof HTMLVideoElement)event.target.pause();},true);
    HTMLMediaElement.prototype.play=function(){window.__heroPlayAttempts++;this.pause();return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));};
  });
  await c.route('**/*',r=>{
    const u=new URL(r.request().url());
    if(/\.(mp4|webm)$/.test(u.pathname)) {
      c.mediaRequests.push(u.pathname);
      if(mode==='failed')return r.abort();
      if(mode==='unsupported')return r.fulfill({status:200,contentType:'video/mp4',body:'Unsupported test media'});
    }
    return u.origin===origin && r.request().method()==='GET' && !u.pathname.startsWith('/api/')?r.continue():r.abort();
  });
  await c.routeWebSocket('**/*',s=>s.close());
  return c;
}
async function ready(page) {
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:180000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--header-height'));
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const i=document.querySelector('.fam-hero-img');return i.complete&&i.naturalWidth>0;});
}
async function playing(page) {
  await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>0&&getComputedStyle(v).opacity==='1';},null,{timeout:20000});
}
async function loop(page,key) {
  await page.locator('video').evaluate(v=>{
    v.__loopEvents=[];
    for(const name of ['loadstart','playing','pause','waiting','seeking','seeked','ended','error'])v.addEventListener(name,()=>v.__loopEvents.push({event:name,time:v.currentTime,paused:v.paused,ready:v.readyState}));
    v.currentTime=v.duration-.25;
  });
  try {
    await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime<2;},null,{timeout:10000});
  } catch(error) {
    const state=await page.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,seeking:v.seeking,ready:v.readyState,network:v.networkState,opacity:getComputedStyle(v).opacity,visible:document.visibilityState,error:v.error?.message,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),events:v.__loopEvents}));
    fs.writeFileSync(path.join(out,`${key}-loop-failure.json`),JSON.stringify(state,null,2));
    throw error;
  }
  const state=await page.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,loop:v.loop,muted:v.muted}));
  check(state.loop&&state.muted&&!state.paused,`${key}: loop did not restart muted playback`);
  loops.push({key,...state});
}
async function geometry(page,key) {
  const g=await page.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
    const hero=document.querySelector('[data-video-hero]'),v=hero.querySelector('video'),bar=document.querySelector('[data-family-bar]');
    const visibleBar=bar&&getComputedStyle(bar).display!=='none'&&getComputedStyle(bar).visibility!=='hidden';
    return{viewport:{width:innerWidth,height:innerHeight},header:rect('[data-family-header]'),hero:rect('[data-video-hero]'),media:rect('.fam-hero-media'),video:rect('video'),next:rect('.fam-proof'),cta:rect('[data-hero-cta]'),support:rect('.fam-hero-support'),bar:visibleBar?rect('[data-family-bar]'):null,
      buttons:hero.querySelectorAll('button,[role="button"],input[type="button"]').length,linkedControls:document.querySelectorAll('[aria-controls="remodeling-hero-video"],.remodeling-hero-video-toggle').length,nativeControls:v.controls,controlsAttribute:v.hasAttribute('controls'),tabIndex:v.tabIndex,
      scrim:{color:getComputedStyle(document.querySelector('.fam-hero-scrim')).backgroundColor,image:getComputedStyle(document.querySelector('.fam-hero-scrim')).backgroundImage},innerBackground:getComputedStyle(document.querySelector('.fam-hero-inner')).backgroundImage,accentMask:getComputedStyle(document.querySelector('.fam-hero-accent'),'::before').content,
      source:v.currentSrc,muted:v.muted,loop:v.loop,inline:v.playsInline,autoplay:v.autoplay,posterLoaded:document.querySelector('.fam-hero-img').naturalWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  check(Math.abs(g.hero.top-g.header.bottom)<1,`${key}: header gap`);
  check(g.hero.bottom>=g.viewport.height-1&&g.next.top>=g.viewport.height-1,`${key}: following section exposed`);
  check(g.hero.left===0&&g.hero.width===g.viewport.width&&Math.abs(g.media.height-g.hero.height)<1&&g.video.width===g.hero.width&&Math.abs(g.video.height-g.hero.height)<1,`${key}: media not full bleed`);
  check(g.scrim.color==='rgba(0, 0, 0, 0.6)'&&g.scrim.image==='none'&&g.innerBackground==='none'&&g.accentMask==='none',`${key}: overlay changed`);
  check(g.scrollWidth===g.viewport.width,`${key}: horizontal overflow`);
  check(g.cta.bottom<=(g.bar?.top??g.viewport.height)+1&&g.support.bottom<=(g.bar?.top??g.viewport.height)+1,`${key}: copy/action obscured`);
  check(!g.buttons&&!g.linkedControls&&!g.nativeControls&&!g.controlsAttribute&&g.tabIndex===-1,`${key}: playback controls rendered`);
  check(g.autoplay&&g.muted&&g.loop&&g.inline&&g.posterLoaded>0,`${key}: media attributes/poster`);
  records.push({key,...g});return g;
}
async function preferences(browser,key,viewport,options={}) {
  const c=await context(browser,{viewport,reducedMotion:'reduce',...options},'',true);
  const p=await c.newPage();await ready(p);await playing(p);
  check(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&navigator.connection.saveData===true),`${key}: preferences not emulated`);
  check(c.mediaRequests.length>0,`${key}: preference prevented media request`);
  await geometry(p,key);await loop(p,key);
  await p.emulateMedia({reducedMotion:'no-preference'});await playing(p);
  await p.emulateMedia({reducedMotion:'reduce'});await playing(p);
  await p.screenshot({path:path.join(out,`${key}.png`)});await c.close();
}
async function fallback(browser,key,viewport,mode,options={}) {
  const c=await context(browser,{viewport,...options},mode),p=await c.newPage();await ready(p);
  if(mode==='blocked')await p.waitForFunction(()=>window.__heroPlayAttempts>0&&document.querySelector('video').paused&&getComputedStyle(document.querySelector('video')).opacity==='0');
  else await p.waitForFunction(()=>document.querySelector('video').error&&getComputedStyle(document.querySelector('video')).opacity==='0');
  check(await p.locator('.fam-hero-img').evaluate(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).display!=='none'),`${key}: technical-failure poster missing`);
  await geometry(p,key);await p.screenshot({path:path.join(out,`${key}.png`)});await c.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const c=await context(browser);
    for(const [width,height]of viewports) {
      const p=await c.newPage();await p.setViewportSize({width,height});await ready(p);await playing(p);
      const key=`chromium-${width}x${height}`,g=await geometry(p,key);
      check(g.source.endsWith(width<=767?'background-720p.mp4':'background-1080p.mp4'),`${key}: source selection`);
      await p.screenshot({path:path.join(out,`${key}.png`)});
      if(width===390||width===1440) {
        for(const time of [8,16,23]){await p.locator('video').evaluate((v,t)=>{v.currentTime=t;},time);await p.waitForFunction(()=>!document.querySelector('video').seeking);await p.screenshot({path:path.join(out,`${key}-frame-${time}.png`)});}
        await loop(p,key);
      }
      if(width===390) {
        for(const h of [700,932,844]){await p.setViewportSize({width,height:h});await playing(p);await geometry(p,`resized-390x${h}`);}
        await p.setViewportSize({width:1280,height:720});await playing(p);
        check((await p.locator('video').evaluate(v=>v.currentSrc)).endsWith('background-1080p.mp4'),'source switch did not resume desktop autoplay');
      }
      const cta=p.locator('[data-hero-cta]');await cta.focus();
      check(await cta.evaluate(e=>document.activeElement===e&&e.getAttribute('href')==='/#request'),`${key}: quote keyboard access`);
      await p.close();console.log(`Checked ${key}`);
    }
    await c.close();
    for(const [width,height]of [[390,844],[768,1024],[1440,900]])await preferences(browser,`reduced-data-${width}`,{width,height});
    for(const [width,height]of [[390,844],[1440,900]])for(const mode of ['failed','unsupported','blocked'])await fallback(browser,`${mode}-${width}`,{width,height},mode);
    const nojs=await context(browser,{javaScriptEnabled:false,viewport:{width:390,height:844}}),n=await nojs.newPage();
    await n.goto(origin,{waitUntil:'networkidle'});
    check(await n.locator('.fam-hero-img').isVisible()&&await n.locator('[data-hero-cta]').getAttribute('href')==='/#request','no-JavaScript fallback/copy missing');
    check(nojs.mediaRequests.length===0,'no-JavaScript fetched a video');await geometry(n,'no-javascript');
    await n.screenshot({path:path.join(out,'no-javascript.png')});await nojs.close();
  } finally {await browser.close();}
  if(process.env.HERO_TEST_WEBKIT==='1') {
    const b=await webkit.launch({headless:true}),viewport={width:390,height:844},options={isMobile:true,hasTouch:true};
    try {
      const c=await context(b,{viewport,...options}),p=await c.newPage();await ready(p);await playing(p);await geometry(p,'webkit-390x844');await loop(p,'webkit-390x844');await p.screenshot({path:path.join(out,'webkit-390x844.png')});await c.close();
      await preferences(b,'webkit-reduced-data',viewport,options);
      for(const mode of ['failed','unsupported','blocked'])await fallback(b,`webkit-${mode}`,viewport,mode,options);
    } finally {await b.close();}
  }
  fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify({records,loops,failures},null,2));
  console.log(JSON.stringify({checks:'no custom/native controls, autoplay, muted inline loop, reduced motion/data saver, source resize, fold, quote keyboard access, technical failure/unsupported/autoplay rejection/no-JS fallback',states:records.length,observedLoops:loops.length,failures},null,2));
  assert.equal(failures.length,0,failures.join('\n'));
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack||e));console.error(e);process.exitCode=1;});
