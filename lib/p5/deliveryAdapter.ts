import { getUncachableEmailClient } from "../../server/services/emailTransport";
import { getAdminRecipientEmails,formatFromAddress } from "../../server/services/emailLayout";
import { ESTIMATOR_BRAND as brand } from "./brand.ts";
import {buildCrmPayload,crmPayloadBytes,CRM_PAYLOAD_LIMIT_BYTES,CRM_RESPONSE_LIMIT_BYTES,readBoundedCrmResponse,safeCrmContentClass,safeCrmResponseShape} from "./crmPayload.ts";
export async function adminRecipients(){return [...new Set(await getAdminRecipientEmails(brand.email))];}
export const EMAIL_SUPPORTS_IDEMPOTENCY=true;
export async function sendEmail(input:{to:string;subject:string;text:string;html?:string;attachments:{filename:string;content:Buffer}[];key:string}){
  const {client,fromEmail}=await getUncachableEmailClient();
  const sender=client.emails as unknown as {send:(body:unknown,options:unknown)=>Promise<any>};
  const result=await sender.send({from:formatFromAddress(fromEmail),to:input.to,replyTo:brand.email,subject:input.subject,text:input.text,html:input.html,attachments:input.attachments},{idempotencyKey:input.key});
  if(result?.error)throw new Error("Email provider rejected delivery");
  const id=result?.data?.id||result?.id;
  if(!id||id==="noop"||result?.skipped)throw new Error("Email delivery is not configured");
  return String(id);
}
export async function syncCrm(record:any,key:string){
  const token=process.env.LEAD_DASHBOARD_KEY;if(!token)throw new Error("CRM synchronization is not configured");
  const payload=buildCrmPayload(record,key,brand.domain);const payloadBytes=crmPayloadBytes(payload);
  const response=await fetch(process.env.LEAD_DASHBOARD_API_URL||brand.crmUrl,{
    method:"POST",signal:AbortSignal.timeout(20000),headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"Idempotency-Key":key},
    body:JSON.stringify(payload),
  });
  const responseBody=await readBoundedCrmResponse(response);
  if(responseBody.oversized)throw new Error(`CRM response exceeded safe limit; acknowledgement requires reconciliation (payloadBytes=${payloadBytes}, responseBytesAtLeast=${responseBody.bytes}, responseLimit=${CRM_RESPONSE_LIMIT_BYTES})`);
  const responseText=responseBody.text;let body:any={};try{body=responseText?JSON.parse(responseText):{};}catch{}
  if(!response.ok){
    throw new Error(`CRM returned HTTP ${response.status} (payloadBytes=${payloadBytes}, payloadLimit=${CRM_PAYLOAD_LIMIT_BYTES}, responseBytes=${responseBody.bytes}, responseClass=${safeCrmContentClass(response.headers.get("content-type"))}, responseShape=${safeCrmResponseShape(body)})`);
  }
  if(body.success===false||body.accepted===false&&!body.duplicate)throw new Error(`CRM did not accept the estimate (payloadBytes=${payloadBytes})`);
  const id=body.leadId||body.id||body.lead?.id||body.dealId;
  if(!id)throw new Error("CRM acknowledged without a record identifier; verify before retrying");
  return String(id);
}
