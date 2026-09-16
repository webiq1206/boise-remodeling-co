import {chromium} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const sites={
 construction:{host:'boiseconstruction.co',service:'new-construction',scope:'Build a complete new detached home in Nampa, Idaho. Conditioned living area: 2400 SF. Attached garage: 600 SF, separate from living area. One story, three bedrooms, two bathrooms. Flat accessible lot; slab foundation; utility connections at the lot. Standard mid-range finishes: stock cabinets, quartz counters, LVP flooring, tile bathroom floors, painted drywall, asphalt shingles, fiber cement siding. Include all construction labor and materials, ordinary permits, site preparation, utility connections and cleanup. Exclude appliance purchases, landscaping and demolition. No ADU or covered patio. Use disclosed preliminary allowances for final unselected products.',answers:{service:'new-construction',sqft:'2400',garageIncluded:'yes',garageSqft:'600',rooms:'3',bathrooms:'2',stories:'1',finish:'mid-range',location:'Nampa',coveredOutdoorSqft:'0'}},
 remodeling:{host:'boiseremodeling.co',service:'kitchen',scope:'Kitchen remodel in Nampa, Idaho. Kitchen floor area: 200 SF, 10 by 20 feet. Remove existing cabinets, countertops and 200 SF flooring. Supply and install 20 LF base cabinets, 12 LF upper cabinets and no tall cabinets. Standard mid-range stock painted plywood cabinets. Supply and install 40 SF quartz countertop and 30 SF ceramic backsplash. Install 200 SF LVP flooring. Replace one kitchen sink and faucet in the same locations. Keep existing electrical circuits and lighting, plumbing layout, appliances, HVAC and walls. Include demolition, cabinet installation, countertop fabrication, flooring, backsplash, sink and faucet installation, waste removal and cleanup. Exclude appliance purchases, structural alterations, plumbing relocation, electrical work and painting.',answers:{service:'kitchen',sqft:'200',length:'10',width:'20',finish:'mid-range',cabinetRoom:'kitchen',cabinetBaseLf:'20',cabinetUpperLf:'12',cabinetTallLf:'0',countertopSqft:'40',tileSqft:'30',flooringSqft:'200',demolitionSqft:'200',fixtureCount:'2',location:'Nampa'}},
 cabinet:{host:'boisecabinet.co',service:'cabinet-install',scope:'Supply and install new kitchen cabinets in Nampa, Idaho. 20 linear feet of base cabinets; 12 linear feet of upper wall cabinets; zero tall or pantry cabinets. Standard mid-range painted Shaker stock cabinets with plywood boxes, soft-close hinges and drawer slides, standard pulls. Existing cabinets have already been removed and the space is ready. Include cabinet supply, delivery, installation, fillers, toe kicks, hardware and cabinet cleanup. Exclude countertops, flooring, demolition, plumbing, electrical work, appliances and painting. One ground-floor kitchen with normal access.',answers:{service:'cabinet-install',cabinetRoom:'kitchen',cabinetBaseLf:'20',cabinetUpperLf:'12',cabinetTallLf:'0',finish:'mid-range',location:'Nampa'}},
 handyman:{host:'boisehandyman.co',service:'handyman',scope:'Handyman carpentry job in Nampa, Idaho. Install exactly 200 linear feet of new primed MDF baseboard, 3.25 inches tall, on the ground floor. Existing baseboard has already been removed. Normal accessible walls, no repairs or obstructions. Include baseboard material supply, cuts, installation, caulking, nail-hole filling and cleanup. Exclude painting, flooring, demolition, cabinets, plumbing and electrical work. Price only this trim work.',answers:{service:'handyman',trimLf:'200',location:'Nampa',materials:'Primed MDF baseboard 3.25 inches high'}},
 p5:{host:'p5homeco.com',service:'bathroom',scope:'Complete bathroom remodel in Nampa, Idaho. Bathroom is 8 feet by 10 feet, 80 square feet. Replace one standard 60-inch bathtub, one toilet and one 48-inch vanity in their existing positions with standard mid-range equivalents. Install 80 SF porcelain floor tile and 60 SF ceramic tub-surround tile. Include demolition of existing finishes, disposal, water-resistant backing, waterproofing at the tub, plumbing reconnections, vanity supply and installation, faucet, toilet, bathtub, tile installation, wall painting and cleanup. Keep existing lighting, electrical circuits, HVAC, walls and layout. Exclude electrical changes, plumbing relocation and structural work.',answers:{service:'bathroom',sqft:'80',length:'8',width:'10',tileSqft:'140',flooringSqft:'80',cabinetBaseLf:'4',cabinetUpperLf:'0',cabinetTallLf:'0',fixtureCount:'3',finish:'mid-range',location:'Nampa',bathrooms:'1'}}
};
const key=process.env.P5_QA_SITE||'construction',site=sites[key];if(!site)throw Error('Site not permitted');
const out=`p5-live-finalization/${key}`;await mkdir(out,{recursive:true});
const report={site:key,host:site.host,startedAt:new Date().toISOString(),kind:'Actual deployed website. No estimator, pricing, PDF or email mocks.',pages:[],flows:[]};
const save=()=>writeFile(`${out}/results.json`,JSON.stringify(report,null,2));
const browser=await chromium.launch();const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function shot(page,name,fullPage=false){await page.screenshot({path:`${out}/${name}.png`,fullPage,timeout:20000}).catch(()=>{});}
async function audit(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await ctx.newPage();let routes=[];
 try{
  await page.goto(`https://${site.host}`,{waitUntil:'domcontentloaded',timeout:60000});await sleep(1500);
  routes=await page.locator('a[href]').evaluateAll(els=>[...new Set(els.map(e=>e.href))].filter(u=>u.startsWith(location.origin)&&!u.includes('#')&&!/admin|login|portal|api\/|\.pdf|privacy|terms/i.test(u)));
  const chosen=[`https://${site.host}/`,...routes.filter(u=>/\/(?:about|contact|services|projects|portfolio|resources|blog|re-10)/i.test(u)).slice(0,5)];
  for(const url of [...new Set(chosen)])for(const width of [390,1440]){
   await page.setViewportSize({width,height:width===390?844:1000});const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await sleep(800);
   const info=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const h=document.querySelector('[data-hero],#hero,.hero,main section,main h1');
    const bars=[...document.querySelectorAll('[data-mobile-nav-bar],[data-mobile-cta],.mobile-cta,[class*="mobile-cta"]')].map(e=>({html:e.outerHTML.slice(0,2000),visible:visible(e),rect:e.getBoundingClientRect().toJSON()}));
    return {url:location.href,width:innerWidth,scrollY,title:document.title,version:document.querySelector('[data-p5-estimator]')?.getAttribute('data-version'),h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),heroBottom:h?.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1,bars,headings:[...document.querySelectorAll('main h2')].map(e=>e.textContent),description:document.querySelector('meta[name="description"]')?.content,ogImage:document.querySelector('meta[property="og:image"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href};
   });info.http=response?.status();report.pages.push(info);const name=`page-${report.pages.length}-${width}`;
   await shot(page,name,true);if(width===390){await page.evaluate(()=>scrollTo({top:Math.min(1100,document.documentElement.scrollHeight-innerHeight),behavior:'instant'}));await sleep(250);await shot(page,`${name}-scrolled`);}await save();
  }
 }catch(e){report.pageAuditError=String(e);}finally{await ctx.close();}return routes;
}
async function pdfBytes(scope,name){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);let page=pdf.addPage([612,792]),y=740;for(const para of [`P5 QA TEST - ${name}`,scope,'Controlled test document. No real project or sales follow-up.']){let line='';for(const word of para.split(/\s+/)){if(font.widthOfTextAtSize(`${line} ${word}`,11)>500){page.drawText(line,{x:50,y,size:11,font});y-=17;line='';if(y<60){page=pdf.addPage([612,792]);y=740;}}line+=(line?' ':'')+word;}if(line){page.drawText(line,{x:50,y,size:11,font});y-=28;}}return Buffer.from(await pdf.save());}
async function flow(name,scope,answers,url=`https://${site.host}/estimate/p5-preview`,mode='pdf',submit=true){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,acceptDownloads:true});const page=await ctx.newPage();page.setDefaultTimeout(12000);
 const r={name,url,mode,questions:[],api:[],errors:[],result:null,pdf:null};report.flows.push(r);let latest=null,terminal=null;const pending=[];
 page.on('pageerror',e=>r.errors.push(e.message));
 page.on('response',response=>{if(!response.url().includes('/api/p5-estimator/'))return;const endpoint=new URL(response.url()).pathname.split('/').at(-1);if(endpoint==='pdf')return;pending.push(response.json().then(d=>{r.api.push({endpoint,status:response.status(),pending:d.pending,error:d.error,questions:d.questions,warning:d.warning,processing:d.processing,result:d.result,missingFields:d.missingFields,verificationItems:d.verificationItems,delivery:d.delivery});if(d.draft||d.analysis)latest={answers:d.draft?.answers,extraction:d.analysis?.extraction||d.draft?.extraction,questions:d.questions,conflicts:d.conflicts};if(d.result)terminal=d;}).catch(()=>{}));});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});const root=page.locator('[data-p5-estimator]').first();await root.waitFor({timeout:25000});r.version=await root.getAttribute('data-version');
  const input=root.locator('textarea').first();await input.waitFor();
  if(mode==='pdf'){const file=await pdfBytes(scope,name);await writeFile(`${out}/${name}-input.pdf`,file);await root.locator('input[type=file]').setInputFiles({name:`P5-QA-${name}.pdf`,mimeType:'application/pdf',buffer:file});await input.fill('Estimate the included work in this document. Authorized P5 QA test, not a real project.');}
  else await input.fill(scope);
  r.buttons=await root.getByRole('button').allTextContents();
  const send=root.getByRole('button',{name:/^(Continue|Send project|Send message)$/i}).first();await send.click();
  const deadline=Date.now()+210000;let lastQuestion='',repeated=0;
  while(Date.now()<deadline){
   await sleep(800);if(await root.getAttribute('aria-busy')==='true')continue;
   const stage=await root.getAttribute('data-step');if(stage==='2'||stage==='3')break;
   const question=root.locator('[aria-label="Project question"]');if(!await question.isVisible())continue;
   const q=(await question.locator('[data-stage-heading]').innerText()).trim();if(q===lastQuestion){if(++repeated>2)throw Error(`Repeated question: ${q}`);}else{lastQuestion=q;repeated=0;}
   const label=(await question.locator('p').first().textContent()||'').toLowerCase();
   const f=latest?.questions?.find(x=>x.reason===q)?.field||({'project type':'service','tasks and quantities':'taskList','finish level':'finish','garage included':'garageIncluded'}[label])||(/living space|how large.*area/i.test(q)?'sqft':/garage.*square|square.*garage/i.test(q)?'garageSqft':/include a garage/i.test(q)?'garageIncluded':/finish level|level of finishes/i.test(q)?'finish':/base cabinet/i.test(q)?'cabinetBaseLf':/wall cabinet|upper cabinet/i.test(q)?'cabinetUpperLf':/tall cabinet/i.test(q)?'cabinetTallLf':/what work|tasks|list the work/i.test(q)?'taskList':null);
   r.questions.push({question:q,label,field:f,alreadySupplied:!!answers[f]});await shot(page,`${name}-question-${r.questions.length}`);
   const handoff=question.locator('a[href^="https://boise"]');if(await handoff.count()){r.handoff=await handoff.first().getAttribute('href');break;}
   const value=f==='taskList'?scope:answers[f];
   const uiLabel={service:{'new-construction':'New home',kitchen:'Kitchen remodel',bathroom:'Bathroom remodel','cabinet-install':'Cabinets with installation',handyman:'Home repairs',re10:'Inspection and RE-10 repairs'},finish:{'mid-range':'Standard finishes'},garageIncluded:{yes:'Yes',no:'No'}}[f]?.[value];
   if(uiLabel&&await question.getByRole('button',{name:uiLabel,exact:true}).count())await question.getByRole('button',{name:uiLabel,exact:true}).click();
   else if(value){await root.getByLabel('Your answer',{exact:true}).fill(value);await root.getByRole('button',{name:'Send answer',exact:true}).click();}
   else if(await question.getByRole('button',{name:'Not sure yet',exact:true}).count())await question.getByRole('button',{name:'Not sure yet',exact:true}).click();
   else{r.blocker=`No fact-safe answer to: ${q}`;break;}await sleep(900);await save();
  }
  r.beforeSubmit=await root.getAttribute('data-step');r.extracted=latest;
  if(r.beforeSubmit==='2'&&submit){
   await root.locator('input[autocomplete="name"]').fill(`P5 QA TEST ${key} ${name}`);await root.locator('input[type="email"]').fill('hello@p5homeco.com');
   const checks=root.locator('input[type="checkbox"]');for(let n=0;n<await checks.count();n++)await checks.nth(n).check();
   await shot(page,`${name}-review`);await root.getByRole('button',{name:/^Get (?:my |an )?estimate$/i}).click();r.submitted=true;
   const stop=Date.now()+270000;while(Date.now()<stop){await sleep(2000);if(terminal)break;const alert=root.locator('[role="alert"]');if(await alert.isVisible()&&await root.getAttribute('aria-busy')!=='true'){r.submitError=await alert.innerText();break;}}
   r.result=terminal?.result||null;r.delivery=terminal?.delivery||null;
   if(r.result?.range){const button=root.getByRole('button',{name:/^Download (?:estimate )?PDF$/i}).first();const download=page.waitForEvent('download',{timeout:45000});await button.click();const file=await download;await file.saveAs(`${out}/${name}-estimate.pdf`);r.pdf={name:file.suggestedFilename(),failure:await file.failure(),pages:(await PDFDocument.load(await readFile(`${out}/${name}-estimate.pdf`))).getPageCount()};}
  }
  r.finalStage=await root.getAttribute('data-step');r.finalText=await root.innerText();await shot(page,`${name}-final`);
 }catch(e){r.errors.push(String(e));await shot(page,`${name}-failure`);r.finalText=await page.locator('body').innerText().catch(()=>'');}
 finally{await Promise.allSettled(pending);await ctx.close();await save();console.log(JSON.stringify({site:key,name,version:r.version,stage:r.finalStage,price:r.result?.range,questions:r.questions,errors:r.errors,submitError:r.submitError}));}
}
try{
 const routes=await audit();report.routes=routes;
 await flow('standard-pdf',site.scope,site.answers);
 const re10=routes.find(u=>/re-?10/i.test(u));
 if(re10)await flow('re10-pdf','Inspection repair request in Nampa, Idaho. Repair 1 loose interior door strike plate using existing hardware. Replace 2 missing standard smoke alarms with new battery-powered alarms in existing accessible ground-floor locations. Install 40 LF primed MDF baseboard 3.25 inches high. Include materials, labor, disposal and cleanup. Exclude painting, flooring, plumbing, electrical rewiring, structural work and all other inspection items.',{service:'re10',trimLf:'40',location:'Nampa'},re10);
 if(key==='remodeling')await flow('new-build-handoff',sites.construction.scope,sites.construction.answers,undefined,'text',false);
 if(key==='construction')await flow('remodel-handoff',sites.remodeling.scope,sites.remodeling.answers,undefined,'text',false);
}finally{report.finishedAt=new Date().toISOString();await save();await browser.close();}
