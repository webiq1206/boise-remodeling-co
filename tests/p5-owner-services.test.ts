import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultOwnerServiceSchedule,ownerServiceTotals,OWNER_SERVICE_BOOK_COST,OWNER_SERVICES} from '../lib/p5/ownerServices.ts';
import {calculateP5Estimate,DEFAULT_FINANCE,COST_CATEGORIES,type PricingInput} from '../lib/p5/pricing.ts';
import {documentEstimateBody,linesByTrade} from '../lib/p5/documentEstimateFigures.ts';
import {resolveInternalEstimate} from '../shared/costs/resolve.ts';
import {PRICE_BOOK_RATEABLE,priceBookRate} from '../lib/p5/priceBook.ts';

const now=new Date('2026-11-23T12:00:00Z');
function input(cost=120,service:PricingInput['service']='handyman'):PricingInput {
  return {service,revision:'new-project',scopeSummary:'Repair the selected scope',locationProvided:true,uncertainty:'low',
    lines:[{id:'work',category:'other-direct',description:'Scoped construction work',quantity:1,unit:'EA',unitCost:cost,
      quantitySource:'Confirmed scope',evidence:{basis:'approved-cost-book',reference:'Owner book work',verifiedAt:'2026-11-23',validUntil:'2027-01-01'}}],
    coverage:COST_CATEGORIES.map(category=>({category,status:'not-applicable',reason:'Test scope'})),
    risks:[],assumptions:[],exclusions:[],missingInformation:[],allowances:[]};
}
test('small jobs have positive minimum milestone hours and exact authoritative book conversion',()=>{
  const i=input(1);const schedule=defaultOwnerServiceSchedule(i.lines,i.service);
  assert.deepEqual(ownerServiceTotals(schedule).map(s=>s.hours),[.25,.125,.125]);
  assert.equal(OWNER_SERVICE_BOOK_COST,120/1.6176);
  for(const tier of ['builder','mid','high','luxury'] as const)
    for(const service of OWNER_SERVICES){
      const row=PRICE_BOOK_RATEABLE.find(row=>row[0]===service.code)!;
      assert.ok(row);
      assert.equal(priceBookRate(row,tier,true).amount,OWNER_SERVICE_BOOK_COST);
    }
});
test('new local document and cabinet projects charge each service once at final $120, and reconcile',()=>{
  for(const cost of [120,120000])for(const service of ['handyman','cabinet-product','cabinet-install','kitchen','new-construction'] as const){
    const i=input(cost,service);i.ownerServices=defaultOwnerServiceSchedule(i.lines,service);
    const result=calculateP5Estimate(i,DEFAULT_FINANCE,[],now);
    const services=result.lines.filter(l=>OWNER_SERVICES.some(s=>s.code===l.id));
    assert.equal(services.length,3);
    for(const line of services){assert.equal(line.sellingUnitPrice,120);assert.equal(line.sellingAmount,line.quantity*120);}
    assert.ok(Math.abs(result.reconciliation)<1e-7);
    assert.ok(Math.abs(result.lines.reduce((n,l)=>n+l.sellingAmount,0)-result.contractPrice)<1e-7);
    assert.ok(result.planningRange.low>0&&result.planningRange.high>=result.contractPrice);
    const repeat=calculateP5Estimate({...i,lines:result.lines},DEFAULT_FINANCE,[],now);
    assert.equal(repeat.contractPrice,result.contractPrice);
    const body=documentEstimateBody({internal:result,customer:{range:result.planningRange}})!;
    assert.deepEqual(body.lines.filter(l=>l.qboServiceId).map(l=>l.qboServiceId),['48','49','47']);
    assert.equal(linesByTrade(body.lines).filter(l=>l.qboServiceId).length,3);
    console.log(`${service}, scoped cost ${cost}: total ${result.contractPrice.toFixed(2)}, range ${result.planningRange.low}-${result.planningRange.high}`);
  }
});
test('scope size and milestone count scale hours; internal edits validate and replace rather than accumulate',()=>{
  const small=defaultOwnerServiceSchedule(input().lines,'handyman');
  const large=defaultOwnerServiceSchedule(input(120000).lines,'new-construction',{milestones:[{name:'Planning',outsideCost:30000},{name:'Construction',outsideCost:90000}]});
  assert.ok(large.milestones.length>small.milestones.length);
  assert.ok(ownerServiceTotals(large)[0].hours>ownerServiceTotals(small)[0].hours);
  assert.deepEqual(ownerServiceTotals(large).map(s=>s.hours),[60,24,12]);
  assert.equal(large.milestones[0].hours['01-31-03'],15);
  small.milestones[0].hours['01-31-03']=2;
  assert.equal(ownerServiceTotals(small)[0].hours,2);
  small.milestones[0].hours['01-31-03']=0;
  assert.throws(()=>ownerServiceTotals(small));
});
test('minimum is once per project; equal allocation, fallback and overrides are explicit',()=>{
  const schedule=defaultOwnerServiceSchedule([],'handyman',{preOwnerDirectCost:100,milestones:[{name:'A'},{name:'B'}]});
  assert.deepEqual(ownerServiceTotals(schedule).map(s=>s.hours),[.25,.125,.125]);
  assert.equal(schedule.milestones[0].hours['01-31-04'],.0625);
  assert.equal(defaultOwnerServiceSchedule([],'handyman',{override:schedule}),schedule);
  const tiny=input(1);tiny.ownerServices=defaultOwnerServiceSchedule(tiny.lines,tiny.service);
  assert.ok(!calculateP5Estimate(tiny,DEFAULT_FINANCE,[],now).warnings.some(w=>w.code==='unusual-total'));
});
test('tax, owner labor, overhead and profit never enter the default hours base',()=>{
  const work=input(1000).lines;
  const schedule=defaultOwnerServiceSchedule([
    {...work[0],unitCost:1100,landed:{tax:100}},
    {...work[0],id:'tax',description:'Sales tax',unitCost:100},
    {...work[0],id:'owner',category:'owner-production'},
    {...work[0],id:'oh',description:'Overhead'},
    {...work[0],id:'profit',description:'Profit'},
  ],'handyman');
  assert.equal(schedule.baselineOutsideCost,1000);
  assert.deepEqual(ownerServiceTotals(schedule).map(s=>s.hours),[.5,.2,.125]);
});
test('outside supervision remains, while duplicate owner allowances and salary recovery are credited once',()=>{
  const i=input(10000);
  i.lines.push({...i.lines[0],id:'PB-01-31-02',description:'Independent outside superintendent',supervisionTreatment:'outside-distinct',unitCost:1000});
  i.lines.push({...i.lines[0],id:'PB-01-31-01',description:'Owner supervision allowance',unitCost:2000});
  i.ownerServices=defaultOwnerServiceSchedule(i.lines,i.service);
  assert.equal(i.ownerServices.baselineOutsideCost,11000);
  const priced=calculateP5Estimate(i,DEFAULT_FINANCE,[],now);
  assert.ok(priced.lines.some(l=>l.id==='PB-01-31-02'));
  assert.ok(!priced.lines.some(l=>l.id==='PB-01-31-01'));
  assert.ok(priced.ownerSalaryOverheadCredit!>0);
  const again=calculateP5Estimate({...i,lines:priced.lines},DEFAULT_FINANCE,[],now);
  assert.equal(again.contractPrice,priced.contractPrice);
  assert.ok(Math.abs(priced.reconciliation)<1e-7);
});
test('historical input stays on its saved policy; overlapping supervision is replaced only on new-policy input',()=>{
  const i=input();const old=calculateP5Estimate(i,DEFAULT_FINANCE,[],now);
  assert.equal(old.lines.length,1);assert.equal(old.ownerServices,undefined);
  i.lines.push({...i.lines[0],id:'PB-01-31-01',description:'Project supervision / superintendent'});
  i.ownerServices=defaultOwnerServiceSchedule(i.lines,i.service);
  const result=calculateP5Estimate(i,DEFAULT_FINANCE,[],now);
  assert.equal(result.lines.length,4);
  assert.ok(!result.lines.some(l=>l.id==='PB-01-31-01'));
  assert.equal(calculateP5Estimate(input(),DEFAULT_FINANCE,[],now).contractPrice,old.contractPrice);
});
test('legacy consultation resolver uses the same services without old team supervision or tier markup',()=>{
  for(const finish of ['refresh','mid-range','high-end','luxury']){
    const result=resolveInternalEstimate('bathroom',finish,60,{})!;
    assert.ok(result);
    assert.ok(!result.internal.lines.some(l=>l.code==='L-03-00'));
    assert.equal(result.internal.lines.filter(l=>l.sellingUnitPrice===120).length,3);
    assert.ok(result.range.low>0);
  }
});
