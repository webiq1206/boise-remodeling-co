import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PricingQualification,digest,DOCUMENT_LIMITS,type PricingAllowance} from './lib/pricingQualification.ts';
import {capturePricingDelivery} from './lib/capturedPricingDelivery.ts';
import {calculateP5Estimate,customerEstimate,COST_CATEGORIES} from '../lib/p5/pricing.ts';

// All providers below are local callbacks. No credentials, environment mutation,
// application database, HTTP, email or CRM transports are used.
const dir=await mkdtemp(path.join(tmpdir(),'pricing-qualification-'));
const source=digest('synthetic source only');
const endpoint='https://provider.example.invalid/v1/responses';
const allowance:PricingAllowance={version:1,id:'synthetic-only',approvedBy:'Synthetic Test',
  approvalEvidence:'TEST ONLY; this fixture authorizes no real provider calls',
  expiresAt:new Date(Date.now()+3600000).toISOString(),totalMicros:2_000_000,sourceSha256:source,
  models:[{endpoint,model:'exact-test-model',rateEvidence:'Synthetic rate card, no real provider',
    rates:{input:1_000_000,output:2_000_000,cached:500_000,cacheWrite:1_250_000,search:10_000},
    maxInputTokens:5000,maxOutputTokens:1000,maxSearchCalls:0}]};
const allowanceFile=path.join(dir,'allowance.json');
let checks=0,calls=0;
const request=(tag:string)=>({method:'POST',body:JSON.stringify({model:'exact-test-model',input:tag,max_output_tokens:100})});
const success:typeof fetch=async()=>{calls++;return Response.json({model:'exact-test-model',status:'completed',
  usage:{input_tokens:100,output_tokens:20,input_tokens_details:{cached_tokens:10}},output:[]});};
