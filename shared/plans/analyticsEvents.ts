/**
 * The plans estimator funnel, as named events.
 *
 * Same reasoning as RE10_EVENTS: a funnel is only useful if the names are
 * stable, and a rename six months from now splits the history into two
 * unrelated series with no error anywhere to tell you. Every name lives here
 * once and the call sites reference it.
 *
 * One event here has no RE-10 equivalent and is the most interesting number on
 * the page. `totalSqFtSupplied` records that someone answered the square
 * footage question, which is the single input standing between a good read and
 * a tightened price. If that stage leaks, the feature does not work, and no
 * other event would show it.
 */
export const PLAN_EVENTS = {
  /** The wizard became visible and interactive. */
  started: "plans_estimator_started",
  /** Drawings chosen, before analysis runs. */
  plansUploaded: "plans_uploaded",
  /** Analysis returned measurements. */
  analysisCompleted: "plans_analysis_completed",
  /** Analysis failed, was unavailable, or the set was too heavy to read. */
  analysisFailed: "plans_analysis_failed",
  /** The read could not be trusted to tighten a price, and we said so. */
  narrowingBlocked: "plans_narrowing_blocked",
  /** The customer gave us the total conditioned area. The cross-check. */
  totalSqFtSupplied: "plans_total_sqft_supplied",
  /** Measurements confirmed, moving to the contact step. */
  measurementsConfirmed: "plans_measurements_confirmed",
  /** The contact step rendered. The denominator for gate abandonment. */
  contactViewed: "plans_contact_viewed",
  /** Contact details submitted. */
  contactSubmitted: "plans_contact_submitted",
  /** A range was produced and shown. */
  estimateGenerated: "plans_estimate_generated",
  /** The customer copy was sent. */
  estimateEmailed: "plans_estimate_emailed",
  /** Consultation requested from the result screen. */
  consultationRequested: "plans_consultation_requested",
} as const;

export type PlanEventName = (typeof PLAN_EVENTS)[keyof typeof PLAN_EVENTS];

/** Funnel order, so a report can be built by walking this rather than guessing. */
export const PLAN_FUNNEL: PlanEventName[] = [
  PLAN_EVENTS.started,
  PLAN_EVENTS.plansUploaded,
  PLAN_EVENTS.analysisCompleted,
  PLAN_EVENTS.totalSqFtSupplied,
  PLAN_EVENTS.measurementsConfirmed,
  PLAN_EVENTS.contactViewed,
  PLAN_EVENTS.contactSubmitted,
  PLAN_EVENTS.estimateGenerated,
];
