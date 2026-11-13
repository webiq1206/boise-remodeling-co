/**
 * Sitewide conversion copy. One primary CTA, one secondary CTA, used
 * everywhere via the EstimateCTA / ConsultCTA components - do not introduce
 * new label variants for the same action.
 *
 * Owner decision, 13 November 2026: the primary pricing call to action on
 * every P5 family site is the central estimator, framed at /instant-estimate
 * (components/estimator/EstimatorFrame.tsx). It shows a preliminary range on
 * screen, so "instant estimate" is accurate. It is never called a quote, a bid
 * or a final price. "Request a quote" stays as the path to a person: the short
 * request at /#request.
 */
export const CTA_PRIMARY = "Get an instant estimate";
/** Header, mobile menu and bottom bar: it has to fit beside the lockup. */
export const CTA_PRIMARY_SHORT = "Instant estimate";
/** The page that frames the central estimator. */
export const ESTIMATOR_PATH = "/instant-estimate";
/** The path to a person: the short request form on the homepage. */
export const CTA_REQUEST = "Request a quote";
export const REQUEST_PATH = "/#request";

/**
 * Service page slug to the estimator project it opens. A service that is not
 * listed here (ADU, outdoor living, aging in place) has no project in the
 * estimator, so its pages keep "Request a quote": never send a visitor to an
 * estimator that cannot price their project.
 */
export const ESTIMATOR_PROJECT_BY_SERVICE: Readonly<Record<string, string>> = {
  "kitchen-remodel": "kitchen-remodel",
  "bathroom-remodel": "bathroom-remodel",
  "whole-home-remodel": "whole-home",
  "basement-remodel": "basement-finish",
  "room-addition": "addition",
};

/** The estimator page, opened on one project when the estimator has it. */
export function estimatorHref(project?: string | null): string {
  return project && /^[a-z0-9-]{1,40}$/.test(project) ? `${ESTIMATOR_PATH}?project=${project}` : ESTIMATOR_PATH;
}

/**
 * Blog and guide hubs whose subject the estimator has no project for. Their
 * articles keep "Request a quote" as the closing action.
 */
const HUBS_WITHOUT_ESTIMATOR_PROJECT: ReadonlySet<string> = new Set(["outdoor-living"]);

/** Where an article's closing actions lead: the estimator, or the request form. */
export function articleCtaDestination(hubSlug?: string | null): "estimator" | "request" {
  return hubSlug && HUBS_WITHOUT_ESTIMATOR_PROJECT.has(hubSlug) ? "request" : "estimator";
}

export interface PrimaryCta {
  label: string;
  href: string;
  /** "estimator" opens /instant-estimate; "request" is the short request form. */
  kind: "estimator" | "request";
  /** The estimator project the link opens on, when there is one. */
  project: string | null;
}

/**
 * The primary action for a page. No service: the estimator, where the visitor
 * picks a project. A service the estimator prices: the estimator, opened on
 * that project. Any other service: the request form, as before.
 */
export function primaryCtaForService(serviceSlug?: string | null): PrimaryCta {
  if (!serviceSlug) return { label: CTA_PRIMARY, href: ESTIMATOR_PATH, kind: "estimator", project: null };
  const project = ESTIMATOR_PROJECT_BY_SERVICE[serviceSlug];
  return project
    ? { label: CTA_PRIMARY, href: estimatorHref(project), kind: "estimator", project }
    : { label: CTA_REQUEST, href: REQUEST_PATH, kind: "request", project: null };
}
export const CTA_SECONDARY = "Schedule a free visit";
export const CTA_QUOTE = "Request a Quote";
/**
 * Label for every link to /estimate. "Request a quote" has one destination,
 * the short request at /#request. /estimate is the same short request on its
 * own page: it shows no price and runs no estimator, so its links say what it
 * does and never borrow the estimator's wording.
 */
export const CTA_PROJECT_DETAILS = "Send project details";

/**
 * Consultation form: a single, explicit send (no separate review step). Same
 * label as every "Request a quote" link, because it is the same action; the
 * free in-home visit stays as microcopy beside the button, not as a second
 * label.
 */
export const CTA_FORM_SEND = CTA_REQUEST;
/** Reassurance line under the form's send button. */
export const CTA_FORM_MICROCOPY = "Free in-home visit, no obligation. We answer your questions and help you work out the next step.";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_REVIEW = "Review my request";
/** @deprecated Superseded by the single-step CTA_FORM_SEND. */
export const CTA_FORM_CONFIRM = "Confirm and send";
