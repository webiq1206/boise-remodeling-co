import { getUncachableEmailClient } from "../../server/services/emailTransport";
import { getAdminRecipientEmails,formatFromAddress } from "../../server/services/emailLayout";
import { ESTIMATOR_BRAND as brand } from "./brand";
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
  const range=record.customer.range;
  const response=await fetch(process.env.LEAD_DASHBOARD_API_URL||brand.crmUrl,{
    method:"POST",signal:AbortSignal.timeout(20000),headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,"Idempotency-Key":key},
    body:JSON.stringify({fullName:record.contact.name,email:record.contact.email,phone:record.contact.phone,
      source:brand.domain,externalLeadId:key,inquiryId:record.draftId,
      propertyAddress:record.scope.answers.address||undefined,city:record.scope.answers.location||undefined,
      projectTypes:[record.scope.answers.service],projectScope:record.customer.summary.slice(0,1900),
      estimate:{brand:brand.name,estimator:"p5-policy",id:record.draftId,scope:record.scope,internal:record.internal,customer:record.customer},
      estimateSummary:JSON.stringify(record.internal).slice(0,19000),
      estimateLow:range?.low,estimateHigh:range?.high,estimateRange:range?`$${range.low} to $${range.high}`:undefined,
    }),
  });
  if(!response.ok)throw new Error(`CRM returned HTTP ${response.status}`);
  const body=await response.json();if(body.success===false||body.accepted===false&&!body.duplicate)throw new Error("CRM did not accept the estimate");
  const id=body.leadId||body.id||body.lead?.id||body.dealId;
  if(!id)throw new Error("CRM acknowledged without a record identifier; verify before retrying");
  return String(id);
}
