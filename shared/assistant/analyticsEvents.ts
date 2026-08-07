/**
 * The assistant funnel, as named events. Same reasoning as RE10_EVENTS and
 * PLAN_EVENTS: stable names, defined once, referenced everywhere.
 */
export const ASSISTANT_EVENTS = {
  /** The chat panel was opened. */
  opened: "assistant_opened",
  /** A visitor message was sent to the route. */
  messageSent: "assistant_message_sent",
  /** A reply arrived. */
  replyReceived: "assistant_reply_received",
  /** A reply carried a fresh engine-priced estimate. */
  estimatePresented: "assistant_estimate_presented",
  /** capture_lead succeeded; the lead is in the pipeline. */
  leadCaptured: "assistant_lead_captured",
  /** The route answered unavailable/busy and the fallback was shown. */
  unavailable: "assistant_unavailable",
  /** The visitor jumped from chat to the estimator page. */
  handoffEstimator: "assistant_handoff_estimator",
} as const;
