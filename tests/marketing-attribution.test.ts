import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ATTRIBUTION_KEY,ATTRIBUTION_TTL,ATTRIBUTION_ANSWER,observedTouch,advanceAttribution,classifyTouch,
 validateAttribution,submissionAttribution,attributionCrmMetadata,captureMarketingAttribution,setMarketingConsent,
} from '../lib/p5/marketingAttribution.ts';
import {intakeProjectReview} from '../lib/p5/intakeProjectReview.ts';
import {intakeDeliveryEnvelope} from '../lib/p5/intakeDeliveryPayload.ts';
import {emptyIntakeDetails,type IntakeSnapshot} from '../lib/p5/intakeContract.ts';
import {routeIntake} from '../lib/p5/intakePolicy.ts';
import {trackGoogleAdsLeadConversion} from '../lib/googleAdsConversion.ts';

const now=Date.now(),url='https://boiseremodeling.co';
const ad=observedTouch(url+'/?gclid=observed-click&utm_campaign=kitchens&campaign_id=123&ad_id=456','https://google.com/search?q=private',now)!;
const attribution=advanceAttribution(undefined,ad);

test('ad, organic, direct, referral and tagged email remain truthful source/channel pairs',()=>{
 assert.deepEqual(classifyTouch(ad),{channel:'paid',source:'google',evidence:'click_id'});
 assert.equal(classifyTouch(observedTouch(url,'https://www.google.com/search?q=kitchen',now)!).channel,'organic');
 assert.equal(classifyTouch(observedTouch(url,'',now)!).channel,'direct');
 assert.equal(classifyTouch(observedTouch(url,'https://partner.example/path',now)!).channel,'referral');
 assert.deepEqual(classifyTouch(observedTouch(url+'/?utm_medium=email&utm_source=newsletter','',now)!),{channel:'email',source:'newsletter',evidence:'utm'});
 for(const key of ['gbraid','wbraid'])assert.equal(classifyTouch(observedTouch(url+'/?'+key+'=abc','',now)!).source,'google');
 assert.equal(ad.campaign_id,'123');assert.equal(ad.ad_id,'456');
 assert.equal(observedTouch(url+'/?gclid=abc','',now)!.campaign_id,undefined);
});
test('first/latest are separate; navigation is not a new touch; later direct entries remain direct',()=>{
 const nav=advanceAttribution(attribution,observedTouch(url+'/estimate/scope',url+'/',now+1)!);
 assert.deepEqual(nav,attribution);
 const organic=advanceAttribution(nav,observedTouch(url+'/contact','https://bing.com/search',now+2)!);
 assert.deepEqual(organic.first,ad);assert.equal(classifyTouch(organic.latest).channel,'organic');
 const direct=advanceAttribution(organic,observedTouch(url,'',now+3)!,true);
 assert.equal(classifyTouch(direct.latest).channel,'direct');assert.deepEqual(direct.first,ad);
 const expired=advanceAttribution(attribution,observedTouch(url,'',now+ATTRIBUTION_TTL+1)!);
 assert.equal(expired.first.at,now+ATTRIBUTION_TTL+1);
});
test('allowlist strips URL secrets, PII query values, fragments and referrer paths; server rejects malformed metadata',()=>{
 const t=observedTouch(url+'/estimate/scope?email=private@example.com&t=secret&utm_source=private@example.com&gclid=abc#secret','https://google.com/search?q=private',now)!;
 assert.equal(t.landingPage,url+'/estimate/scope');assert.equal(t.referrer,'https://google.com/');
 assert.equal(t.utm_source,undefined);assert.ok(!JSON.stringify(t).includes('secret'));
 assert.deepEqual(validateAttribution(attribution,now),attribution);
 assert.throws(()=>validateAttribution({...attribution,brand:'fake'},now));
 assert.throws(()=>validateAttribution({...attribution,consent:'denied'},now));
 assert.throws(()=>validateAttribution({...attribution,first:{...ad,landingPage:'https://attacker.example/'}},now));
 assert.throws(()=>validateAttribution(attribution,now+ATTRIBUTION_TTL+1));
 assert.throws(()=>validateAttribution({...attribution,latest:{...ad,at:now+120000}},now));
 assert.equal(submissionAttribution(attribution,new Headers({'sec-gpc':'1'})),undefined);
 assert.equal(submissionAttribution(attribution,new Headers({'dnt':'1'})),undefined);
});
test('consent unknown/denied/GPC never persist or attach identifiers; grant captures and withdrawal clears',()=>{
 const store=new Map<string,string>();let blocked=false;
 const storage={getItem:(k:string)=>{if(blocked)throw Error();return store.get(k)||null;},setItem:(k:string,v:string)=>{if(blocked)throw Error();store.set(k,v);},removeItem:(k:string)=>{store.delete(k);}};
 const prior={window:Object.getOwnPropertyDescriptor(globalThis,'window'),document:Object.getOwnPropertyDescriptor(globalThis,'document'),navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 const nav={globalPrivacyControl:false,doNotTrack:'0'};
 Object.defineProperty(globalThis,'navigator',{value:nav,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{referrer:'https://google.com/'},configurable:true});
 Object.defineProperty(globalThis,'window',{value:{location:new URL(url+'/?gclid=abc'),localStorage:storage,dataLayer:[]},configurable:true});
 try{
  setMarketingConsent('unknown');assert.equal(captureMarketingAttribution(),undefined);assert.equal(store.size,0);
  setMarketingConsent('granted');assert.equal(captureMarketingAttribution()?.first.gclid,'abc');assert.ok(store.has(ATTRIBUTION_KEY));
  (window as any).location=new URL(url+'/estimate/scope');
  assert.equal(captureMarketingAttribution()?.latest.gclid,'abc');
  setMarketingConsent('denied');assert.equal(captureMarketingAttribution(),undefined);assert.equal(store.size,0);
  nav.globalPrivacyControl=true;setMarketingConsent('granted');assert.equal(captureMarketingAttribution(),undefined);
  nav.globalPrivacyControl=false;blocked=true;assert.doesNotThrow(()=>captureMarketingAttribution());
  (window as any).dataLayer=[['consent','update',{ad_storage:'denied'}]];
  assert.equal(captureMarketingAttribution(),undefined);
 }finally{setMarketingConsent('unknown');for(const [key,descriptor] of Object.entries(prior)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as any)[key];}}
});
test('existing strict P5 receiver retains namespaced CRM metadata without changing contact, scope text, source, or lead identity',()=>{
 const s:IntakeSnapshot={schema:1,projectId:'remodeling:abc',originSite:'remodeling',currentSite:'remodeling',draftId:'11111111-1111-4111-8111-111111111111',revision:1,contextVersion:1,
  contact:{name:'Synthetic QA',email:'qa@example.invalid',phone:'',preferredContact:'email'},details:emptyIntakeDetails(),
  scope:{text:'Kitchen remodel',answers:{service:'kitchen'},extraction:null,uploads:[]},routing:routeIntake('remodeling','kitchen',[]),unresolved:[],savedAt:new Date(now).toISOString()};
 const original=intakeProjectReview(intakeDeliveryEnvelope(s,'crm','a'.repeat(64)));
 const enriched=intakeProjectReview(intakeDeliveryEnvelope({...s,attribution},'crm','a'.repeat(64)));
 assert.equal(enriched.externalLeadId,original.externalLeadId);assert.equal(enriched.source,'boiseremodeling.co');
 assert.deepEqual(enriched.request.contact,original.request.contact);assert.equal(enriched.request.scope.text,s.scope.text);
 assert.deepEqual(JSON.parse(enriched.request.scope.answers[ATTRIBUTION_ANSWER]),attributionCrmMetadata(attribution,'Boise Remodeling Co'));
 assert.equal(s.scope.answers[ATTRIBUTION_ANSWER],undefined);
});
test('one primary Ads dispatch per successful lead key, including lazy tag loading and storage refusal',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'window');
 const calls:unknown[][]=[],timers:Array<()=>void>=[];
 const fake:any={sessionStorage:{getItem:()=>{throw Error();},setItem:()=>{throw Error();}},setTimeout:(f:()=>void)=>timers.push(f)};
 Object.defineProperty(globalThis,'window',{value:fake,configurable:true});
 try{
  assert.equal(trackGoogleAdsLeadConversion({},'intake:offline-test'),false);
  trackGoogleAdsLeadConversion({},'intake:offline-test');assert.equal(timers.length,1);
  fake.gtag=(...args:unknown[])=>calls.push(args);timers.shift()!();
  assert.equal(trackGoogleAdsLeadConversion({},'intake:offline-test'),false);
  assert.equal(calls.length,1);assert.equal(calls[0][1],'conversion');
  assert.equal((calls[0][2] as any).send_to,'AW-18354188204/cEzmCPOagKAdEKzf-q9E');
  assert.equal((calls[0][2] as any).transaction_id,'intake:offline-test');
 }finally{if(prior)Object.defineProperty(globalThis,'window',prior);else delete (globalThis as any).window;}
});
test('click tracking remains intent only and attribution attaches only to existing form payloads',()=>{
 const clicks=readFileSync(new URL('../components/ConversionTracking.tsx',import.meta.url),'utf8');
 assert.ok(clicks.includes("'contact_click'"));assert.ok(!/trackEvent\(['"](?:conversion|generate_lead|call_completed|email_sent)/.test(clicks));
 for(const file of ['components/P5Estimator.tsx','components/ConsultationForm.tsx'])assert.match(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/attribution:\s*captureMarketingAttribution\(\)/);
 const backend=readFileSync(new URL('../lib/p5/intakeEndpoint.ts',import.meta.url),'utf8');
 assert.ok(backend.indexOf('submissionAttribution(body.attribution,request.headers)')<backend.indexOf('intakeStore(query).save'));
 const intake=readFileSync(new URL('../components/P5Estimator.tsx',import.meta.url),'utf8');
 assert.ok(intake.indexOf('requireIntakeReceipt(value)')<intake.indexOf('`intake:${receipt.projectId}`'));
});
