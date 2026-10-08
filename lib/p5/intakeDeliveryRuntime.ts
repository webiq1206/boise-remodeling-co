import {prepareIntakeEmail} from './intakeEmailDelivery.ts';
import {readStoredBytes} from './objectStorage.ts';
import {linkSecret} from './estimateLinks.ts';
import {query} from './database.ts';
import {ESTIMATOR_BRAND} from './brand.ts';
import {intakeSite} from './intakePolicy.ts';
import {intakeDeliveryWorker,type IntakeTransport} from './intakeDelivery.ts';
import {INTAKE_RUNTIME_PROOF} from './intakeDeliveryPolicy.ts';
import {suppressSyntheticEstimateNotifications} from './estimatorNotifications.ts';
import {qaOperationContext} from './qaOperationContext.ts';
import {projectReviewTransport} from './intakeProjectReview.ts';

/** Existing adapters only. Configuration values and provider errors never enter status payloads.
 * Runtime proof is a reviewed source gate, not a user-supplied option or a credential toggle.
 * This specialty site emails the customer and its own team through the brand's existing
 * transport, and hands the unpriced request to the shared project_review_v1 receiver. */
export async function runtimeIntakeTransports():Promise<Record<'customer'|'team'|'crm',IntakeTransport>>{
 const email:IntakeTransport={retryWindowMs:0,identityScope:`${ESTIMATOR_BRAND.id}-email-no-automatic-replay`,
  // The brand adapter owns transport configuration. Loaded lazily, like send, so an
  // isolated harness that replaces the adapter never needs the site's email modules.
  readiness:async()=>{const adapter=await import('./deliveryAdapter.ts');if(typeof adapter.emailTransportReady!=='function'||!adapter.emailTransportReady())return 'configuration-missing';return INTAKE_RUNTIME_PROOF.email?null:'runtime-proof-pending';},
  prepare:(snapshot,envelope)=>prepareIntakeEmail(snapshot,envelope,{query,readBytes:readStoredBytes,secret:linkSecret}),
  send:async envelope=>{if(!envelope.email)throw new Error('payload-review');const {sendEmail}=await import('./deliveryAdapter.ts');return sendEmail({...envelope.email,attachments:envelope.email.attachments.map(f=>({filename:f.filename,content:Buffer.from(f.base64,'base64')})),key:envelope.key});},
 };
 // The same lead-dashboard setting and credential the priced estimator already uses; the
 // verified receiver endpoint is resolved by the transport, never by an environment override.
 const crm=projectReviewTransport({enabled:process.env.P5_CRM_DELIVERY==='on',token:process.env.LEAD_DASHBOARD_KEY||'',url:process.env.LEAD_DASHBOARD_API_URL||ESTIMATOR_BRAND.crmUrl,proof:INTAKE_RUNTIME_PROOF.crm,qaAllowlist:process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST||''});
 return {customer:email,team:email,crm};
}
export async function processIntakeDeliveries(limit=2){
 if(qaOperationContext())return {processed:0};
 const site=intakeSite(ESTIMATOR_BRAND.id);if(!site)return {processed:0};
 return intakeDeliveryWorker({query,site,transports:await runtimeIntakeTransports(),suppressed:suppressSyntheticEstimateNotifications}).run(limit);
}
