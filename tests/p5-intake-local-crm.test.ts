/**
 * This site's CRM path for the document estimator (owner decisions, 13, 17 and 18 November 2026):
 * a visitor's project request and the estimate the team later publishes for it are both posted to
 * P5 Home Co's lead intake. Brand-owned: it holds this site's own wiring (lib/p5/intakeDeliveryRuntime.ts,
 * lib/p5/deliveryAdapter.ts, lib/p5/intakeCrmValidation.ts). The shared builders have their own
 * test, tests/p5-lead-intake.test.ts.
 *
 * FAKE FETCH ONLY. No database, no email and no live site: every post below is answered in process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateIntakeLocalCrm} from '../lib/p5/intakeCrmValidation.ts';
import {runtimeIntakeTransports} from '../lib/p5/intakeDeliveryRuntime.ts';
import {syncCrm} from '../lib/p5/deliveryAdapter.ts';
import {canonicalReviewTransport} from '../lib/p5/canonicalReviewTransport.ts';
import {INTAKE_RUNTIME_PROOF} from '../lib/p5/intakeDeliveryPolicy.ts';
import {P5_INTAKE_URL,P5_LEAD_RETRY_WINDOW_MS,p5LeadIntakeTransport,projectRequestIntakeBody} from '../lib/p5/p5LeadIntake.ts';
import {intakeDeliveryEnvelope,intakeLeadKey} from '../lib/p5/intakeDeliveryPayload.ts';
import {emptyIntakeDetails,type IntakeSnapshot} from '../lib/p5/intakeContract.ts';
import {INTAKE_SITES,intakeSite,routeIntake} from '../lib/p5/intakePolicy.ts';
import {ESTIMATOR_BRAND} from '../lib/p5/brand.ts';
import {COST_CATEGORIES,calculateP5Estimate,customerEstimate,type FinancePolicy,type PricingInput} from '../lib/p5/pricing.ts';

const BRAND='Boise Remodeling Co',DOMAIN='boiseremodeling.co';
const site=intakeSite(ESTIMATOR_BRAND.id);
assert.equal(site,'remodeling','This brand is the remodeling intake site');
const id='12345678-1234-4234-8234-123456789abc',digest='a'.repeat(64);
const read=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const round2=(value:number)=>Math.round(value*100)/100;
const INTERNAL_WORD=/cost|margin|mark-?up|profit|overhead|contingenc/i;

function request(service='kitchen',extra:Record<string,unknown>={}):IntakeSnapshot{
 return {schema:1,projectId:`remodeling:${id}`,reference:'BRC-4F7K2Q',draftId:id,originSite:'remodeling',currentSite:'remodeling',revision:1,contextVersion:0,savedAt:'2099-01-02T12:00:00.000Z',
  contact:{name:'Fictional Person',email:'customer@example.invalid',phone:'2085550100',preferredContact:'email'},
  details:{...emptyIntakeDetails(),desiredOutcome:'Fictional outcome',budget:'Around 60,000',workContext:'Fictional existing home'},
  scope:{text:'Fictional whole scope',answers:{service,address:'123 N Fictional St',location:'Boise'},extraction:null,uploads:[]},
  routing:routeIntake('remodeling',service),unresolved:[],...extra} as unknown as IntakeSnapshot;
}
const envelope=(s:IntakeSnapshot,channel:'crm'|'team'='crm')=>intakeDeliveryEnvelope(s,channel,digest);

type Call={url:string;init:RequestInit};
const accepted=()=>new Response(JSON.stringify({ok:true,accepted:true,duplicate:false,alert:'none'}),{status:201,headers:{'Content-Type':'application/json'}});
function fakeFetch(answer:(call:Call)=>Response|Promise<Response>=accepted){
 const calls:Call[]=[];
 const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{const call={url:String(input),init:init||{}};calls.push(call);return answer(call);}) as typeof fetch;
 return {calls,fetcher};
}
/** Replace the global fetch and named settings for one check, then put every one of them back. */
async function withRuntime<T>(env:Record<string,string|undefined>,fetcher:typeof fetch,run:()=>Promise<T>):Promise<T>{
 const previousFetch=globalThis.fetch,previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 globalThis.fetch=fetcher;
 for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 try{assert.equal(globalThis.fetch,fetcher,'the fake fetch is in place before anything is sent');return await run();}
 finally{globalThis.fetch=previousFetch;for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
}
const sentBody=(call:Call)=>JSON.parse(String(call.init.body)) as Record<string,any>;

// ---------------------------------------------------------------------------
// The visitor's project request
// ---------------------------------------------------------------------------

test('the CRM channel of this site is the P5 lead intake, and it is crm-disabled without the site setting',async()=>{
 const {calls,fetcher}=fakeFetch();
 const recent=request(),old=request('kitchen',{savedAt:'2026-10-20T12:00:00.000Z'});
 for(const setting of [undefined,'','off','ON','true'])await withRuntime({P5_CRM_DELIVERY:setting,P5_REQUEST_LEADS_SINCE:undefined},fetcher,async()=>{
  const {crm}=await runtimeIntakeTransports();
  assert.equal(await crm.readiness(recent),'crm-disabled',`P5_CRM_DELIVERY=${String(setting)}`);
  await assert.rejects(crm.send(envelope(recent)),/crm-disabled/);
 });
 await withRuntime({P5_CRM_DELIVERY:'on',P5_REQUEST_LEADS_SINCE:undefined},fetcher,async()=>{
  const {crm,team,customer}=await runtimeIntakeTransports();
  assert.equal(await crm.readiness(recent),null);
  // Requests saved before the lead system began taking them stay out, so they do not arrive all at once.
  assert.equal(await crm.readiness(old),'crm-disabled');
  // It is the shared P5 lead transport, aimed at the production intake, and it may retry a lost post.
  assert.equal(crm.identityScope,p5LeadIntakeTransport({enabled:true}).identityScope);
  assert.equal(crm.retryWindowMs,P5_LEAD_RETRY_WINDOW_MS);
  assert.equal(crm.validate!(envelope(recent)),null);
  // The mail channels are as they were: the site's own transport, never replayed automatically.
  assert.equal(team,customer);assert.equal(team.retryWindowMs,0);assert.notEqual(team.identityScope,crm.identityScope);
 });
 await withRuntime({P5_CRM_DELIVERY:'on',P5_REQUEST_LEADS_SINCE:'2026-10-01T00:00:00Z'},fetcher,async()=>{
  assert.equal(await (await runtimeIntakeTransports()).crm.readiness(old),null,'an older moment brings older requests in on purpose');
 });
 assert.equal(calls.length,0,'readiness, validation and a disabled channel never post');
 // The wiring, read from the source: the canonical receiver is not used here and no credential is involved.
 const runtime=read('lib/p5/intakeDeliveryRuntime.ts');
 assert.match(runtime,/const crm=p5LeadIntakeTransport\(\{enabled:process\.env\.P5_CRM_DELIVERY==='on',since:process\.env\.P5_REQUEST_LEADS_SINCE\}\);/);
 assert.doesNotMatch(runtime,/canonicalReviewTransport|P5_CANONICAL_REVIEW_TOKEN|LEAD_DASHBOARD|projectReviewTransport/);
 // The canonical receiver stays gated and untouched: it still refuses before any network access.
 assert.equal(INTAKE_RUNTIME_PROOF.crm,null);
 assert.equal(await canonicalReviewTransport({enabled:true,token:'offline-only',proof:INTAKE_RUNTIME_PROOF.crm},fetcher).readiness(recent),'crm-contract-pending');
 assert.equal(calls.length,0);
});

test('a project request is posted once: form p5-project-request, team_alert site, this site and its routing, and no price',async()=>{
 const {calls,fetcher}=fakeFetch();
 const mine=envelope(request('kitchen'));
 await withRuntime({P5_CRM_DELIVERY:'on',P5_REQUEST_LEADS_SINCE:undefined,LEAD_DASHBOARD_KEY:'dashboard-secret',LEAD_DASHBOARD_API_URL:'https://crm.example.invalid/api/external/leads'},fetcher,async()=>{
  const {crm}=await runtimeIntakeTransports();
  assert.equal(await crm.send(mine),`p5-intake:${mine.leadKey}`);
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://p5homeco.com/api/leads/intake');assert.equal(calls[0].url,P5_INTAKE_URL);
 assert.equal(calls[0].init.method,'POST');assert.equal(calls[0].init.redirect,'error');
 assert.deepEqual(calls[0].init.headers,{'Content-Type':'application/json'},'no credential is sent');
 assert.doesNotMatch(String(calls[0].init.body),/dashboard-secret|crm\.example\.invalid/);
 const body=sentBody(calls[0]),{message,...rest}=body;
 assert.deepEqual(rest,{
  brand:BRAND,name:'Fictional Person',email:'customer@example.invalid',phone:'2085550100',
  projectType:'kitchen',address:'123 N Fictional St',city:'Boise',
  form:'p5-project-request',request_kind:'quote',contact_preference:'email',
  sourceDetail:`p5-project-request:${id}`,external_id:intakeLeadKey(`remodeling:${id}`),team_alert:'site',
 });
 assert.equal(body.external_id,mine.leadKey,'the request is named by its lead key, the same for every revision');
 assert.deepEqual(body,JSON.parse(JSON.stringify(projectRequestIntakeBody(mine))),'exactly the shared body');
 // This site: where it was sent from, the team it was routed to, and the staff link back to the whole request.
 assert.match(message,new RegExp(`^Project request BRC-4F7K2Q, revision 1, sent from ${DOMAIN.replace('.','\\.')}\\. No price has been given\\.$`,'m'));
 assert.match(message,/^Team: Boise Remodeling Co$/m);
 assert.match(message,new RegExp(`^Full request and files \\(staff sign-in\\): https://${DOMAIN.replace('.','\\.')}/api/admin/p5-intake\\?draftId=${id}&revision=1$`,'m'));
 // No price: no estimate, no figure fields, no team notes. The visitor's own budget words are text, not a figure.
 for(const forbidden of ['estimate','low','high','base','amount','lines','total','price','verified','team_notes','team_internal_notes'])assert.equal(forbidden in body,false,forbidden);
 for(const value of Object.values(body))assert.equal(typeof value,'string');
 assert.doesNotMatch(JSON.stringify(body),INTERNAL_WORD);
 // Routing: the lead is filed under the primary team. Remodeling work stays here; an addition goes to Construction.
 for(const [service,team] of [['kitchen',BRAND],['bathroom',BRAND],['whole-home',BRAND],['remodel',BRAND],['addition','Boise Construction Co'],['adu','Boise Construction Co'],['handyman','Boise Handyman Co'],['cabinet-install','Boise Cabinet Co']] as const){
  const routed=projectRequestIntakeBody(envelope(request(service)));
  assert.equal(routed.brand,team,service);
  assert.match(String(routed.message),new RegExp(`^Team: ${team}$`,'m'),service);
  assert.match(String(routed.message),/sent from boiseremodeling\.co\./,service);
  assert.equal(routed.form,'p5-project-request');assert.equal(routed.team_alert,'site');assert.equal('estimate' in routed,false);
 }
});

test('what is held before any post: a synthetic request, nobody to reach, and an envelope that is not this request',async()=>{
 const s=request();
 assert.equal(validateIntakeLocalCrm(envelope(s)),null);
 assert.equal(validateIntakeLocalCrm(envelope({...s,contact:{name:'Fictional Phone Person',email:'',phone:'2085550100',preferredContact:'phone'}})),null);
 assert.equal(validateIntakeLocalCrm(envelope(s,'team')),'payload-review');
 assert.equal(validateIntakeLocalCrm({...envelope(s),leadKey:'p5-intake-'+'0'.repeat(64)}),'payload-review');
 assert.equal(validateIntakeLocalCrm({...envelope(s),request:undefined}),'payload-review');
 assert.equal(validateIntakeLocalCrm(envelope({...s,contact:{...s.contact,email:'',phone:''}})),'contact-review');
 // A synthetic QA request is never a live lead, whatever mailbox it names and whatever the allowlist says.
 const qa={...s,contact:{...s.contact,name:'[QA] Fictional Person',email:'fictional@unapproved.invalid'}};
 const previous=process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;
 try{
  delete process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;assert.equal(validateIntakeLocalCrm(envelope(qa)),'synthetic-suppressed');
  process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST='fictional@unapproved.invalid';assert.equal(validateIntakeLocalCrm(envelope(qa)),'synthetic-suppressed');
 }finally{if(previous===undefined)delete process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;else process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST=previous;}
 // The runtime's channel runs the same check, and refuses to post what it holds or what P5 refused.
 const {calls,fetcher}=fakeFetch();
 await withRuntime({P5_CRM_DELIVERY:'on',P5_REQUEST_LEADS_SINCE:undefined},fetcher,async()=>{
  const {crm}=await runtimeIntakeTransports();
  for(const held of [envelope(qa),envelope(s,'team'),envelope({...s,contact:{...s.contact,email:'',phone:''}})]){
   assert.equal(crm.validate!(held),validateIntakeLocalCrm(held));
   await assert.rejects(crm.send(held));
  }
 });
 assert.equal(calls.length,0,'nothing held is ever posted');
 const refused=fakeFetch(()=>new Response('SECRET-RESPONSE-BODY',{status:503}));
 await withRuntime({P5_CRM_DELIVERY:'on',P5_REQUEST_LEADS_SINCE:undefined},refused.fetcher,async()=>{
  await assert.rejects((await runtimeIntakeTransports()).crm.send(envelope(s)),/^Error: P5 intake refused the project request \(HTTP 503\)$/);
 });
 assert.equal(refused.calls.length,1);
});

// ---------------------------------------------------------------------------
// The published estimate
// ---------------------------------------------------------------------------

const finance:FinancePolicy={annualOverhead:420000,annualRevenue:6000000,forecastSource:'TEST FIXTURE ONLY: conservative forecast',reviewedAt:'2026-09-10',approvedBy:['Nick']};
const KITCHEN=[
 {description:'Demolish existing kitchen and haul away',quantity:1,unit:'LS',unitCost:1873.37,trade:'Demolition'},
 {description:'Install shaker cabinets, painted',quantity:24,unit:'LF',unitCost:412.19,trade:'Cabinets'},
 {description:'Quartz countertops, eased edge',quantity:52.5,unit:'SF',unitCost:88.83,trade:'Countertops'},
 {description:'Luxury vinyl plank flooring',quantity:187,unit:'SF',unitCost:7.13,trade:'Flooring'},
];
/** A priced record as the estimator publishes one: the real pricing engine, then the real customer view. */
function publishedRecord(extra:Record<string,unknown>={}){
 const input:PricingInput={service:'kitchen',revision:'fixture-revision-1',scopeSummary:'Fixture project scope',uncertainty:'low',locationProvided:true,
  lines:KITCHEN.map((line,index)=>({id:`line-${index+1}`,category:'subcontractors',description:line.description,unit:line.unit,quantity:line.quantity,unitCost:line.unitCost,trade:line.trade as never,
   quantitySource:'TEST signed scope',evidence:{basis:'written-quote',reference:'TEST quote',verifiedAt:'2026-09-01',validUntil:'2026-10-01'}})),
  coverage:COST_CATEGORIES.map(category=>({category,status:category==='subcontractors'?'included':'not-applicable',reason:'TEST ONLY: reviewed fixture coverage'})),
  risks:[],assumptions:[],exclusions:[],missingInformation:[],allowances:[]};
 const internal=calculateP5Estimate(input,finance,[],new Date('2026-09-10T12:00:00Z'));
 const customer=customerEstimate(internal,'Fixture scope summary for the customer');
 return {draftId:id,revision:2,brand:ESTIMATOR_BRAND.name,estimator:'p5-policy',
  contact:{name:'Fictional Person',email:'customer@example.invalid',phone:'(208) 555-0100'},
  scope:{text:'Fixture scope',answers:{service:'kitchen',address:'123 N Fictional St',location:'Boise'}},internal,customer,...extra};
}
/** Every number an internal estimate holds that the customer, and so QuickBooks, must never be sent. */
function internalFigures(internal:unknown):number[]{
 const values:number[]=[];
 const walk=(value:unknown,key:string)=>{
  if(typeof value==='number'){if(INTERNAL_WORD.test(key)||/riskAdjusted|divisor|allocation/i.test(key))values.push(round2(value));return;}
  if(Array.isArray(value)){for(const item of value)walk(item,key);return;}
  if(value&&typeof value==='object')for(const [name,item] of Object.entries(value))walk(item,INTERNAL_WORD.test(key)||/allocation/i.test(key)?key:name);
 };
 walk(internal,'');
 return values.filter(value=>value>1);
}
const numbersIn=(value:unknown):number[]=>typeof value==='number'?[round2(value)]:Array.isArray(value)?value.flatMap(numbersIn):value&&typeof value==='object'?Object.values(value).flatMap(numbersIn):[];

test('a published estimate is posted to the P5 lead intake: form p5-estimator, team_alert site, and customer amounts only',async()=>{
 assert.equal(ESTIMATOR_BRAND.name,BRAND);assert.equal(INTAKE_SITES.remodeling.name,BRAND,'the name the P5 intake expects');
 const record=publishedRecord();
 const {calls,fetcher}=fakeFetch();
 // As the outbox calls it: two arguments, the global fetch. The old lead dashboard is configured and never called.
 const provider=await withRuntime({LEAD_DASHBOARD_KEY:'dashboard-secret',LEAD_DASHBOARD_API_URL:'https://crm.example.invalid/api/external/leads'},fetcher,()=>syncCrm(record,'p5-outbox-key'));
 assert.equal(provider,`p5-intake:p5-estimator:${id}`);
 assert.equal(calls.length,1,'one post');
 assert.equal(calls[0].url,P5_INTAKE_URL);
 assert.equal(calls[0].init.method,'POST');assert.equal(calls[0].init.redirect,'error');
 assert.ok(calls[0].init.signal instanceof AbortSignal,'the post is timed');
 assert.deepEqual(calls[0].init.headers,{'Content-Type':'application/json'},'no credential and no dashboard key');
 assert.doesNotMatch(String(calls[0].init.body),/dashboard-secret|crm\.example\.invalid/);
 const body=sentBody(calls[0]),{estimate,...lead}=body;
 assert.deepEqual(lead,{
  brand:BRAND,name:'Fictional Person',email:'customer@example.invalid',phone:'(208) 555-0100',
  projectType:'kitchen',address:'123 N Fictional St',city:'Boise',message:'Fixture scope summary for the customer',
  form:'p5-estimator',sourceDetail:`p5-estimator:${id}`,external_id:`p5-estimator:${id}`,
  // One lead per project: the estimate names the request it answers, here a project that began on this site.
  request_external_id:intakeLeadKey(`remodeling:${id}`),
  team_alert:'site',
 });
 // The figures: kind document, the range the customer was shown, the contract price, and lines that add up to it.
 assert.deepEqual(Object.keys(estimate).sort(),['base','high','kind','label','lines','low','verified']);
 assert.equal(estimate.kind,'document');assert.equal(estimate.verified,true);assert.equal(estimate.label,'Document estimate, kitchen');
 assert.deepEqual([estimate.low,estimate.high],[record.customer.range!.low,record.customer.range!.high]);
 assert.equal(estimate.base,round2(record.internal.contractPrice));
 assert.equal(estimate.lines.length,KITCHEN.length);
 assert.equal(round2(estimate.lines.reduce((sum:number,line:{amount:number})=>sum+line.amount,0)),estimate.base,'to the cent');
 estimate.lines.forEach((line:Record<string,unknown>,index:number)=>{
  for(const key of Object.keys(line))assert.ok(['title','description','quantity','unit','amount','division'].includes(key),key);
  assert.equal(line.title,KITCHEN[index].description);assert.equal(line.division,KITCHEN[index].trade);
  assert.ok(Math.abs(Number(line.amount)-record.internal.lines[index].sellingAmount)<=0.01*KITCHEN.length,'the customer selling amount of that line');
 });
 // Customer amounts only. By word: no field and no text names an internal figure, anywhere in the post.
 assert.doesNotMatch(JSON.stringify(body),INTERNAL_WORD);
 for(const forbidden of ['team_notes','team_internal_notes','internal','source','externalLeadId','deliveryMode'])assert.equal(forbidden in body,false,forbidden);
 // By value: none of the internal estimate's own figures is among the numbers sent.
 const secret=new Set(internalFigures(record.internal));
 assert.ok(secret.size>10,'the fixture really holds internal figures');
 for(const value of numbersIn(body).filter(value=>value>1&&!KITCHEN.some(line=>line.quantity===value)))assert.ok(!secret.has(value),`${value} is an internal figure`);
 // A project handed over from another site keeps its own key, and a revision is the same lead.
 const handed=fakeFetch();
 await syncCrm(publishedRecord({projectId:`construction:${id}`,revision:9}),'another-key',{fetch:handed.fetcher});
 assert.equal(sentBody(handed.calls[0]).request_external_id,intakeLeadKey(`construction:${id}`));
 assert.equal(sentBody(handed.calls[0]).external_id,body.external_id);
 assert.equal(sentBody(handed.calls[0]).brand,BRAND);
});

test('syncCrm throws on a refused post, with a short error and one attempt, and never posts a synthetic record',async()=>{
 const record=publishedRecord();
 const secret='SECRET-RESPONSE-BODY customer@example.invalid';
 const json=(value:unknown,status:number)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 const cases:[string,()=>Response,RegExp][]=[
  ['server error',()=>new Response(secret,{status:500}),/^P5 intake refused the estimate \(HTTP 500\)$/],
  ['rejected',()=>json({ok:false,errors:[secret]},422),/^P5 intake refused the estimate \(HTTP 422\)$/],
  ['several requests this hour',()=>json({ok:false,error:secret},429),/^P5 intake refused the estimate \(HTTP 429\)$/],
  ['not accepted',()=>json({ok:false,error:secret},200),/^P5 intake did not accept the estimate$/],
  ['not json',()=>new Response(`<html>${secret}</html>`,{status:200}),/^P5 intake answer was not valid JSON$/],
  ['unreachable',()=>{throw new Error(`connect ECONNREFUSED ${secret}`);},/^P5 intake could not be reached; the estimate was not confirmed$/],
 ];
 for(const [name,answer,expected] of cases){
  const {calls,fetcher}=fakeFetch(answer);
  const error=await syncCrm(record,'p5-outbox-key',{fetch:fetcher}).then(()=>null,(e:Error)=>e);
  assert.ok(error instanceof Error,name);
  assert.match(error.message,expected,name);
  assert.ok(error.message.length<120&&!error.message.includes('SECRET')&&!error.message.includes('@'),name);
  assert.equal(calls.length,1,`${name}: one post, never a second`);
 }
 const {calls,fetcher}=fakeFetch();
 await assert.rejects(syncCrm({...record,contact:{name:'[QA] Acceptance',email:'qa@example.invalid'}},'k',{fetch:fetcher}),/synthetic QA estimate is never forwarded/);
 await assert.rejects(syncCrm({...record,contact:{name:'Fictional Person',email:'',phone:''}},'k',{fetch:fetcher}),/email address or a phone number/);
 for(const url of ['http://p5homeco.com/api/leads/intake','https://user:secret@p5homeco.com/api/leads/intake','not a url'])await assert.rejects(syncCrm(record,'k',{fetch:fetcher,url}),/credential-free HTTPS endpoint/);
 assert.equal(calls.length,0,'nothing was posted');
});

test('wiring and house style: the adapter loads the forwarder on demand and names no lead dashboard',()=>{
 const adapter=read('lib/p5/deliveryAdapter.ts');
 // tests/p5-intake-reply-to.test.ts runs the adapter with a fixed dependency list, so this is never a static import.
 assert.doesNotMatch(adapter,/^import [^\n]*p5LeadIntake/m);
 assert.match(adapter,/const \{forwardEstimateToP5\}=await import\('\.\/p5LeadIntake\.ts'\);/);
 assert.match(adapter,/forwardEstimateToP5\(record,key,\{brand:brand\.name,fetch:options\.fetch,url:options\.url\}\)/);
 assert.doesNotMatch(adapter,/LEAD_DASHBOARD|crmUrl|deliverKeyedCrm|buildCrmPayload|keyedCrm|crmPayload/);
 for(const file of ['lib/p5/deliveryAdapter.ts','lib/p5/intakeDeliveryRuntime.ts','lib/p5/intakeCrmValidation.ts','tests/p5-intake-local-crm.test.ts'])
  assert.ok(!read(file).includes(String.fromCharCode(8212)),`${file} has an em dash`);
});
