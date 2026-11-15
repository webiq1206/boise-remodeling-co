import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAttribution,sourceFromAttribution} from '../lib/p5/leadAttribution.ts';
import {emptyIntakeDetails,intakeDetails,type IntakeSnapshot} from '../lib/p5/intakeContract.ts';
import {intakeLocalCrmRecord,intakeDeliveryEnvelope,intakeLeadKey} from '../lib/p5/intakeDeliveryPayload.ts';
import {validateIntakeLocalCrm} from '../lib/p5/intakeCrmValidation.ts';
import {routeIntake} from '../lib/p5/intakePolicy.ts';
const contact={name:'Test Customer',email:'qa@example.invalid',phone:'',preferredContact:'either' as const};
const attribution={gclid:'google-click',utm_campaign:'cabinet-search',first_gclid:'original-click',landing_page:'/estimate?gclid=google-click',first_landing_page:'/estimate?gclid=original-click'};
test('accepted paid attribution stays top-level and reaches the existing namespaced CRM contract',async()=>{
 const {advanceAttribution,observedTouch,ATTRIBUTION_ANSWER,attributionCrmMetadata}=await import('../lib/p5/marketingAttribution.ts');
 const {intakeProjectReview}=await import('../lib/p5/intakeProjectReview.ts');
 const now=Date.now();
 const observed=advanceAttribution(undefined,observedTouch('https://boiseremodeling.co/estimate?gclid=google-click&utm_campaign=remodeling','https://google.com/',now)!);
 const snapshot:IntakeSnapshot={schema:1,projectId:'remodeling:12345678-1234-4234-8234-123456789abc',draftId:'12345678-1234-4234-8234-123456789abc',originSite:'remodeling',currentSite:'remodeling',revision:3,contextVersion:2,contact,details:emptyIntakeDetails(),attribution:observed,scope:{text:'Kitchen project',answers:{service:'kitchen'},extraction:null,uploads:[]},routing:routeIntake('remodeling','kitchen'),unresolved:[],savedAt:new Date(now).toISOString()};
 const envelope=intakeDeliveryEnvelope(snapshot,'crm','a'.repeat(64));
 assert.deepEqual(envelope.request?.attribution,observed);
 const record=intakeProjectReview(envelope);
 assert.deepEqual(JSON.parse(record.request.scope.answers[ATTRIBUTION_ANSWER]),attributionCrmMetadata(observed,'Boise Remodeling Co'));
 assert.equal(record.request.projectId,snapshot.projectId);
 assert.equal(record.request.scope.text,snapshot.scope.text);
 assert.deepEqual(record.request.contact,contact);
 assert.equal(snapshot.scope.answers[ATTRIBUTION_ANSWER],undefined);
});
test('untrusted acquisition context excludes arbitrary fields, tokens and referrer paths',()=>{
 const clean=collectAttribution({gclid:'click',email:'private@example.com',token:'secret',landing_page:'/estimate?gclid=click&email=private%40example.com&t=secret#secret',referrer:'https://search.example/private?token=secret',first_landing_page:'https://evil.example/private',first_referrer:'javascript:alert(1)'});
 assert.deepEqual(clean,{gclid:'click',landing_page:'/estimate?gclid=click',referrer:'https://search.example'});
 for(const attribution of [null,[],true,'oops'])assert.equal('attribution' in intakeDetails({...emptyIntakeDetails(),attribution}),false);
});
test('unattributed legacy drafts remain valid and source classification handles paid identifiers',()=>{
 assert.equal('attribution' in intakeDetails(emptyIntakeDetails()),false);
 assert.equal(sourceFromAttribution(null),'Organic Website');
 for(const key of ['gclid','gbraid','wbraid'])assert.equal(sourceFromAttribution({[key]:'click'}),'Paid Search');
 assert.equal(sourceFromAttribution({utm_medium:'paid_social'}),'Social Media');
});
test('shared source classification preserves current-main first-touch and social precedence',()=>{
 for(const key of ['first_gclid','first_gbraid','first_wbraid'])assert.equal(sourceFromAttribution({[key]:'original-click'}),'Paid Search');
 for(const medium of ['cpc','ppc','paidsearch','paid_search'])assert.equal(sourceFromAttribution({utm_medium:medium}),'Paid Search');
 for(const source of ['facebook','fb','instagram','ig','meta','tiktok','linkedin'])assert.equal(sourceFromAttribution({utm_source:source,gclid:'older-google-click'}),'Social Media');
 assert.equal(sourceFromAttribution({utm_medium:'paid_social',first_gclid:'older-click'}),'Social Media');
});
