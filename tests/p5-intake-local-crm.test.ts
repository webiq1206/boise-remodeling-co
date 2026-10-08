/** Pure receiver-contract validation; no DB, CRM or email transport is called. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIntakeLocalCrm} from '../lib/p5/intakeCrmValidation.ts';
import {intakeDeliveryEnvelope} from '../lib/p5/intakeDeliveryPayload.ts';
import {emptyIntakeDetails,type IntakeSnapshot} from '../lib/p5/intakeContract.ts';
import {intakeSite,routeIntake} from '../lib/p5/intakePolicy.ts';
import {ESTIMATOR_BRAND} from '../lib/p5/brand.ts';
const site=intakeSite(ESTIMATOR_BRAND.id);
assert.ok(site&&site!=='p5','This brand is a specialty intake site');
const id='12345678-1234-4234-8234-123456789abc',digest='a'.repeat(64);
const service=site==='construction'?'addition':site==='cabinet'?'cabinet-install':site==='handyman'?'handyman':'kitchen';
const s:IntakeSnapshot={schema:1,projectId:`p5:${id}`,draftId:id,originSite:'p5',currentSite:site,revision:1,contextVersion:0,savedAt:'2099-01-02T12:00:00.000Z',contact:{name:'Fictional Person',email:'customer@example.invalid',phone:'',preferredContact:'email'},details:{...emptyIntakeDetails(),desiredOutcome:'Fictional outcome',workContext:'Fictional existing home',transcript:[{id:'fictional-message',role:'user',text:'Fictional conversation',at:1,files:[]}]},scope:{text:'Fictional whole scope',answers:{service},extraction:null,uploads:[]},routing:routeIntake(site,service),unresolved:[]};
const envelope=(request:IntakeSnapshot,channel:'crm'|'team'='crm')=>intakeDeliveryEnvelope(request,channel,digest);
test('mock: a complete request on this site satisfies the project review contract',()=>{
 assert.equal(validateIntakeLocalCrm(envelope(s)),null);
 assert.equal(validateIntakeLocalCrm(envelope({...s,contact:{name:'Fictional Phone Person',email:'',phone:'2085550100',preferredContact:'phone'}})),null);
});
test('mock: wrong site, non-CRM channel, invalid contact and unapproved synthetic contact are held before any send',()=>{
 assert.equal(validateIntakeLocalCrm(envelope({...s,currentSite:'p5'})),'payload-review');
 assert.equal(validateIntakeLocalCrm(envelope(s,'team')),'payload-review');
 assert.equal(validateIntakeLocalCrm(envelope({...s,contact:{...s.contact,phone:'2'}})),'contact-review');
 const qa={...s,contact:{...s.contact,name:'[QA] Fictional Person',email:'fictional@unapproved.invalid'}};
 const previous=process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;
 try{
  delete process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;assert.equal(validateIntakeLocalCrm(envelope(qa)),'contact-review');
  process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST='fictional@unapproved.invalid';assert.equal(validateIntakeLocalCrm(envelope(qa)),null);
 }finally{if(previous===undefined)delete process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST;else process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST=previous;}
});
