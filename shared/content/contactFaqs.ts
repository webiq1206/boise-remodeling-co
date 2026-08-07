import { TREASURE_VALLEY_CITIES } from "../contentData";

/**
 * The questions every channel answers the same way.
 *
 * Extracted from the contact page so the estimating assistant, the contact
 * page and the FAQ schema all speak from one list. If an answer changes -
 * response time, service area, permit handling - it changes here, once, and
 * no surface can drift from another.
 */
export const CONTACT_FAQS: { question: string; answer: string }[] = [
  {
    question: "How quickly will you respond to my inquiry?",
    answer:
      "We respond within one business day. Call us during business hours for an immediate conversation, or submit the form and we will reach out to schedule your free in-home visit.",
  },
  {
    question: "Is the in-home consultation really free?",
    answer:
      "Yes. Your 60 to 90 minute in-home visit is free with no obligation. You leave with planning guidance, design direction, and an honest project range - never a high-pressure sales pitch.",
  },
  {
    question: "What areas do you serve?",
    answer: `We serve ${TREASURE_VALLEY_CITIES}, and surrounding Treasure Valley communities across Ada and Canyon County.`,
  },
  {
    question: "Do you handle permits?",
    answer:
      "Yes. Permits are included in our design-build scope and handled in-house for both Ada and Canyon County jurisdictions.",
  },
  {
    question: "How do I get a cost estimate for my project?",
    answer:
      "Use our online project estimator for an instant planning range, then book a free in-home visit for a written scope tailored to your home.",
  },
];
