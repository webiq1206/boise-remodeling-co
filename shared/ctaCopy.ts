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

/** Consultation form: a single, explicit send (no separate review step). */
export const CTA_FORM_SEND = "Schedule my free visit";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_REVIEW = "Review my request";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_CONFIRM = "Confirm and send";
