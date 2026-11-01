/**
 * Sitewide conversion copy. One primary CTA, one secondary CTA, used
 * everywhere via the EstimateCTA / ConsultCTA components - do not introduce
 * new label variants for the same action.
 * D5 / Phase 8: public pricing tool is gone; the ask is a short quote request.
 */
export const CTA_PRIMARY = "Request a quote";
export const CTA_PRIMARY_SHORT = "Request a quote";
export const CTA_SECONDARY = "Schedule a free visit";
export const CTA_QUOTE = "Request a Quote";
/**
 * Label for every link to /estimate. "Request a quote" has one destination,
 * the short request at /#request (header, bottom bar and every other "Request
 * a quote"). /estimate is the six-step request with photos: it shows no price
 * and runs no estimator, so its links say what it does and promise no instant
 * or online estimate.
 */
export const CTA_PROJECT_DETAILS = "Send project details";

/**
 * Consultation form: a single, explicit send (no separate review step). Same
 * label as the primary CTA, because it is the same action; the free in-home
 * visit stays as microcopy beside the button, not as a second label.
 */
export const CTA_FORM_SEND = CTA_PRIMARY;
/** Reassurance line under the form's send button. */
export const CTA_FORM_MICROCOPY = "Free in-home visit, no obligation. We respond within one business day.";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_REVIEW = "Review my request";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_CONFIRM = "Confirm and send";
