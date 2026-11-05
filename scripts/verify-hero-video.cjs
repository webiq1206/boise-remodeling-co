/* Real homepage media, fold geometry and keyboard checks; no API calls or form submissions. */
const { chromium, webkit } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HERO_TEST_ORIGIN || 'http://127.0.0.1:34865';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const out = path.resolve('test-results/hero-video');
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'failure.txt'), {force:true});
const records = [];
const failures = [];
const viewports = [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900],[1920,1080],[844,390],[667,375],[640,360]];
const check = (ok, text) => { if (!ok) failures.push(text); };
async function context(browser, options = {}, mode = '') {
  const c = await browser.newContext({serviceWorkers:'block', ...options});
  c.mediaRequests = [];
  await c.route('**/*', r => {
    const u = new URL(r.request().url());
    if (/\.(mp4|webm)$/.test(u.pathname)) {
      c.mediaRequests.push(u.pathname);
      if (mode === 'failed') return r.abort();
    }
    const allowed = u.origin === origin && r.request().method() === 'GET' && !u.pathname.startsWith('/api/');
    return allowed ? r.continue() : r.abort();
  });
  await c.routeWebSocket('**/*', s => s.close());
  return c;
}
async function ready(page) {
  const response=await page.goto(origin, {waitUntil:'domcontentloaded', timeout:180000});
  assert.equal(response.status(),200,'homepage response');
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-height'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => { const image=document.querySelector('.fam-hero-img'); return image && image.complete && image.naturalWidth>0; });
}
async function playing(page) {
  await page.waitForFunction(() => { const v=document.querySelector('video'); return v && !v.paused && v.currentTime>0; }, null, {timeout:20000});
}
async function geometry(page, key) {
  const g = await page.evaluate(() => {
    const rect = s => { const r=document.querySelector(s).getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}; };
    const bar=document.querySelector('[data-family-bar]');
    const barVisible=bar && getComputedStyle(bar).display!=='none' && getComputedStyle(bar).visibility!=='hidden';
    const v=document.querySelector('video');
    return {viewport:{width:innerWidth,height:innerHeight},header:rect('[data-family-header]'),hero:rect('[data-video-hero]'),media:rect('.fam-hero-media'),video:rect('video'),next:rect('.fam-proof'),cta:rect('[data-hero-cta]'),support:rect('.fam-hero-support'),bar:barVisible?rect('[data-family-bar]'):null,
      toggle:document.querySelector('.remodeling-hero-video-toggle')?rect('.remodeling-hero-video-toggle'):null,
      scrim:{color:getComputedStyle(document.querySelector('.fam-hero-scrim')).backgroundColor,image:getComputedStyle(document.querySelector('.fam-hero-scrim')).backgroundImage},innerBackground:getComputedStyle(document.querySelector('.fam-hero-inner')).backgroundImage,accentMask:getComputedStyle(document.querySelector('.fam-hero-accent'),'::before').content,
      source:v.currentSrc,muted:v.muted,loop:v.loop,inline:v.playsInline,posterLoaded:document.querySelector('.fam-hero-img').naturalWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  check(Math.abs(g.hero.top-g.header.bottom)<1, `${key}: gap below header`);
  check(g.hero.bottom>=g.viewport.height-1 && g.next.top>=g.viewport.height-1, `${key}: next section exposed`);
  check(g.hero.left===0 && g.hero.width===g.viewport.width, `${key}: hero not full width`);
  check(Math.abs(g.media.height-g.hero.height)<1 && g.video.width===g.hero.width && Math.abs(g.video.height-g.hero.height)<1, `${key}: media does not cover hero`);
  check(g.scrim.color==='rgba(0, 0, 0, 0.6)' && g.scrim.image==='none' && g.innerBackground==='none' && g.accentMask==='none', `${key}: overlay not uniform black60`);
  check(g.scrollWidth===g.viewport.width, `${key}: horizontal overflow`);
  check(g.support.bottom<=(g.bar?.top ?? g.viewport.height)+1, `${key}: support below initial fold/action bar`);
  check(g.cta.bottom<=(g.bar?.top ?? g.viewport.height)+1, `${key}: CTA below initial fold/action bar`);
  if (g.toggle) {
    check(g.toggle.bottom<=(g.bar?.top ?? g.viewport.height)+1, `${key}: playback control obscured`);
    check(g.toggle.top>=g.support.bottom || g.toggle.left>=g.support.right || g.toggle.right<=g.support.left, `${key}: playback control overlaps support`);
    check(g.toggle.top>=g.cta.bottom || g.toggle.left>=g.cta.right || g.toggle.right<=g.cta.left, `${key}: playback control overlaps CTA`);
  }
  check(g.posterLoaded>0, `${key}: missing poster`);
  records.push({key,...g});
  return g;
}
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const c=await context(browser);
    for (const [width,height] of viewports) {
      const p=await c.newPage();
      await p.setViewportSize({width,height});
      await ready(p); await playing(p);
      const key=`chromium-${width}x${height}`;
      const g=await geometry(p,key);
      check(g.muted && g.loop && g.inline, `${key}: playback attributes`);
      check(g.source.endsWith(width<=767?'background-720p.mp4':'background-1080p.mp4'),`${key}: wrong responsive source`);
      await p.screenshot({path:path.join(out,`${key}.png`)}); console.log(`Checked ${key}`);
      if (width===390 || width===1440) {
        for (const time of [8,16,23]) {
          await p.locator('video').evaluate((v,t)=>{v.currentTime=t;},time);
          await p.waitForFunction(t=>Math.abs(document.querySelector('video').currentTime-t)<1 && !document.querySelector('video').seeking,time);
          await p.screenshot({path:path.join(out,`${key}-frame-${time}.png`)});
        }
        const toggle=p.getByRole('button',{name:'Pause background video',exact:true});
        await toggle.focus(); await p.keyboard.press('Space');
        await p.waitForFunction(()=>document.querySelector('video').paused);
        const before=await p.locator('video').evaluate(v=>v.currentTime);
        await p.waitForTimeout(250);
        check(Math.abs((await p.locator('video').evaluate(v=>v.currentTime))-before)<0.05,`${key}: pause did not freeze playback`);
        check(await p.locator('video').evaluate(v=>getComputedStyle(v).opacity==='1'),`${key}: paused frame disappeared`);
        await p.keyboard.press('Enter'); await playing(p);
        if (width===1440) {
          const launcher=p.getByTestId('assistant-launcher');
          await launcher.waitFor({state:'visible'});
          const overlap=await p.evaluate(()=>{
            const a=document.querySelector('.remodeling-hero-video-toggle').getBoundingClientRect();
            const b=document.querySelector('[data-testid="assistant-launcher"]').getBoundingClientRect();
            return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
          });
          check(!overlap,'desktop playback control overlaps chat launcher');
          await p.screenshot({path:path.join(out,'desktop-controls.png')});
        }
      }
      if (width===390) {
        for (const h of [700,932,844]) { await p.setViewportSize({width,height:h}); await geometry(p,`resized-390x${h}`); }
        await p.getByRole('button',{name:'Pause background video'}).click();
        await p.setViewportSize({width:1280,height:720});
        await p.waitForTimeout(200);
        check(await p.locator('video').evaluate(v=>v.paused), 'manual pause survives source switch');
        await p.getByRole('button',{name:'Play background video'}).click(); await playing(p);
        check((await p.locator('video').evaluate(v=>v.currentSrc)).endsWith('background-1080p.mp4'),'resizing selects desktop');
      }
      await p.close();
    }
    await c.close();
    const reduced=await context(browser,{reducedMotion:'reduce',viewport:{width:390,height:844}});
    const p=await reduced.newPage(); await ready(p);
    await geometry(p,'reduced-motion');
    check(reduced.mediaRequests.length===0,'reduced motion fetched video');
    check(await p.locator('video').evaluate(v=>!v.getAttribute('src') && v.paused),'reduced motion did not retain static poster');
    check(await p.locator('.remodeling-hero-video-toggle').count()===0,'reduced motion control should be absent');
    await p.screenshot({path:path.join(out,'reduced-motion.png')});
    await p.emulateMedia({reducedMotion:'no-preference'}); await playing(p);
    await p.emulateMedia({reducedMotion:'reduce'}); await p.waitForFunction(()=>!document.querySelector('video').getAttribute('src') && document.querySelector('video').paused);
    await reduced.close();
    const failed=await context(browser,{viewport:{width:390,height:844}},'failed');
    const f=await failed.newPage(); await ready(f);
    await f.waitForFunction(()=>document.querySelector('video').error);
    check(await f.locator('video').evaluate(v=>getComputedStyle(v).opacity==='0'),'failed video covered poster');
    check(await f.locator('.fam-hero-img').evaluate(i=>i.naturalWidth>0),'failed-video poster missing');
    await geometry(f,'failed-video'); await f.screenshot({path:path.join(out,'failed-video.png')}); await failed.close();
    const blocked=await context(browser,{viewport:{width:390,height:844}});
    await blocked.addInitScript(()=>{window.originalVideoPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));};});
    const a=await blocked.newPage(); await ready(a);
    check(await a.locator('video').evaluate(v=>v.paused && getComputedStyle(v).opacity==='0'),'autoplay rejection covered poster');
    const play=a.getByRole('button',{name:'Play background video'}); check(await play.isVisible(),'autoplay rejection lost retry control');
    await a.screenshot({path:path.join(out,'autoplay-blocked.png')});
    await a.evaluate(()=>{HTMLMediaElement.prototype.play=window.originalVideoPlay;});
    await play.focus();await a.keyboard.press('Enter');await playing(a); await blocked.close();
    const nojs=await context(browser,{javaScriptEnabled:false,viewport:{width:390,height:844}});
    const n=await nojs.newPage();await n.goto(origin,{waitUntil:'networkidle'});
    check(await n.locator('.fam-hero-img').isVisible(),'no-JS poster hidden');
    check(await n.locator('[data-hero-cta]').getAttribute('href')==='/#request','no-JS request lost');
    check(nojs.mediaRequests.length===0,'no-JS fetched video');
    await n.screenshot({path:path.join(out,'no-javascript.png')});await nojs.close();
  } finally { await browser.close(); }
  if (process.env.HERO_TEST_WEBKIT==='1') {
    const browser=await webkit.launch({headless:true});
    try { const c=await context(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();await ready(p);await playing(p);await geometry(p,'webkit-390x844');await p.screenshot({path:path.join(out,'webkit-390x844.png')});await c.close(); } finally {await browser.close();}
  }
  fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify({records,failures},null,2));
  console.log(JSON.stringify({checks:'video, overlay, fold, responsive source, keyboard pause/play, resizing, reduced motion, failed playback, autoplay rejection, no JavaScript',viewports:records.length,failures},null,2));
  assert.equal(failures.length,0,failures.join('\n'));
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.txt'),String(e.stack||e));console.error(e);process.exitCode=1;});
