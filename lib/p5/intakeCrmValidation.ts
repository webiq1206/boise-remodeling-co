import {validateIntakeProjectReview} from './intakeProjectReview.ts';
import type {IntakeDeliveryEnvelope} from './intakeDeliveryPayload.ts';
import type {IntakeDeliveryReason} from './intakeDeliveryPolicy.ts';

/** This specialty site has no local lead receiver: unpriced requests travel to the shared
 * project_review_v1 receiver, so the contract check is that receiver's own validation. */
export function validateIntakeLocalCrm(envelope:IntakeDeliveryEnvelope):IntakeDeliveryReason|null{
 return validateIntakeProjectReview(envelope,process.env.SYNTHETIC_QA_EMAIL_ALLOWLIST||'');
}
