import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentServiceEligible,documentServiceHeaders,remoteDocumentId,documentServiceConfiguration,checkDocumentServiceReadiness,validateDocumentServiceReadiness,advanceDocumentService} from '../lib/p5/documentServiceClient.ts';
import {ESTIMATOR_BRAND} from '../lib/p5/brand.ts';
const pdf:any={id:'file',name:'scope.pdf',type:'application/pdf',size:1000,sha256:'a'.repeat(64),status:'stored'};
const tenant=ESTIMATOR_BRAND.domain;
// Isolated fixture only. Never read a live secret or call a network.
const env={P5_DOCUMENT_SERVICE_URL:'https://reader.example/api/p5-documents',P5_DOCUMENT_SERVICE_KEY:'isolated-fixture-not-a-real-secret-123',P5_DOCUMENT_SERVICE_TENANT:tenant};
const readiness={ready:true,providerConfigured:true,tenant,protocol:'v1',limits:{maxFileBytes:250*1024*1024,maxPages:250},capabilities:{pdf:true}};
test('remote stays off by default; mixed sources do not downgrade PDFs',()=>{
 assert.equal(documentServiceEligible([pdf],{}),false);
 assert.equal(documentServiceEligible([pdf],{P5_DOCUMENT_SERVICE_MODE:'remote'}),true);
 assert.equal(documentServiceEligible([pdf,{...pdf,type:'image/png'}],{P5_DOCUMENT_SERVICE_MODE:'remote'}),true);
 assert.equal(documentServiceEligible([{...pdf,size:250*1024*1024}],{P5_DOCUMENT_SERVICE_MODE:'remote'}),true);
 assert.throws(()=>documentServiceEligible([{...pdf,size:250*1024*1024+1}],{P5_DOCUMENT_SERVICE_MODE:'remote'}),/limit/);
 assert.throws(()=>documentServiceEligible([{...pdf,size:0}],{P5_DOCUMENT_SERVICE_MODE:'remote'}),/limit/);
 assert.throws(()=>documentServiceEligible([pdf],{P5_DOCUMENT_SERVICE_MODE:'remote',P5_DOCUMENT_SERVICE_MAX_BYTES:'invalid'}),/configuration/);
});
test('cross-site and cross-project source identities cannot collide',()=>{
 assert.notEqual(remoteDocumentId(tenant,'one',pdf.sha256),remoteDocumentId('other.example','one',pdf.sha256));
 assert.notEqual(remoteDocumentId(tenant,'one',pdf.sha256),remoteDocumentId(tenant,'two',pdf.sha256));
});
test('signed requests bind tenant, body, method, path, timestamp and nonce',()=>{
 const args=['POST','/v1/projects/one/documents',tenant,env.P5_DOCUMENT_SERVICE_KEY,Buffer.from('pdf'),1700000000000,'test-nonce'] as const;
 const a=documentServiceHeaders(...args);
 for(const [index,value] of [[0,'GET'],[1,'/v1/projects/two/documents'],[2,'other.example'],[4,Buffer.from('different')],[5,1700000000001],[6,'other-nonce']] as const){
  const changed:any[]=[...args];changed[index]=value;
  assert.notEqual(a['x-p5-signature'],documentServiceHeaders(...changed as unknown as Parameters<typeof documentServiceHeaders>)['x-p5-signature']);
 }
 assert.equal(a['x-p5-body-sha256'].length,64);
});
test('activation configuration rejects missing or sibling tenant and unsafe origins',()=>{
 assert.equal(documentServiceConfiguration(env).tenant,tenant);
 for(const patch of [{P5_DOCUMENT_SERVICE_TENANT:undefined},{P5_DOCUMENT_SERVICE_TENANT:'other.example'},{P5_DOCUMENT_SERVICE_KEY:''},{P5_DOCUMENT_SERVICE_URL:'http://reader.example'},{P5_DOCUMENT_SERVICE_URL:'https://user:pass@reader.example'},{P5_DOCUMENT_SERVICE_URL:'https://reader.example/?key=bad'},{P5_DOCUMENT_SERVICE_MAX_PAGES:'251'}]){
  assert.throws(()=>documentServiceConfiguration({...env,...patch}));
 }
});
test('readiness rejects generic health, wrong tenant, reduced capacity and missing capability',()=>{
 assert.equal(validateDocumentServiceReadiness(readiness),true);
 assert.equal(validateDocumentServiceReadiness({...readiness,ready:undefined,ok:true,providerConfigured:true}),true);
 assert.equal(validateDocumentServiceReadiness({...readiness,limits:{maxFileBytes:500*1024*1024,maxPages:500}}),true);
 for(const providerConfigured of [undefined,false])for(const ready of [{ready:true},{ready:undefined,ok:true}]){
  assert.throws(()=>validateDocumentServiceReadiness({...readiness,...ready,providerConfigured}),/configured provider/);
 }
 for(const value of [null,{ok:true,version:'v1',providerConfigured:true},{...readiness,tenant:'other.example'},{...readiness,protocol:'v2'},{...readiness,limits:{maxFileBytes:50*1024*1024,maxPages:200}},{...readiness,limits:{maxFileBytes:250*1024*1024,maxPages:249}},{...readiness,capabilities:{}},{...readiness,ready:false}]){
  assert.throws(()=>validateDocumentServiceReadiness(value),/readiness/);
 }
});
test('foreign drafts are rejected before storage, network or work claims',async()=>{
 let calls=0;
 await assert.rejects(advanceDocumentService({brand:'another-brand',uploads:[pdf]} as any,'',{},'fixture',async()=>{calls++;throw new Error('Must not send');},false,Date.now()+1000),/does not belong/);
 assert.equal(calls,0);
});
test('no-charge preflight sends only a signed GET to readyz',async()=>{
 let count=0;
 const request:typeof fetch=async(input,init)=>{
  count++;assert.equal(String(input),'https://reader.example/api/p5-documents/readyz');
  assert.equal(init?.method,'GET');assert.equal(init?.body,undefined);assert.equal(init?.redirect,'error');
  assert.equal(new Headers(init?.headers).get('x-p5-tenant'),tenant);
  return Response.json(readiness);
 };
 await checkDocumentServiceReadiness(request,env);
 assert.equal(count,1);
 await assert.rejects(checkDocumentServiceReadiness(request,{...env,P5_DOCUMENT_SERVICE_TENANT:'other.example'}),/credential/);
 assert.equal(count,1);
});
test('preflight fails closed for denied, unavailable, invalid and wrong-tenant responses',async()=>{
 for(const response of [new Response('{}',{status:401}),new Response('{}',{status:503}),new Response('not json'),Response.json({...readiness,tenant:'other.example'})]){
  await assert.rejects(checkDocumentServiceReadiness(async()=>response,env));
 }
});