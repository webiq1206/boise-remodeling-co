'use client';
import {EstimateCalculator} from '@/components/EstimateCalculator';
import {approvedBrand} from './brand';
/** Native estimator: keep the existing engine, storage, uploads, forms and tracking. */
export function ApprovedEstimate(){
 return <section className="approved-estimate" aria-labelledby="approved-estimate-title"><div className="approved-estimate-intro"><div><p className="f-eyebrow">YOUR PROJECT. ESTIMATED ONLINE.</p><h2 id="approved-estimate-title">Start with an idea.<br/>See what it could cost.</h2></div><div><p>{approvedBrand.estimateIntro}</p><p className="approved-estimate-note">Add plans or photos when you have them. Your preliminary estimate is subject to confirmed scope, selections, and site conditions.</p></div></div><div className="approved-native-estimator"><EstimateCalculator sectionId="calculator" headingAs="h2"/></div></section>;
}
