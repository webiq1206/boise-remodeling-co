import {projectRequestHold} from './p5LeadIntake.ts';
import type {IntakeDeliveryEnvelope} from './intakeDeliveryPayload.ts';
import type {IntakeDeliveryReason} from './intakeDeliveryPolicy.ts';

/** This site has no lead system of its own: an unpriced project request is posted to P5 Home Co's
 * lead intake (intakeDeliveryRuntime.ts). So the contract check for this site's CRM channel is the
 * shared, facts-only one that transport runs before it posts: a synthetic QA request, a request
 * nobody can be reached about and an envelope that is not this request are held, and nothing is
 * sent. It reads the frozen envelope only: no I/O and no side effects. */
export function validateIntakeLocalCrm(envelope:IntakeDeliveryEnvelope):IntakeDeliveryReason|null{
 return projectRequestHold(envelope);
}
