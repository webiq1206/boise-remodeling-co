import { getUncachableEmailClient } from "../../server/services/emailTransport";
import { getAdminRecipientEmails,formatFromAddress } from "../../server/services/emailLayout";
import { ESTIMATOR_BRAND as brand } from "./brand.ts";
import {buildCrmPayload} from "./crmPayload.ts";
import {crmIdentity,deliverKeyedCrm} from "./keyedCrm.ts";
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
  const identity=crmIdentity(record,key,brand.domain);
  const payload={...buildCrmPayload(record,identity.externalLeadId,brand.domain),...identity};
  return deliverKeyedCrm(payload,key,process.env.LEAD_DASHBOARD_KEY||'',process.env.LEAD_DASHBOARD_API_URL||brand.crmUrl);
}
