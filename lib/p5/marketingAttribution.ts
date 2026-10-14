import {z} from 'zod';

/** Marketing observations, not authenticated campaign facts or customer scope. */
export const ATTRIBUTION_KEY='p5_marketing_attribution_v1';
export const ATTRIBUTION_ANSWER='_p5_marketing_attribution_v1';
export const ATTRIBUTION_TTL=30*24*60*60*1000;
const token=z.string().min(1).max(200).regex(/^[a-zA-Z0-9 _.,:/+-]+$/);
const click=z.string().min(1).max(256).regex(/^[a-zA-Z0-9_-]+$/);
const page=z.string().max(500).refine(value=>{
 try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&!u.search&&!u.hash&&!value.includes('@');}catch{return false;}
});
const touchSchema=z.object({
 at:z.number().int().nonnegative(),landingPage:page,referrer:page.optional(),
 utm_source:token.optional(),utm_medium:token.optional(),utm_campaign:token.optional(),
 utm_term:token.optional(),utm_content:token.optional(),utm_id:token.optional(),
 gclid:click.optional(),gbraid:click.optional(),wbraid:click.optional(),
 campaign_id:click.optional(),adgroup_id:click.optional(),ad_id:click.optional(),
}).strict();
export const attributionSchema=z.object({
 version:z.literal(1),consent:z.literal('granted'),first:touchSchema,latest:touchSchema,
}).strict().refine(v=>v.first.at<=v.latest.at,'Invalid touch order');
export type MarketingAttribution=z.infer<typeof attributionSchema>;
export type MarketingTouch=z.infer<typeof touchSchema>;
export type MarketingConsent='granted'|'denied'|'unknown';

/** Never persist a query string, fragment, credentials, email, or referrer path. */
export function publicPage(value:string,originOnly=false):string|undefined{
 try{
  const u=new URL(value);
  if(!/^https?:$/.test(u.protocol)||u.username||u.password)return;
  const path=originOnly||/^\/(?:api|admin|account|login)(?:\/|$)/.test(u.pathname)?'/':u.pathname;
  const result=u.origin+path;
  return page.safeParse(result).success?result:undefined;
 }catch{return;}
}
export function observedTouch(href:string,referrer:string,at=Date.now()):MarketingTouch|undefined{
 const landingPage=publicPage(href);if(!landingPage)return;
 const u=new URL(href),touch:MarketingTouch={at,landingPage};
 const ref=publicPage(referrer,true);
 if(ref&&new URL(ref).hostname.replace(/^www\./,'')!==u.hostname.replace(/^www\./,''))touch.referrer=ref;
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id'] as const){
  const v=u.searchParams.get(key);if(v&&token.safeParse(v).success)touch[key]=v;
 }
 for(const key of ['gclid','gbraid','wbraid','campaign_id','adgroup_id','ad_id'] as const){
  const v=u.searchParams.get(key);if(v&&click.safeParse(v).success)touch[key]=v;
 }
 return touch;
}
export function classifyTouch(t:MarketingTouch){
 // A Google click ID proves Google Ads traffic, not Search vs Display.
 if(t.gclid||t.gbraid||t.wbraid)return {channel:'paid',source:'google',evidence:'click_id'};
 if(t.utm_source||t.utm_medium)return {
  channel:/^(cpc|ppc|paid|paidsearch|paid_social|display|cpm)$/i.test(t.utm_medium||'')?'paid':
   /^organic$/i.test(t.utm_medium||'')?'organic':/^email$/i.test(t.utm_medium||'')?'email':'campaign',
  source:t.utm_source||'unknown',evidence:'utm',
 };
 if(t.referrer){
  const host=new URL(t.referrer).hostname.replace(/^www\./,'');
  return {channel:/^(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com)$/.test(host)?'organic':'referral',source:host,evidence:'referrer'};
 }
 return {channel:'direct',source:'direct',evidence:'no_observed_source'};
}
export function validateAttribution(value:unknown,now=Date.now()):MarketingAttribution|undefined{
 if(value==null)return;
 const parsed=attributionSchema.parse(value);
 if(parsed.first.at<now-ATTRIBUTION_TTL||parsed.latest.at>now+60000)throw new Error('Expired or invalid attribution');
 // Receiving brand is never accepted from the browser; restrict its landing origin.
 for(const t of [parsed.first,parsed.latest]){
  if(!['boiseremodeling.co','www.boiseremodeling.co'].includes(new URL(t.landingPage).hostname))throw new Error('Invalid attribution origin');
 }
 return parsed;
}
export function submissionAttribution(value:unknown,headers:Headers):MarketingAttribution|undefined{
 const parsed=validateAttribution(value);
 return headers.get('sec-gpc')==='1'||headers.get('dnt')==='1'?undefined:parsed;
}
export function advanceAttribution(previous:MarketingAttribution|undefined,touch:MarketingTouch,newEntry=false):MarketingAttribution{
 const active=previous&&touch.at-previous.first.at<ATTRIBUTION_TTL?previous:undefined;
 // Same-site browsing does not invent a fresh direct visit or overwrite an ad touch.
 const acquisition=Boolean(touch.referrer||touch.utm_source||touch.utm_medium||touch.utm_campaign||touch.gclid||touch.gbraid||touch.wbraid);
 return {version:1,consent:'granted',first:active?.first||touch,latest:!active||acquisition||newEntry?touch:active.latest};
}
export function attributionCrmMetadata(value:MarketingAttribution,receivingBrand:string){
 return {version:1,receivingBrand,observation:'browser_reported',first:{...value.first,...classifyTouch(value.first)},latest:{...value.latest,...classifyTouch(value.latest)}};
}

