import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import crypto from "node:crypto";
import {buildCrmPayload,crmPayloadBytes,CRM_PAYLOAD_LIMIT_BYTES,CRM_RECEIVER_PARSER_LIMIT_BYTES,CRM_RESPONSE_LIMIT_BYTES,readBoundedCrmResponse,safeCrmContentClass,safeCrmResponseShape} from "../lib/p5/crmPayload.ts";
import {externalLeadSchema,validateRequest} from "./fixtures/crmReceiverValidation571c6f6d.ts";

function syntheticRecord(repeat=150) {
  const assumptions=Array.from({length:repeat},(_,i)=>`Internal assumption ${i}: retain existing structure and verify field condition before work.`);
  const customerAssumptions=Array.from({length:repeat},(_,i)=>`Customer assumption ${i}: field condition will be verified.`);
  const lines=Array.from({length:repeat},(_,i)=>({category:"carpentry",description:`Complete scope item ${i} without reducing specified work.`,quantity:1,unitCost:125,directCost:125,quantitySource:`Long source narrative ${i} duplicated by scope pricing.`,evidence:{basis:"owner-estimating-schedule",reference:`Long cost-book source reference ${i}.`}}));
  return {
    brand:{name:"Example Remodeler",domain:"example.test"},estimator:"p5-policy",draftId:"draft-redacted-001",revision:3,
    contact:{name:"Redacted Homeowner",email:"redacted@example.test",phone:"000-000-0000"},
    scope:{text:"Complete structurally equivalent synthetic remodel scope.",answers:{service:"addition",address:"REDACTED",location:"Boise"},uploads:[],extraction:{facts:[]}},
    internal:{lines,assumptions,exclusions:["Internal hazardous-material exclusion."],allowances:[{name:"Internal tile allowance",amount:4500}],costBookSnapshot:{entries:lines},financeSnapshot:{policy:assumptions},scopePricing:{evidence:assumptions},warnings:[]},
    customer:{range:{low:100000,high:125000},summary:"Addition with the complete described synthetic scope.",lineItems:lines.slice(0,30),assumptions:customerAssumptions,exclusions:["Customer-facing testing exclusion."],allowances:[{name:"Tile",amount:4500}],verificationItems:[]},
  };
}

// Faithful offline extraction of Express' default json parser gate in
// server/index.ts at receiver commit 571c6f6d8009994325bf59bb322a74a65697eab5.
function receiverParse(json:string) {
  if (Buffer.byteLength(json,"utf8") > CRM_RECEIVER_PARSER_LIMIT_BYTES) return {status:413 as const};
  return {status:200 as const,body:JSON.parse(json)};
}

// Extracted auth, validation, and persistence transformation from the pinned
// /api/external/leads handler. Storage and auth state are local mocks; downstream
// notifications/tasks are outside the payload acceptance boundary and omitted.
async function extractedReceiverHandler(body:any,storage:any,authorization="Bearer offline-key") {
  if(!authorization.startsWith("Bearer "))return {status:401};
  const providedBuf=Buffer.from(authorization.substring(7)),storedBuf=Buffer.from(await storage.getExternalApiKey());
  if(providedBuf.length!==storedBuf.length||!crypto.timingSafeEqual(providedBuf,storedBuf))return {status:401};
  const validation=validateRequest(externalLeadSchema,body);
  if(!validation.success)return {status:400,body:{error:"Validation failed",message:validation.error}};
  const data=validation.data;
  const estimatePayload=data.estimate||data.estimateSummary||data.property?JSON.stringify({
    estimate:data.estimate??null,estimateSummary:data.estimateSummary??null,estimateLow:data.estimateLow??null,
    estimateHigh:data.estimateHigh??null,estimateRange:data.estimateRange??null,property:data.property??null,receivedAt:"offline-fixed",
  }):null;
  const lead=await storage.createLead({sourcePayload:estimatePayload,fullName:data.fullName,email:data.email,phone:data.phone||null,
    propertyAddress:data.propertyAddress||null,city:data.city||null,projectTypes:data.projectTypes||[],projectScope:data.projectScope||null,
    leadSource:(data.source||"external").substring(0,50)});
  return {status:201,body:{success:true,leadId:lead.id}};
}

