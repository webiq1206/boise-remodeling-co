import {chromium,webkit} from '@playwright/test';
const base='http://127.0.0.1:5000';const origin=new URL(base).origin;
for(const [name,engine] of Object.entries({webkit,chromium})){
 const browser=await engine.launch();
 for(const width of [390,1440]) for(let attempt=1;attempt<=3;attempt++){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin&&!u.pathname.startsWith('/api/')&&r.request().method()==='GET'?r.continue():r.abort('blockedbyclient');});
  await context.addInitScript(()=>{
   const log=window.__log=[];const t0=performance.now();const T=()=>Math.round(performance.now()-t0);
   const wrap=(obj,key,label)=>{const orig=obj[key];if(!orig)return;obj[key]=function(...a){log.push({t:T(),call:label,args:JSON.stringify(a).slice(0,80),stack:(new Error().stack||'').split('\n').slice(1,5).join(' | ').slice(0,400)});return orig.apply(this,a);};};
   wrap(window,'scrollTo','window.scrollTo');wrap(window,'scroll','window.scroll');wrap(window,'scrollBy','window.scrollBy');wrap(Element.prototype,'scrollIntoView','el.scrollIntoView');wrap(Element.prototype,'scrollTo','el.scrollTo');
   const d=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');if(d&&d.set)Object.defineProperty(Element.prototype,'scrollTop',{get:d.get,set(v){log.push({t:T(),call:'scrollTop=',args:String(v),el:this.tagName,stack:(new Error().stack||'').split('\n').slice(1,4).join(' | ').slice(0,300)});return d.set.call(this,v);},configurable:true});
   let last=-1;addEventListener('scroll',()=>{const y=Math.round(scrollY);if(Math.abs(y-last)>200){log.push({t:T(),scrollEvent:y});last=y;}},{passive:true});
   addEventListener('load',()=>log.push({t:T(),ev:'load',y:Math.round(scrollY)}));
   document.addEventListener('DOMContentLoaded',()=>{log.push({t:T(),ev:'dcl',y:Math.round(scrollY)});const ro=new ResizeObserver(es=>{for(const e of es){const el=e.target;log.push({t:T(),resize:(el.tagName+(el.id?'#'+el.id:'')+'.'+String(el.className).slice(0,40)),h:Math.round(e.contentRect.height)});}});const m=document.querySelector('main')||document.body;for(const c of m.querySelectorAll(':scope > *, :scope > * > section'))ro.observe(c);ro.observe(document.body);});
  });
  const page=await context.newPage();
  try{
   await page.goto(base+'/',{waitUntil:'networkidle'});await page.goto('about:blank');
   await page.goto(base+'/#request',{waitUntil:'networkidle'});
   const samples=[];for(let i=0;i<16;i++){samples.push(await page.evaluate(()=>{const r=document.getElementById('request')?.getBoundingClientRect();return {y:Math.round(scrollY),top:r&&Math.round(r.top),bottom:r&&Math.round(r.bottom),doc:document.documentElement.scrollHeight};}));await page.waitForTimeout(250);}
   const ok=samples.at(-1).bottom>0&&samples.at(-1).top<900;
   const log=await page.evaluate(()=>window.__log);
   console.log(`== ${name} ${width} #${attempt} inView=${ok} url=${page.url()}`);
   console.log(' samples',JSON.stringify(samples.filter((s,i)=>i%3===0||i===15)));
   console.log(' log',JSON.stringify(log.filter(e=>!e.resize).slice(0,30)));
   const rs=log.filter(e=>e.resize);const byEl={};for(const e of rs){(byEl[e.resize] ||= []).push(`${e.t}:${e.h}`);}console.log(' resizes',JSON.stringify(Object.fromEntries(Object.entries(byEl).filter(([k,v])=>v.length>1))).slice(0,1500));
  }catch(e){console.log(`== ${name} ${width} #${attempt} ERROR ${e.message.slice(0,200)}`);}finally{await context.close();}
 }
 await browser.close();
}
