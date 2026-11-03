/* Offline public-homepage-only visual and interaction QA. No forms are submitted. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const baseline=process.argv.includes('--baseline');
const phase=baseline?'before':'after';
const output=path.resolve('test-results/home-planning',phase);
fs.mkdirSync(output,{recursive:true});
const viewports=[[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900],[1920,1080],[844,390]];
const failures=[],records=[];
const check=(ok,text)=>{if(!ok)failures.push(text)};
(async()=>{
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/*',r=>{
 const u=new URL(r.request().url());
 const asset=/\.(?:png|webp|jpe?g|svg|ico|woff2?|ttf|css|js|map)$/.test(u.pathname);
 const allowed=u.origin==='http://127.0.0.1:34863'&&r.request().method()==='GET'&&!u.pathname.startsWith('/api/')&&(u.pathname==='/'||u.pathname.startsWith('/_next/')||asset);
 return allowed?r.continue():r.abort();
});
await context.routeWebSocket('**/*',s=>s.close());
for(const [width,height] of viewports){
 const key=`${width}x${height}`;const page=await context.newPage();await page.setViewportSize({width,height});
 try {
  await page.goto('http://127.0.0.1:34863/',{waitUntil:'networkidle',timeout:180000});
  await page.evaluate(()=>document.fonts.ready);
  const section=page.locator('#planning-ranges');await section.waitFor();
  await page.screenshot({path:path.join(output,`first-${key}.png`)});
  await section.scrollIntoViewIfNeeded();
  await section.screenshot({path:path.join(output,`section-${key}.png`)});
  if(baseline){records.push({viewport:key,baseline:true});await page.close();continue;}
  const card=page.getByTestId('planning-step');
  const record={viewport:key,steps:[]};records.push(record);
  for(let step=0;step<5;step++){
   // Actual header dimensions, not a hard-coded viewport subtraction.
   await page.evaluate(()=>{const c=document.querySelector('[data-testid=planning-step]');const h=document.querySelector('[data-family-header]');scrollBy(0,c.getBoundingClientRect().top-(h?.getBoundingClientRect().height||76)-16)});
   await page.waitForTimeout(200);
   const metrics=await card.evaluate(c=>{const b=c.getBoundingClientRect();const h=document.querySelector('[data-family-header]')?.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,headerBottom:h?.bottom||0,viewportHeight:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...c.querySelectorAll('button,a,input')].filter(e=>e.type!=='radio').map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,height:r.height,width:r.width}})}});
   record.steps.push({step,metrics});
   check(!metrics.overflow,`${key} step ${step}: horizontal overflow`);
   // Short landscape is recorded separately; cannot count as a passing input budget.
   check(metrics.top>=metrics.headerBottom-1,`${key} step ${step}: header obstruction`);
   check(metrics.bottom<=height+1,`${key} step ${step}: input-step viewport overflow`);
   check(await card.getByRole('link',{name:/Request a quote/i}).count()>0,`${key} step ${step}: missing quote CTA`);
   await page.screenshot({path:path.join(output,`step-${step}-${key}.png`)});
   if(step<4)await card.getByRole('button',{name:'Next',exact:true}).click();
  }
  await card.getByRole('button',{name:'Edit project',exact:true}).click();
  await card.getByRole('radio',{name:'Bathroom',exact:true}).check();
  await card.getByRole('button',{name:'Save changes',exact:true}).click();
  await card.getByRole('button',{name:'Edit size',exact:true}).click();
  check(await card.getByRole('slider').getAttribute('min')==='40',`${key}: bathroom minimum`);
  await card.getByRole('slider').focus();await page.keyboard.press('End');
  check(await card.getByRole('slider').inputValue()==='200',`${key}: maximum keyboard input`);
  await page.keyboard.press('Enter');
  await card.getByRole('button',{name:'Edit finish',exact:true}).click();
  await card.getByRole('radio',{name:'High-end',exact:true}).check();
  await card.getByRole('button',{name:'Save changes',exact:true}).click();
  await card.getByRole('button',{name:'Edit layout',exact:true}).click();
  await card.getByRole('radio',{name:'Major layout changes',exact:true}).check();
  await card.getByRole('button',{name:'Save changes',exact:true}).click();
  const range=await page.getByTestId('planning-figure').innerText();
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-testid=planning-step]')?.textContent.includes('Step 5 of 5'));
  check(await page.getByTestId('planning-figure').innerText()===range,`${key}: refresh lost selections/result`);
  check((await page.getByTestId('planning-step').innerText()).includes('Major layout changes'),`${key}: refresh lost layout`);
  await page.getByTestId('planning-step').getByRole('link',{name:'Request a quote',exact:true}).click();
  check(new URL(page.url()).hash==='#request',`${key}: quote destination`);
  check(await page.locator('#request').count()===1,`${key}: quote form target exists`);
  await page.goBack({waitUntil:'domcontentloaded'});
  check(await page.getByTestId('planning-figure').innerText()===range,`${key}: browser Back lost result`);
  await page.evaluate(()=>sessionStorage.removeItem('brc-home-planning-v1'));
 }catch(e){failures.push(`${key}: ${e.message}`)}finally{await page.close()}
}
await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({phase,records,failures},null,2));console.log(JSON.stringify({phase,count:records.length,failures}));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