const open=(name:string)=>new PricingQualification(allowanceFile,path.join(dir,`${name}.sqlite`),source);
try {
  const runner=await readFile('scripts/check-p5-live-pricing.mts','utf8');
  assert.ok(runner.indexOf('readAllowance(allowanceFile)')<runner.indexOf("await import('../lib/p5/database')"));
  assert.equal((runner.match(/query\(/g)||[]).length,2);
  assert.equal((runner.match(/query\("SELECT payload FROM p5_estimator_policy WHERE id='current'"\)/g)||[]).length,2);
  checks++;
  assert.throws(()=>new PricingQualification(undefined,path.join(dir,'absent.sqlite'),source),/documented-allowance-required/);checks++;
  await writeFile(allowanceFile,JSON.stringify(allowance));
  assert.throws(()=>new PricingQualification(allowanceFile,path.join(dir,'bad-source.sqlite'),digest('other')),/source-identity/);checks++;
  let q=open('settlement');
  await q.guardedFetch({documentId:'short',kind:'short'},success)(endpoint,request('first'));
  assert.equal((q.report().calls[0] as any).actual,135);
  q.close();q=open('settlement');
  await assert.rejects(q.guardedFetch({documentId:'short',kind:'short'},success)(endpoint,request('first')),/duplicate/);
  assert.equal(calls,1);checks++;q.close();

  q=open('unknown');
  const unknown:typeof fetch=async()=>{calls++;throw new Error('Bearer SECRET_MUST_NEVER_PERSIST');};
  await assert.rejects(q.guardedFetch({documentId:'short',kind:'short'},unknown)(endpoint,request('unknown')),/unknown-charge-frozen/);
  q.close();q=open('unknown');
  await assert.rejects(q.guardedFetch({documentId:'other',kind:'plans'},success)(endpoint,request('retry')),/unknown-charge-frozen/);
  assert.equal(calls,2);assert.ok(!JSON.stringify(q.report()).includes('SECRET'));checks++;
  const unresolved=q.report().calls[0] as any;
  assert.throws(()=>q.reconcile(unresolved.id,0,''),/billing-evidence/);
  q.reconcile(unresolved.id,0,'Synthetic invoice confirms no charge for this exact request.');
  await q.guardedFetch({documentId:'short',kind:'short'},success)(endpoint,request('after-reconciliation'));
  checks++;q.close();

  q=open('race');const other=open('race');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const pending=q.guardedFetch({documentId:'race',kind:'short'},async(...args)=>{await gate;return success(...args);})(endpoint,request('race'));
  assert.throws(()=>other.reconcile((other.report().calls[0] as any).id,0,'Synthetic billing evidence for active call must not unlock it.'),/still-running/);
  await assert.rejects(other.guardedFetch({documentId:'race',kind:'short'},success)(endpoint,request('different')),/unknown-charge-frozen/);
  release();await pending;checks++;other.close();q.close();

  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`
    import {PricingQualification} from ${JSON.stringify(path.resolve('scripts/lib/pricingQualification.ts'))};
    const q=new PricingQualification(${JSON.stringify(allowanceFile)},${JSON.stringify(path.join(dir,'crash.sqlite'))},${JSON.stringify(source)});
    await q.guardedFetch({documentId:'crash',kind:'short'},async()=>{process.exit(17)})(${JSON.stringify(endpoint)},${JSON.stringify(request('crash'))});
  `],{encoding:'utf8'});
  assert.equal(child.status,17);
  q=open('crash');assert.throws(()=>q.assertClear(),/unknown-charge/);
  assert.equal((q.report().calls[0] as any).state,'reserved');
  q.reconcile((q.report().calls[0] as any).id,0,'Synthetic billing evidence: terminated callback never contacted a provider.');
  q.assertClear();q.close();checks++;
  const review=new PricingQualification(allowanceFile,path.join(dir,'crash.sqlite'),digest('source changed'),'review');
  await assert.rejects(review.guardedFetch({documentId:'review',kind:'short'},success)(endpoint,request('review')),/review-mode-cannot-spend/);
  review.close();checks++;

  for(const [name,reply] of [
    ['missing-usage',{model:'exact-test-model'}],
    ['wrong-model',{model:'different',usage:{input_tokens:1,output_tokens:1}}],
    ['malformed-usage',{model:'exact-test-model',usage:{input_tokens:-1,output_tokens:1}}],
    ['overrun',{model:'exact-test-model',usage:{input_tokens:8000,output_tokens:1000}}],
  ] as const){
    q=open(name);
    await assert.rejects(q.guardedFetch({documentId:name,kind:'short'},async()=>Response.json(reply))(endpoint,request(name)),/unknown-charge/);
    assert.throws(()=>q.assertClear(),/unknown-charge/);q.close();checks++;
  }
  q=open('network-denial');
  await assert.rejects(q.guardedFetch({documentId:'denied',kind:'short'},success)('https://crm.example.invalid',request('denied')),/unapproved/);
  await assert.rejects(q.guardedFetch({documentId:'denied',kind:'short'},success)(endpoint,{...request('tools'),body:JSON.stringify({model:'exact-test-model',max_output_tokens:100,tools:[{type:'web_search'}]})}),/unbounded/);
  assert.equal(q.report().calls.length,0);q.close();checks++;
  await writeFile(allowanceFile,JSON.stringify({...allowance,totalMicros:1}));
  q=open('low-allowance');
  await assert.rejects(q.guardedFetch({documentId:'short',kind:'short'},success)(endpoint,request('budget')),/insufficient/);
  assert.equal(q.report().calls.length,0);q.close();checks++;
  await writeFile(allowanceFile,JSON.stringify({...allowance,totalMicros:10_000_000,
    models:[{...allowance.models[0],rates:{...allowance.models[0].rates,input:200_000_000}}]}));
  q=open('document-cap');
  await assert.rejects(q.guardedFetch({documentId:'short',kind:'short'},success)(endpoint,request('document-cap')),/insufficient/);
  await q.guardedFetch({documentId:'plans',kind:'plans'},success)(endpoint,request('document-cap'));
  q.close();checks++;
  await writeFile(allowanceFile,JSON.stringify(allowance));
  assert.deepEqual(DOCUMENT_LIMITS,{short:1_000_000,plans:3_000_000});checks++;

  const today=new Date().toISOString().slice(0,10);
  const pricing:any={service:'kitchen',revision:'synthetic',scopeSummary:'SYNTHETIC captured kitchen scope',uncertainty:'high',locationProvided:false,
    lines:[{id:'trade',category:'subcontractors',description:'Synthetic written complete trade scope',quantity:1,unit:'package',unitCost:60000,quantitySource:'Synthetic test',
      evidence:{basis:'written-quote',reference:'SYNTHETIC ONLY',verifiedAt:today,validUntil:new Date(Date.now()+86400000*20).toISOString().slice(0,10)}}],
    coverage:COST_CATEGORIES.map(category=>({category,status:category==='subcontractors'?'included':'not-applicable',reason:'Synthetic only'})),
    risks:[],assumptions:[],exclusions:['Owner appliances'],missingInformation:[],allowances:[]};
  const internal=calculateP5Estimate(pricing,{annualOverhead:420000,annualRevenue:6000000,forecastSource:'SYNTHETIC ONLY',reviewedAt:today,approvedBy:['Fixture']},[]);
  const customer=customerEstimate(internal,pricing.scopeSummary);
  const manifest=await capturePricingDelivery({internal,customer},{text:pricing.scopeSummary,answers:{service:'kitchen'}},path.join(dir,'captured'));
  assert.equal(manifest.priceConsistency,true);assert.equal(manifest.externalSends,0);checks++;
  assert.ok((await readFile(path.join(dir,'captured','customer.pdf'))).length>0);
  console.log(JSON.stringify({passed:true,checks,providerNetworkCalls:0,businessWrites:0,externalSends:0}));
}finally{await rm(dir,{recursive:true,force:true});}