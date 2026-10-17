/**
 * Google review collection scripts and email templates.
 * Used at final walkthrough (Day 0), follow-up email (Day 1), and reminder (Day 7).
 */

import { GBP_LINKS, GBP_NAP, getGbpReviewUrl } from '@/shared/gbpProfile';
import { SITE_CONFIG } from '@/shared/siteConfig';

export const REVIEW_TARGETS = {
  daysToFirstMilestone: 60,
  reviewsAtMilestone: 10,
  monthsToCompetitiveParity: 12,
  reviewsAtCompetitiveParity: 50,
} as const;

export function buildInPersonAskScript(city: string, projectType: string): string {
  return `Reviews from ${city} homeowners are how neighbors find us. Would you mind sharing what the ${projectType} was like - especially anything about communication or the timeline?`;
}

export function buildReviewResponseTemplate(params: {
  customerName: string;
  city: string;
  projectType: string;
  detailTheyMentioned: string;
}): string {
  const { customerName, city, projectType, detailTheyMentioned } = params;
  return `Thank you, ${customerName}. We enjoyed your ${city} ${projectType} - especially ${detailTheyMentioned}. Glad the weekly updates and written scope kept things clear. - The ${GBP_NAP.name} team`;
}

export function getReviewLink(): string {
  return getGbpReviewUrl() ?? GBP_LINKS.review;
}

export function buildEmailSignatureReviewLine(): string {
  return `Enjoyed your project? Share your experience: ${getReviewLink()}`;
}

export interface ReviewEmailParams {
  customerFirstName: string;
  city: string;
  projectType: string;
}

export function buildDay1ReviewEmail(params: ReviewEmailParams): {
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
} {
  const { customerFirstName, city, projectType } = params;
  const reviewLink = getReviewLink();
  const subject = `Quick favor - how was your ${projectType}?`;
  const preview = `Your ${city} ${projectType} feedback helps neighbors find us.`;

  const bodyText = `Hi ${customerFirstName},

Thank you again for trusting us with your ${projectType} in ${city}. We hope the final walkthrough left everything clear and complete.

If you have a moment, a Google review helps other ${city} homeowners find a remodeling team they can trust. No script needed - whatever stood out to you (communication, timeline, craftsmanship) is perfect.

Leave a review: ${reviewLink}

Questions? Call or text ${GBP_NAP.phone} anytime.

- The Boise Remodeling Co team
${GBP_NAP.name}
${GBP_NAP.phone}
${GBP_NAP.website}`;

  const bodyHtml = `
<p>Hi ${customerFirstName},</p>
<p>Thank you again for trusting us with your ${projectType} in ${city}. We hope the final walkthrough left everything clear and complete.</p>
<p>If you have a moment, a Google review helps other ${city} homeowners find a remodeling team they can trust. No script needed - whatever stood out to you (communication, timeline, craftsmanship) is perfect.</p>
<p><a href="${reviewLink}">Leave a review on Google</a></p>
<p>Questions? Call or text <a href="${SITE_CONFIG.phoneHref}">${GBP_NAP.phone}</a> anytime.</p>
<p>- The Boise Remodeling Co team<br>${GBP_NAP.name}<br>${GBP_NAP.phone}<br><a href="${GBP_NAP.website}">${GBP_NAP.website.replace(/^https?:\/\//, '')}</a></p>`;

  return { subject, preview, bodyText, bodyHtml };
}

export function buildDay7ReviewReminderEmail(params: ReviewEmailParams): {
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
} {
  const { customerFirstName, city, projectType } = params;
  const reviewLink = getReviewLink();
  const subject = `One quick reminder - ${projectType} review`;
  const preview = `A short note if you still have time to share feedback.`;

  const bodyText = `Hi ${customerFirstName},

Just a gentle follow-up from your ${city} ${projectType}. If you are willing to share a quick Google review, it genuinely helps neighbors researching remodelers in the Treasure Valley.

${reviewLink}

Either way, thank you again for choosing ${GBP_NAP.name}.

- The Boise Remodeling Co team
${GBP_NAP.phone}`;

  const bodyHtml = `
<p>Hi ${customerFirstName},</p>
<p>Just a gentle follow-up from your ${city} ${projectType}. If you are willing to share a quick Google review, it genuinely helps neighbors researching remodelers in the Treasure Valley.</p>
<p><a href="${reviewLink}">Leave a review on Google</a></p>
<p>Either way, thank you again for choosing ${GBP_NAP.name}.</p>
<p>- The Boise Remodeling Co team<br>${GBP_NAP.phone}</p>`;

  return { subject, preview, bodyText, bodyHtml };
}

/** SMS closeout text for project manager to send same evening as walkthrough. */
export function buildCloseoutSmsText(city: string, projectType: string): string {
  return `Thanks again for trusting us with your ${projectType} in ${city}. If you have 2 minutes, a Google review helps neighbors find us: ${getReviewLink()}`;
}
