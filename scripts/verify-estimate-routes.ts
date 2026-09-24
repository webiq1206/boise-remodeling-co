import assert from 'node:assert/strict';
async function main(){
  {const {POST}=await import('../app/api/estimate-lead/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  console.log('Retired estimator API contracts passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