test("bounded CRM payload passes the actual schema and extracted receiver handler",async()=>{
  const original=syntheticRecord();
  const originalJson=JSON.stringify(original);
  const payload=buildCrmPayload(original,"idempotency-redacted","example.test");
  const bytes=crmPayloadBytes(payload);
  assert.ok(Buffer.byteLength(originalJson)>CRM_RECEIVER_PARSER_LIMIT_BYTES,"fixture meaningfully reproduces 413 size");
  assert.ok(bytes<=CRM_PAYLOAD_LIMIT_BYTES);
  const parsed=receiverParse(JSON.stringify(payload));
  assert.equal(parsed.status,200);
  let persisted:any;
  const storage={getExternalApiKey:async()=>"offline-key",createLead:async(input:any)=>(persisted=input,{id:"offline-lead-id"})};
  const accepted=await extractedReceiverHandler(parsed.body,storage);
  assert.equal(accepted.status,201);
  assert.match(persisted.sourcePayload,/omittedRedundantMetadata/);
  assert.match(persisted.sourcePayload,/authenticated administrator/);
  const estimate=JSON.parse(persisted.sourcePayload).estimate;
  assert.deepEqual(estimate.internal.assumptions,original.internal.assumptions);
  assert.deepEqual(estimate.internal.exclusions,original.internal.exclusions);
  assert.deepEqual(estimate.internal.allowances,original.internal.allowances);
  assert.ok(!estimate.omittedRedundantMetadata.some((item:any)=>/assumptions|exclusions|allowances/.test(item.path)));
  assert.equal((validateRequest(externalLeadSchema,payload) as any).data.externalLeadId,undefined,"actual zod schema strips unknown sender metadata");
  assert.equal(JSON.stringify(original),originalJson,"durable source record is not mutated");
});

test("fails explicitly instead of truncating essential internal priced lines",()=>{
  const record=syntheticRecord(1100);
  assert.throws(()=>buildCrmPayload(record,"idempotency-redacted","example.test"),/exceeds safe limit/);
});

test("rejects untrusted configured domain metadata",()=>{
  assert.throws(()=>buildCrmPayload(syntheticRecord(2),"key","https://example.test/path"),/valid hostname/);
});

test("bounds CRM responses and exposes only allowlisted diagnostic classes",async()=>{
  const bounded=await readBoundedCrmResponse(new Response(JSON.stringify({success:true,leadId:"offline-id"})));
  assert.equal(bounded.oversized,false);
  assert.deepEqual(JSON.parse(bounded.text),{success:true,leadId:"offline-id"});
  const oversized=await readBoundedCrmResponse(new Response("x".repeat(CRM_RESPONSE_LIMIT_BYTES+1)));
  assert.equal(oversized.oversized,true);
  assert.equal(oversized.text,"","partial acknowledgement must never be parsed");
  assert.equal(safeCrmContentClass("application/sensitive-customer+json; reflected=secret"),"json");
  assert.equal(safeCrmContentClass("private/secret"),"other");
  assert.equal(safeCrmResponseShape({success:false,error:"reflected PII",customerSecret:"never expose this key"}),"json:error,success");
});

function csvRows(source:string) {
  const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
  for(let i=0;i<source.length;i++){const char=source[i];if(quoted){if(char==='"'&&source[i+1]==='"'){value+='"';i++;}else if(char==='"')quoted=false;else value+=char;}else if(char==='"')quoted=true;else if(char===","){row.push(value);value="";}else if(char==="\n"){row.push(value.replace(/\r$/,""));rows.push(row);row=[];value="";}else value+=char;}
  return rows;
}

test("saved production failures fit actual schema and extracted handler offline when local evidence is present",{skip:!existsSync("/tmp/crm-failed-records.csv")},async()=>{
  const rows=csvRows(readFileSync("/tmp/crm-failed-records.csv","utf8")).slice(1);
  assert.equal(rows.length,2);
  for(const [index,row] of rows.entries()){
    const payload=buildCrmPayload(JSON.parse(row[2]),`offline-record-${index+1}`,"boiseremodeling.co");
    assert.ok(crmPayloadBytes(payload)<=CRM_PAYLOAD_LIMIT_BYTES);
    const parsed=receiverParse(JSON.stringify(payload));
    assert.equal(parsed.status,200);
    const validation=validateRequest(externalLeadSchema,parsed.body);
    assert.equal(validation.success,true);
    let persisted:any;
    const accepted=await extractedReceiverHandler(parsed.body,{getExternalApiKey:async()=>"offline-key",createLead:async(input:any)=>(persisted=input,{id:`offline-${index}`})});
    assert.equal(accepted.status,201);
    assert.ok(JSON.parse(persisted.sourcePayload).estimate.internal.assumptions);
  }
});