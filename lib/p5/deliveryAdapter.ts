import {safeEmailReplyTo} from './emailReplyTo.ts';
import { getUncachableEmailClient } from "../../server/services/emailTransport";
import { getAdminRecipientEmails,formatFromAddress } from "../../server/services/emailLayout";
import { ESTIMATOR_BRAND as brand } from "./brand.ts";
export async function adminRecipients(){return [...new Set(await getAdminRecipientEmails(brand.email))];}
export const EMAIL_SUPPORTS_IDEMPOTENCY=true;
export async function sendEmail(input:{to:string;replyTo?:string;subject:string;text:string;html?:string;attachments:{filename:string;content:Buffer;contentType?:string}[];key:string}){
  const {client,fromEmail}=await getUncachableEmailClient();
  const sender=client.emails as unknown as {send:(body:unknown,options:unknown)=>Promise<any>};
  const result=await sender.send({from:formatFromAddress(fromEmail),to:input.to,replyTo:safeEmailReplyTo(input.replyTo,brand.email),subject:input.subject,text:input.text,html:input.html,attachments:input.attachments},{idempotencyKey:input.key});
  if(result?.error)throw new Error("Email provider rejected delivery");
  const id=result?.data?.id||result?.id;
  if(!id||id==="noop"||result?.skipped)throw new Error("Email delivery is not configured");
  return String(id);
}
/**
 * The CRM delivery of a published estimate (the outbox's `crm` job, queued while `P5_CRM_DELIVERY`
 * is `on`). Owner decisions, 13, 17 and 18 November 2026: the estimate is posted to P5 Home Co's
 * lead intake, where it joins the lead the visitor's project request made and becomes the
 * QuickBooks customer and an UNSENT estimate. The shared `forwardEstimateToP5()` builds the post:
 * form `p5-estimator`, `estimate` of kind `document` with customer amounts only, and
 * `team_alert: "site"`, because this site has already emailed the team its internal estimate
 * record. It throws a short error when P5 does not accept the post, so the outbox marks the job
 * for review. The old lead dashboard is no longer called from here.
 *
 * The forwarder is loaded on demand, never as a static import: the mail paths of this adapter
 * load nothing new, and tests/p5-intake-reply-to.test.ts runs this file with a fixed dependency
 * list. `options` is a test seam (a fake fetch, another address); the outbox passes none.
 */
export async function syncCrm(record:any,key:string,options:{fetch?:typeof fetch;url?:string}={}){
  const {forwardEstimateToP5}=await import('./p5LeadIntake.ts');
  return forwardEstimateToP5(record,key,{brand:brand.name,fetch:options.fetch,url:options.url});
}
/** Synchronous readiness only: the Resend key or the Replit connector identity must be present before an intake notification is attempted. */
export function emailTransportReady(){return Boolean(process.env.RESEND_API_KEY||(process.env.REPLIT_CONNECTORS_HOSTNAME&&(process.env.REPL_IDENTITY||process.env.WEB_REPL_RENEWAL)));}