let memory:MarketingAttribution|undefined;
let consentOverride:MarketingConsent|undefined;
let lastObserved='';
export function marketingConsent():MarketingConsent{
 if(typeof window==='undefined')return 'unknown';
 if((navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl||navigator.doNotTrack==='1')return 'denied';
 const state:Record<string,unknown>={};
 for(const item of (window as unknown as {dataLayer?:ArrayLike<unknown>[]}).dataLayer||[]){
  if(!item||typeof item!=='object')continue;
  const entry=Array.from(item);
  if(entry[0]==='consent'&&(entry[1]==='default'||entry[1]==='update')&&entry[2]&&typeof entry[2]==='object')Object.assign(state,entry[2]);
 }
 if(['ad_storage','analytics_storage','ad_user_data'].some(k=>state[k]==='denied'))return 'denied';
 if(consentOverride)return consentOverride;
 return ['ad_storage','analytics_storage','ad_user_data'].every(k=>state[k]==='granted')?'granted':'unknown';
}
export function setMarketingConsent(consent:MarketingConsent){
 consentOverride=consent;lastObserved='';captureMarketingAttribution();
}
export function captureMarketingAttribution():MarketingAttribution|undefined{
 if(typeof window==='undefined')return;
 if(marketingConsent()!=='granted'){
  memory=undefined;lastObserved='';
  try{window.localStorage.removeItem(ATTRIBUTION_KEY);}catch{}
  return;
 }
 if(memory&&Date.now()-memory.first.at>=ATTRIBUTION_TTL)memory=undefined;
 if(!memory)try{memory=validateAttribution(JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY)||'null'));}catch{
  try{window.localStorage.removeItem(ATTRIBUTION_KEY);}catch{}
 }
 const href=window.location.href;
 if(lastObserved===href&&memory)return memory;
 const touch=observedTouch(href,lastObserved?'':document.referrer);if(!touch)return;
 if(!['boiseremodeling.co','www.boiseremodeling.co'].includes(new URL(href).hostname))return;
 const externalEntry=!lastObserved&&(!document.referrer||new URL(document.referrer).origin!==window.location.origin);
 memory=advanceAttribution(memory,touch,externalEntry);lastObserved=href;
 try{window.localStorage.setItem(ATTRIBUTION_KEY,JSON.stringify(memory));}catch{}
 return memory;
}
