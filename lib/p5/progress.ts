import {PLAN_EVENTS} from '../../shared/plans/analyticsEvents';
import {reportEstimatorProgress} from "../estimatorSession";
import type {BrowserDraft} from './browserDraft';
export const RE10_EVENTS={started:'re10_estimator_started',documentUploaded:'re10_document_uploaded',analysisCompleted:'re10_analysis_completed',analysisFailed:'re10_analysis_failed',repairsConfirmed:'re10_repairs_confirmed',contactViewed:'re10_contact_viewed',contactSubmitted:'re10_contact_submitted',estimateGenerated:'re10_estimate_generated',estimateEmailed:'re10_estimate_emailed',onsiteRequested:'re10_onsite_requested',additionalDocuments:'re10_additional_documents'} as const;
export function trackScopeEvent(event:keyof typeof RE10_EVENTS,service?:string){
  if(typeof window==='undefined')return;
  const isPlans=window.location.pathname==='/remodel-plans-boise';
  const planEvent=({started:PLAN_EVENTS.started,documentUploaded:PLAN_EVENTS.plansUploaded,additionalDocuments:PLAN_EVENTS.plansUploaded,analysisCompleted:PLAN_EVENTS.analysisCompleted,analysisFailed:PLAN_EVENTS.analysisFailed,repairsConfirmed:PLAN_EVENTS.measurementsConfirmed,contactViewed:PLAN_EVENTS.contactViewed,contactSubmitted:PLAN_EVENTS.contactSubmitted,estimateGenerated:PLAN_EVENTS.estimateGenerated,estimateEmailed:PLAN_EVENTS.estimateEmailed,onsiteRequested:PLAN_EVENTS.consultationRequested} as const)[event];
  const name=isPlans?planEvent:service==='re10'?RE10_EVENTS[event]:'p5_estimator_'+event;
  try{(window as any).gtag?.('event',name,{service:service||'unknown',estimator:'unified'});}catch{}
}
export function reportProgress(d:BrowserDraft,status:'active'|'completed'){
  if(typeof window!=='undefined'&&window.location.pathname==='/remodel-plans-boise'&&d.answers.sqft){try{(window as any).gtag?.('event',PLAN_EVENTS.totalSqFtSupplied,{estimator:'unified'});}catch{}}
  if(typeof window!=='undefined'&&window.location.pathname==='/remodel-plans-boise'&&d.extraction?.reviewNotes.length){try{(window as any).gtag?.('event',PLAN_EVENTS.narrowingBlocked,{estimator:'unified'});}catch{}}
  reportEstimatorProgress({flow:d.answers.service==='re10'?'re10':'estimate',currentStep:['project','details','contact'][d.step]||'project',currentStepIndex:d.step,totalSteps:3,selections:{project:d.answers.service||'',sqft:d.answers.sqft||'',finish:d.answers.finish||'',files:d.uploads?.length||0},status});
}
