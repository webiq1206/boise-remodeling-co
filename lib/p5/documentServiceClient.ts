import {createHash,createHmac,randomUUID} from 'node:crypto';
import {query} from './database.ts';
import {readStoredBytes} from './objectStorage.ts';
import {claimWork,writeWork,releaseWork} from './workStore.ts';
import {ESTIMATOR_BRAND} from './brand.ts';
import {validateExtraction,SCOPE_PDF_PAGE_LIMIT,type ScopeAnswers,type ScopeUpload} from './scope.ts';
import {type Draft,DraftError} from './store.ts';
import {fetchWithinDeadline,remainingBudget} from './processingBudget.ts';
import type {ProcessingStatus} from './processingStatus.ts';
import {retainScopeContext} from './extraction.ts';
const VERSION='p5-documents-2026-09-17-v1';
const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
type Environment=Readonly<Record<string,string|undefined>>;
export function documentServiceLimits(env:Environment=process.env){
 const maxFileBytes=Number(env.P5_DOCUMENT_SERVICE_MAX_BYTES||250*1024*1024),maxPages=Number(env.P5_DOCUMENT_SERVICE_MAX_PAGES||SCOPE_PDF_PAGE_LIMIT);
 if(!Number.isSafeInteger(maxFileBytes)||maxFileBytes<=0||maxFileBytes>250*1024*1024||!Number.isSafeInteger(maxPages)||maxPages<=0||maxPages>SCOPE_PDF_PAGE_LIMIT)throw new DraftError('The document size/page limit needs configuration. Your files are saved.',503);
 return {maxFileBytes,maxPages};
}
export function documentServiceEligible(uploads:ScopeUpload[],env:Readonly<Record<string,string|undefined>>=process.env){
 if(env.P5_DOCUMENT_SERVICE_MODE!=='remote')return false;
 const {maxFileBytes}=documentServiceLimits(env);
 const pdfs=uploads.filter(u=>u.type==='application/pdf');
 if(pdfs.some(u=>u.status!=='stored'||u.size<=0||u.size>maxFileBytes))throw new DraftError('A PDF exceeds the configured reader limit or is not fully stored. Your files are saved; it cannot silently use another reader.',422);
 return pdfs.length>0;
}
/** Explicit brand binding is required; never borrow a sibling site's credential. */
export function documentServiceConfiguration(env:Environment=process.env){
 const tenant=ESTIMATOR_BRAND.domain,secret=env.P5_DOCUMENT_SERVICE_KEY||'';
 let origin:URL;try{origin=new URL(env.P5_DOCUMENT_SERVICE_URL||'');}catch{throw new DraftError('The document service is not configured. Your files are saved.',503);}
 if(origin.protocol!=='https:'||origin.username||origin.password||!['/','/api/p5-documents','/api/p5-documents/'].includes(origin.pathname)||origin.search||origin.hash||secret.length<32)throw new DraftError('The document service configuration needs attention. Your files are saved.',503);
 if(env.P5_DOCUMENT_SERVICE_TENANT!==tenant)throw new DraftError('The document service requires a credential explicitly provisioned for boiseremodeling.co. Your files are saved.',503);
 return {tenant,secret,origin,limits:documentServiceLimits(env)};
}
/** /readyz must attest the authenticated tenant and actual worker limits, not just HTTP health. */
export function validateDocumentServiceReadiness(value:unknown,limits=documentServiceLimits()){
 const ready=value as {ready?:boolean;ok?:boolean;providerConfigured?:boolean;tenant?:string;protocol?:string;limits?:{maxFileBytes?:number;maxPages?:number};capabilities?:{pdf?:boolean}}|null;
 if(!ready||!(ready.ready===true||ready.ok===true)||ready.providerConfigured!==true||ready.tenant!==ESTIMATOR_BRAND.domain||ready.protocol!=='v1'||ready.capabilities?.pdf!==true||!Number.isSafeInteger(ready.limits?.maxFileBytes)||!Number.isSafeInteger(ready.limits?.maxPages)||ready.limits!.maxFileBytes!<limits.maxFileBytes||ready.limits!.maxPages!<limits.maxPages)throw new DraftError('Reader readiness is unverified: /readyz must confirm this tenant, a configured provider, v1 PDF support, and the configured byte/page limits. No documents were sent; your files are saved.',503);
 return true;
}
/** No-charge readiness check: GET only, no document upload or review creation. */
export async function checkDocumentServiceReadiness(request:typeof fetch=fetch,env:Environment=process.env,deadline=Date.now()+10000){
 const config=documentServiceConfiguration(env),path='/readyz',body=Buffer.alloc(0);
 const response=await fetchWithinDeadline(request,config.origin.origin+config.origin.pathname.replace(/\/$/,'')+path,{method:'GET',headers:documentServiceHeaders('GET',path,config.tenant,config.secret,body),redirect:'error'},deadline);
 if(!response.ok)throw new DraftError('The authenticated document reader readiness check failed. Your files are saved.',503);
 let value:unknown;try{value=await response.json();}catch{throw new DraftError('The document reader readiness response is invalid. Your files are saved.',503);}
 validateDocumentServiceReadiness(value,config.limits);
 return config;
}
export function documentServiceHeaders(method:string,path:string,tenant:string,secret:string,body:Buffer,now=Date.now(),nonce:string=randomUUID()){
 const timestamp=String(now),bodyHash=digest(body);
 return {'x-p5-tenant':tenant,'x-p5-time':timestamp,'x-p5-nonce':nonce,'x-p5-body-sha256':bodyHash,'x-p5-signature':createHmac('sha256',secret).update([method,path,tenant,timestamp,nonce,bodyHash].join('\n')).digest('hex')};
}
export function remoteDocumentId(tenant:string,project:string,sha256:string){return digest(JSON.stringify([VERSION,tenant,project,sha256]));}
/** Reject oversized metadata immediately, including queued/reading receipts. */
export function validateRemotePageCount(value:unknown,maxPages=SCOPE_PDF_PAGE_LIMIT){
 if(value!==undefined&&(!Number.isSafeInteger(value)||Number(value)<0||Number(value)>maxPages))throw new DraftError(`The document reader reported an invalid page count or more than ${maxPages} pages. Your file is saved but cannot be automatically analyzed.`,422);
}
export async function advanceDocumentService(draft:Draft,text:string,answers:ScopeAnswers,workKey:string,request:typeof fetch,retryFailed:boolean,deadline:number){
 if(draft.brand!==ESTIMATOR_BRAND.id)throw new DraftError('This project does not belong to this document-service tenant.',403);
 if(draft.uploads.some(u=>u.type!=='application/pdf'))throw new DraftError('Non-PDF sources must be reconciled through mixed-source routing.',422);
 if(!documentServiceEligible(draft.uploads))throw new DraftError('Remote document reading is not enabled for this source. Your files are saved.',503);
 const {tenant,secret,origin,limits}=await checkDocumentServiceReadiness(request,process.env,Math.min(deadline,Date.now()+10000));
 const base=`/v1/projects/${encodeURIComponent(draft.id)}`;
 const send=async(method:string,path:string,body:Buffer=Buffer.alloc(0),contentType='application/json')=>{
  const response=await fetchWithinDeadline(request,origin.origin+origin.pathname.replace(/\/$/,'')+path,{method,headers:{...documentServiceHeaders(method,path,tenant,secret,body),'content-type':contentType},...(method==='POST'?{body:body as unknown as BodyInit}:{}),redirect:'error'},Math.min(deadline,Date.now()+60000));
  let value:any;try{value=await response.json();}catch{throw new DraftError('The document service returned an invalid response. Saved files are preserved.',503);}
  return {ok:response.ok,status:response.status,value};
 };
 const lease=await claimWork(draft.id,workKey,{processing:{},remote:true},150);
 if(!lease)return {pending:true as const,progress:'Your source review is already running.',retryAfterMs:1000};
 const state=lease.payload as {processing?:ProcessingStatus;remote?:boolean};
 const pending=async(progress:string,details:Partial<ProcessingStatus>={},wait=750)=>{
  state.remote=true;state.processing={phase:'reading',message:progress,updatedAt:new Date().toISOString(),...details};
  await writeWork(draft.id,workKey,lease.token,state);
  return {pending:true as const,progress,retryAfterMs:wait};
 };
 try{
  const documents:{id:string;source:string}[]=[],expectedPages=new Set<string>();let complete=true,readPages=0,totalPages=0;
  for(const upload of draft.uploads){
   remainingBudget(deadline);const id=remoteDocumentId(tenant,draft.id,upload.sha256),path=base+'/documents/'+id;
   let response=await send('GET',path);
   if(response.status===404){
    const [file]=await query('SELECT name,mime_type,data_base64,storage_bucket,storage_key,sha256,size_bytes FROM p5_estimator_files WHERE draft_id=$1 AND id=$2',[draft.id,upload.id]);
    if(!file)throw new DraftError('A saved document could not be found. Please retry.',503);
    const bytes=await readStoredBytes(file);if(digest(bytes)!==upload.sha256)throw new DraftError('A saved document failed its integrity check. Please reattach it.',422);
    response=await send('POST',base+'/documents?name='+encodeURIComponent(upload.name),bytes,'application/pdf');
   }
   if(response.status===429||response.status===503)return pending('Your documents are saved. Waiting for reader capacity.',{phase:'queued'},Math.min(10000,response.value.retryAfterMs||2000));
   if(!response.ok)throw new DraftError(`Document reading is unavailable (HTTP ${response.status}). Your uploaded files are saved.`,503);
   if(response.value.id!==id)throw new DraftError('The document service receipt did not match this project.',503);
   validateRemotePageCount(response.value.progress?.totalPages,limits.maxPages);
   if(response.value.state==='failed'){
    if(retryFailed){const retried=await send('POST',path+'/retry');if(!retried.ok)throw new DraftError('The document retry could not start. Your files are saved.',503);return pending('Retrying only the interrupted document stages.',{phase:'retrying'});}
    throw new DraftError('Document processing needs attention. Completed work is saved. Use Retry to resume.',422);
   }
   complete&&=response.value.state==='complete';readPages+=Number(response.value.progress?.checkedPages||0);totalPages+=Number(response.value.progress?.totalPages||0);
   const source=draft.uploads.filter(u=>u.name===upload.name).length>1?`${upload.name} [${upload.id.slice(0,8)}]`:upload.name;
   // Duplicate bytes in the same project are one physical source, even when
   // uploaded twice under different names. They must not multiply quantities.
   if(documents.some(d=>d.id===id)){readPages-=Number(response.value.progress?.checkedPages||0);totalPages-=Number(response.value.progress?.totalPages||0);continue;}
   documents.push({id,source});
   if(response.value.state==='complete'){
    const coverage=response.value.coverage;
     if(!Number.isSafeInteger(response.value.progress?.totalPages)||response.value.progress.totalPages<1||response.value.progress.totalPages>limits.maxPages||!coverage?.complete||!Array.isArray(coverage.pages)||coverage.pages.length!==response.value.progress?.totalPages||coverage.pages.some((p:any,i:number)=>p.page!==i+1||p.status!=='read'))throw new DraftError('Some document pages still need verification or exceed the configured page limit. Your files are saved; an unchecked estimate cannot be submitted.',422);
    for(const page of coverage.pages)expectedPages.add(JSON.stringify([source,page.page]));
   }
  }
  // Queue reconciliation while pages are reading. Once receipts are stored,
  // the worker can finish even when the website or browser stops polling.
  const submitted=await send('POST',base+'/reviews',Buffer.from(JSON.stringify({documents,text,answers})));
  if(submitted.status===429)return pending('Waiting to reconcile the document evidence.',{phase:'queued'},2000);
  if(!submitted.ok||!submitted.value.id)throw new DraftError('Your documents are read, but scope reconciliation could not start. Please retry.',503);
  const review=submitted.value;
  if(review.state==='failed'){
   if(retryFailed){const retried=await send('POST',base+'/reviews/'+review.id+'/retry');if(!retried.ok)throw new DraftError('The scope retry could not start. Your source evidence is saved.',503);return pending('Retrying scope reconciliation without rereading the documents.',{phase:'cross-referencing'});}
    throw new DraftError('Scope reconciliation needs attention. Your source documents are saved.',422);
  }
  if(!complete)return pending(totalPages?`Checked ${readPages} of ${totalPages} pages. Reading source evidence.`:'Preparing your document source records.',{readPages,totalPages});
  if(review.state!=='complete')return pending('Matching the source evidence to your project and checking only missing details.',{phase:'cross-referencing',readPages,totalPages});
   const extraction=retainScopeContext(validateExtraction(review.result),text,answers);
  const coverage=extraction.documentCoverage,seen=new Set<string>();
  if(!coverage?.complete||coverage.expectedPages!==totalPages||coverage.pages.length!==totalPages||coverage.pages.some(p=>{const key=JSON.stringify([p.source,p.page]);if(p.status!=='read'||!expectedPages.has(key)||seen.has(key))return true;seen.add(key);return false;}))throw new DraftError('The returned document coverage did not match the verified uploaded pages.',503);
  return {pending:false as const,version:digest(JSON.stringify([text,answers,draft.uploads.map(f=>[f.id,f.sha256])])),analysis:{extraction,provider:'P5 Document Service',model:VERSION,analyzedAt:new Date().toISOString()}};
 }finally{await releaseWork(draft.id,workKey,lease.token);}
}
