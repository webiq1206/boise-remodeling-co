/* Actual homepage contrast samples and a conservative bound for every video pixel.
 * Formula/thresholds: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 * Shadows/halos: https://www.w3.org/WAI/WCAG22/Techniques/general/G18
 * No API calls, external requests, lead submissions or source-media changes.
 */
const {chromium} = require('@playwright/test');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HERO_TEST_ORIGIN || 'http://127.0.0.1:34865';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const out = path.resolve('test-results/hero-video/contrast');
fs.rmSync(out, {recursive:true,force:true});
fs.mkdirSync(out, {recursive:true});
const viewports = [[320,568],[390,844],[768,1024],[1440,900]];
const times = [0.2,1,4,7,10,13,16,19,22,25,28,29.7];
const selectors = {
  eyebrow:'.fam-hero-eyebrow', heading:'.fam-hero-title', accent:'.fam-hero-accent',
  support:'.fam-hero-support', cta:'[data-hero-cta]',
};
const auditSelectors = Object.values(selectors).map(s => `html body [data-video-hero] ${s}`).join(',');
const results = [], bounds = [], failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
function rgb(css) { return css.match(/[\d.]+/g).map(Number); }
function luminance(channels) {
  return channels.slice(0,3).map(channel => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [0.2126,0.7152,0.0722][i], 0);
}
function contrast(a, b) { return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05); }
const rendered = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function capture(page, filename, save=true) {
  const image = await page.screenshot(save ? {path:path.join(out,filename)} : {});
  return sharp(image).removeAlpha().raw().toBuffer();
}
function glyphMask(pixels, region, width, height) {
  const core = new Set(), body = new Set(), ring = new Set();
  for (const rect of region.rects) {
    for (let y=Math.max(0,Math.floor(rect.top)); y<Math.min(height,Math.ceil(rect.bottom)); y++) {
      for (let x=Math.max(0,Math.floor(rect.left)); x<Math.min(width,Math.ceil(rect.right)); x++) {
        const i = (y * width + x) * 3;
        if (pixels[i]>200 && pixels[i+1]>200 && pixels[i+2]>200) core.add(i);
        if (pixels[i]>32 && pixels[i+1]>32 && pixels[i+2]>32) body.add(i);
      }
    }
  }
  for (const i of body) {
    const x=(i/3)%width, y=Math.floor(i/3/width);
    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx=x+dx, ny=y+dy, j=(ny*width+nx)*3;
      if (nx>=0 && nx<width && ny>=0 && ny<height && !body.has(j)) ring.add(j);
    }
  }
  assert.ok(core.size && ring.size, `${region.name}: empty text mask`);
  return {core:[...core], ring:[...ring]};
}
function measure(pixels, indices, foreground, threshold) {
  const ratios = indices.map(i => contrast(foreground, luminance([pixels[i],pixels[i+1],pixels[i+2]])));
  return {minimum:Math.min(...ratios), failingPixels:ratios.filter(r => r<threshold).length, sampledPixels:ratios.length};
}
async function main() {
  const browser = await chromium.launch({headless:true});
  try {
    for (const [width,height] of viewports) {
      const key = `${width}x${height}`;
      const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
      await page.route('**/*', route => {
        const url=new URL(route.request().url());
        return url.origin===origin && route.request().method()==='GET' && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
      });
      await page.routeWebSocket('**/*', socket => socket.close());
      const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:180000});
      assert.equal(response.status(),200);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-height'));
      await page.waitForFunction(() => {const i=document.querySelector('.fam-hero-img'); return i.complete && i.naturalWidth>0;});
      await page.waitForFunction(() => {const v=document.querySelector('video'); return v.currentTime>0 && !v.paused;});
      await page.locator('video').evaluate(video => video.pause());
      // Audit-only changes prevent color-transition ghosts and keep masks stable.
      await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
      const info=await page.evaluate(selectors => {
        const scrim=document.querySelector('.fam-hero-scrim'), style=getComputedStyle(scrim);
        return {scrim:{color:style.backgroundColor,image:style.backgroundImage,opacity:style.opacity,blend:style.mixBlendMode},
          regions:Object.entries(selectors).map(([name,selector]) => {
            const element=document.querySelector(selector), css=getComputedStyle(element);
            let rects=[element.getBoundingClientRect()];
            if (name==='heading') {const range=document.createRange(); range.selectNodeContents(element.firstChild); rects=[...range.getClientRects()];}
            return {name,selector,text:name==='heading'?element.firstChild.textContent.trim():element.textContent.trim(),color:css.color,fontSize:parseFloat(css.fontSize),fontWeight:parseInt(css.fontWeight),fontFamily:css.fontFamily,textShadow:css.textShadow,
              rects:rects.map(r => ({left:r.left,top:r.top,right:r.right,bottom:r.bottom}))};
          })};
      },selectors);
      assert.equal(info.scrim.color,'rgba(0, 0, 0, 0.6)');
      assert.equal(info.scrim.image,'none');
      assert.equal(info.scrim.opacity,'1');
      assert.equal(info.scrim.blend,'normal');
      const overlay=rgb(info.scrim.color), alpha=overlay[3];
      const brightest=overlay.slice(0,3).map(channel => channel*alpha + 255*(1-alpha));
      for (const region of info.regions) {
        region.threshold=region.fontSize>=24 || (region.fontSize>=18.6667 && region.fontWeight>=700) ? 3 : 4.5;
        if (['eyebrow','heading','accent','support'].includes(region.name)) {
          const foreground=rgb(region.color), foregroundLuminance=luminance(foreground), backgroundLuminance=luminance(brightest);
          assert.ok(foreground.length===3 || foreground[3]===1, `${key} ${region.name}: bound requires opaque text`);
          assert.ok(foregroundLuminance>backgroundLuminance, `${key} ${region.name}: bound requires text lighter than every possible background pixel`);
          const minimum=contrast(foregroundLuminance,backgroundLuminance);
          const margin=region.name==='accent'?3.5:5.4;
          bounds.push({viewport:key,name:region.name,color:region.color,fontSize:region.fontSize,threshold:region.threshold,minimum,guard:margin,brightestBackground:brightest,overlay:info.scrim});
          check(minimum>=margin,`${key} ${region.name}: white-frame bound ${minimum} below guard ${margin}`);
        }
      }
      const maskStyle=await page.addStyleTag({content:`html body [data-video-hero]{background:#000!important}html body [data-video-hero] .fam-hero-media{visibility:hidden!important}html body [data-video-hero] .fam-hero-scrim{background:none!important}${auditSelectors}{color:#fff!important;text-shadow:none!important;-webkit-text-stroke:0!important;background:transparent!important;border-color:transparent!important;outline:none!important}`});
      await rendered(page);
      for (const region of info.regions) assert.equal(await page.locator(region.selector).evaluate(e => getComputedStyle(e).color),'rgb(255, 255, 255)');
      const maskPixels=await capture(page,`${key}-glyph-mask.png`);
      const masks=Object.fromEntries(info.regions.map(region => [region.name,glyphMask(maskPixels,region,width,height)]));
      await maskStyle.evaluate(style => style.remove());
      const hiddenFill=await page.addStyleTag({content:`${auditSelectors}{color:transparent!important}`});
      await rendered(page);
      for (const sample of [...times.map(time => ({kind:'video',time})),{kind:'poster'},{kind:'white-frame'}]) {
        const label=sample.kind==='video'?String(sample.time):sample.kind;
        if (sample.kind==='video') {
          await page.locator('video').evaluate((video,time) => {video.currentTime=time;},sample.time);
          await page.waitForFunction(time => {const v=document.querySelector('video'); return !v.seeking && Math.abs(v.currentTime-time)<0.15;},sample.time);
        } else if (sample.kind==='poster') await page.locator('video').evaluate(video => {video.style.visibility='hidden';});
        else await page.evaluate(() => {document.querySelector('.fam-hero-media').style.visibility='hidden';document.querySelector('[data-video-hero]').style.background='#fff';});
        await rendered(page);
        for (const treatment of ['painted-shadow','without-shadow']) {
          const noShadow=treatment==='without-shadow'?await page.addStyleTag({content:`${auditSelectors}{text-shadow:none!important;-webkit-text-stroke:0!important}`}):null;
          await rendered(page);
          // Measure every sample; retain representative background images so the
          // complete screenshots/JSON artifact stays within its existing 64MiB cap.
          const save=sample.kind!=='video' || [1,7,13,22,28].includes(sample.time);
          const pixels=await capture(page,`${key}-${label}-${treatment}.png`,save);
          for (const region of info.regions) {
            const foreground=luminance(rgb(region.color)), mask=masks[region.name];
            const core=measure(pixels,mask.core,foreground,region.threshold), ring=measure(pixels,mask.ring,foreground,region.threshold);
            results.push({viewport:key,sample,treatment,...region,core,ring});
            check(core.minimum>=region.threshold && ring.minimum>=region.threshold,`${key} ${label} ${treatment} ${region.name}: ${core.minimum}/${ring.minimum} below ${region.threshold}`);
          }
          if (noShadow) await noShadow.evaluate(style => style.remove());
        }
      }
      await hiddenFill.evaluate(style => style.remove());
      await page.evaluate(() => {document.querySelector('.fam-hero-media').style.removeProperty('visibility');document.querySelector('[data-video-hero]').style.removeProperty('background');document.querySelector('video').style.removeProperty('visibility');});
      for (const time of [1,7,13,22,28]) {
        await page.locator('video').evaluate((video,time) => {video.currentTime=time;},time);
        await page.waitForFunction(() => !document.querySelector('video').seeking);
        await capture(page,`${key}-actual-${time}.png`);
      }
      console.log(`Contrast checked ${key}: ${times.length} video samples, poster and white frame`);
      await page.close();
    }
  } finally {await browser.close();}
  const summary=[];
  for (const [width,height] of viewports) for (const name of Object.keys(selectors)) {
    const viewport=`${width}x${height}`, rows=results.filter(r => r.viewport===viewport && r.name===name);
    const minimum=(kind,treatment) => Math.min(...rows.filter(r => r.sample.kind===kind && r.treatment===treatment).flatMap(r => [r.core.minimum,r.ring.minimum]));
    summary.push({viewport,name,color:rows[0].color,fontSize:rows[0].fontSize,threshold:rows[0].threshold,videoPaintedMinimum:minimum('video','painted-shadow'),videoWithoutShadowMinimum:minimum('video','without-shadow'),posterMinimum:minimum('poster','without-shadow'),whiteFrameMinimum:minimum('white-frame','without-shadow')});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({method:'Computed foreground colors versus actual background pixels beneath glyph interiors and immediate exterior boundaries. Audit-only transitions disabled. Separate passes retain and remove the existing shadows. White-frame bound ignores shadows and covers every possible source pixel; sampled scenes corroborate rendering.',times,viewports,bounds,results,summary,failures},null,2)+'\n');
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({bounds,summary,failures},null,2)+'\n');
  console.log(JSON.stringify({viewports:viewports.length,videoSamples:times.length*viewports.length,minimumBound:Math.min(...bounds.map(b => b.minimum)),minimumMeasuredVideo:Math.min(...summary.map(s => s.videoWithoutShadowMinimum)),failures},null,2));
  assert.equal(failures.length,0,failures.join('\n'));
}
main().catch(error => {fs.writeFileSync(path.join(out,'failure.txt'),String(error.stack||error));console.error(error);process.exitCode=1;});
