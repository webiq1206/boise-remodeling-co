import { SITE_CONFIG, textReplyLineHtml } from '@/shared/siteConfig';
import {
  escapeHtml,
  wrapEmailHtml,
  htmlToPlainText,
  getAdminRecipientEmails,
  formatFromAddress,
  getReplyToAddress,
  SITE_BASE_URL,
} from '@/server/services/emailLayout';
import { getUncachableEmailClient } from '@/server/services/emailTransport';

async function getUncachableResendClient() {
  return getUncachableEmailClient();
}

const BLOCKED_EMAIL_DOMAINS = ['timberandlove.com'];

function isBlockedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return BLOCKED_EMAIL_DOMAINS.some(d => domain === d);
}

function filterBlockedRecipients(to: string | string[]): string[] {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients.filter(email => {
    if (isBlockedEmail(email)) {
      console.log(`[RESEND] Blocked email to ${email} (domain on blocklist)`);
      return false;
    }
    return true;
  });
}

async function sendEmailWithLogging(
  client: { emails: { send: (args: any) => Promise<any> } },
  from: string,
  to: string | string[],
  subject: string,
  html: string,
  label: string
): Promise<boolean> {
  try {
    const filteredTo = filterBlockedRecipients(to);
    if (filteredTo.length === 0) {
      console.log(`[RESEND] ${label} skipped: all recipients blocked`);
      return true;
    }
    const result = await client.emails.send({
      from: formatFromAddress(from),
      replyTo: getReplyToAddress(),
      to: filteredTo.length === 1 ? filteredTo[0] : filteredTo,
      subject,
      html,
      text: htmlToPlainText(html),
    });
    
    const quota = (result as any)?.headers?.['x-resend-daily-quota'];
    const errorData = (result as any)?.error;
    
    if (errorData) {
      console.error(`[RESEND] ${label} API error:`, JSON.stringify(errorData));
      return false;
    }
    
    const emailId = (result as any)?.data?.id;
    console.log(`[RESEND] ${label} sent successfully. ID: ${emailId}, To: ${Array.isArray(to) ? to.join(', ') : to}`);
    if (quota !== undefined) {
      console.log(`[RESEND] Daily quota remaining: ${quota}`);
    }
    return true;
  } catch (error: any) {
    console.error(`[RESEND] ${label} FAILED:`, error?.message || error);
    if (error?.statusCode) console.error(`[RESEND] Status code: ${error.statusCode}`);
    return false;
  }
}

export async function sendQuoteConfirmationEmail(data: {
  to: string;
  customerName: string;
  quoteId: string;
  address: string;
  city: string;
  services: string[];
  frequency: string;
  serviceFrequencies?: Record<string, string>;
}) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const servicesHtml = data.services.map(s => 
    `<li style="padding: 4px 0;">${escapeHtml(formatServiceName(s))}</li>`
  ).join('');

  const html = wrapEmailHtml({
    title: 'Thank You for Your Quote Request!',
    subtitle: `Reference: ${data.quoteId.slice(0, 8)}`,
    content: `
      <p class="greeting">Hi ${escapeHtml(data.customerName)},</p>
      <p>Thank you for requesting a quote from Boise Remodeling Co! We've received your request and will be in touch within one business day to schedule your free consultation.</p>
      ${textReplyLineHtml()}
      <div class="highlight-box">
        <h3 style="margin: 0 0 15px 0; color: inherit;">Quote Details</h3>
        <p style="margin: 0 0 8px 0;"><strong>Reference:</strong> ${escapeHtml(data.quoteId.slice(0, 8))}</p>
        <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${escapeHtml(data.address)}, ${escapeHtml(data.city)}, Idaho</p>
        ${buildResendFrequencyHtml(data.services, data.frequency, data.serviceFrequencies)}
        <p style="margin: 0 0 8px 0;"><strong>Services:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">${servicesHtml}</ul>
      </div>
      <p>If you have any questions in the meantime, feel free to call us at <a href="${SITE_CONFIG.phoneHref}">${escapeHtml(SITE_CONFIG.phone)}</a>, <a href="${SITE_CONFIG.phoneSmsHref}">send us a text</a>, or reply to this email.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${SITE_BASE_URL}" class="cta-button">Visit Our Website</a>
      </div>
    `,
  });

  const sent = await sendEmailWithLogging(
    client,
    fromEmail,
    data.to,
    `Quote Request Received - Boise Remodeling Co (Ref: ${data.quoteId.slice(0, 8)})`,
    html,
    'Customer confirmation'
  );
  if (!sent) throw new Error('Failed to send customer email');
}

export async function sendAdminNotificationEmail(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteId: string;
  address: string;
  city: string;
  services: string[];
  frequency: string;
  message?: string;
  propertySize?: number;
  serviceFrequencies?: Record<string, string>;
}) {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const servicesHtml = data.services.map(s => 
    `<li style="padding: 4px 0;">${escapeHtml(formatServiceName(s))}</li>`
  ).join('');

  const html = wrapEmailHtml({
    title: 'New Quote Request!',
    subtitle: `${escapeHtml(data.customerName)} - ${escapeHtml(data.city)}`,
    content: `
      <div class="warning-box">
        <p><strong>New lead received!</strong></p>
      </div>
      <div class="section">
        <h2 class="section-title">Customer Information</h2>
        <table class="info-table">
          <tr><td class="label">Name:</td><td class="value">${escapeHtml(data.customerName)}</td></tr>
          <tr><td class="label">Email:</td><td class="value"><a href="mailto:${escapeHtml(data.customerEmail)}">${escapeHtml(data.customerEmail)}</a></td></tr>
          <tr><td class="label">Phone:</td><td class="value"><a href="${SITE_CONFIG.phoneHref}">${escapeHtml(data.customerPhone)}</a></td></tr>
          <tr><td class="label">Address:</td><td class="value">${escapeHtml(data.address)}, ${escapeHtml(data.city)}, Idaho</td></tr>
          ${data.propertySize ? `<tr><td class="label">Property Size:</td><td class="value">${data.propertySize.toLocaleString()} sq ft</td></tr>` : ''}
        </table>
      </div>
      <div class="section">
        <h2 class="section-title">Quote Details</h2>
        <table class="info-table">
          <tr><td class="label">Reference:</td><td class="value">${escapeHtml(data.quoteId)}</td></tr>
          ${buildResendFrequencyTableRow(data.services, data.frequency, data.serviceFrequencies)}
          <tr>
            <td class="label" style="vertical-align: top;">Services:</td>
            <td class="value"><ul style="margin: 0; padding-left: 20px;">${servicesHtml}</ul></td>
          </tr>
        </table>
      </div>
      ${data.message ? `
      <div class="highlight-box">
        <strong>Customer Notes:</strong>
        <p style="margin: 8px 0 0 0;">${escapeHtml(data.message)}</p>
      </div>
      ` : ''}
      <div style="text-align: center; margin-top: 30px;">
        <a href="${SITE_BASE_URL}/admin" class="cta-button">View in Admin Dashboard</a>
      </div>
    `,
  });

  const subject = `New Quote: ${data.customerName} - ${data.city} (${data.services.length} services)`;
  const adminEmails = await getAdminRecipientEmails(SITE_CONFIG.email);
  let anySuccess = false;

  for (let i = 0; i < adminEmails.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 700));
    const sent = await sendEmailWithLogging(
      client,
      fromEmail,
      adminEmails[i],
      subject,
      html,
      `Admin notification (${adminEmails[i]})`
    );
    if (sent) anySuccess = true;
  }

  if (!anySuccess) {
    throw new Error('Failed to send admin notification to any admin email');
  }
}

function formatServiceName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatFrequency(freq: string): string {
  const frequencies: Record<string, string> = {
    'one-time': 'One-time',
    'weekly': 'Weekly',
    'bi-weekly': 'Every 2 weeks',
    'monthly': 'Monthly'
  };
  return frequencies[freq] || freq;
}

const RESEND_RECURRING_ELIGIBLE = new Set<string>([]);

function getPerServiceFrequencies(
  services: string[],
  frequency: string,
  serviceFrequencies?: Record<string, string>,
): Array<{ name: string; freq: string }> {
  return services.map(sid => {
    let svcFreq = serviceFrequencies?.[sid] || frequency || "one-time";
    if (svcFreq !== "one-time" && !RESEND_RECURRING_ELIGIBLE.has(sid)) {
      svcFreq = "one-time";
    }
    return { name: formatServiceName(sid), freq: svcFreq };
  });
}

function buildResendFrequencyHtml(
  services: string[],
  frequency: string,
  serviceFrequencies?: Record<string, string>,
): string {
  const perService = getPerServiceFrequencies(services, frequency, serviceFrequencies);
  const uniqueFreqs = new Set(perService.map(s => s.freq));

  if (uniqueFreqs.size <= 1) {
    return `<p style="margin: 0 0 8px 0;"><strong>Frequency:</strong> ${escapeHtml(formatFrequency(perService[0]?.freq || frequency))}</p>`;
  }

  const lines = perService.map(s =>
    `<li style="padding: 2px 0;">${escapeHtml(s.name)}: <strong>${escapeHtml(formatFrequency(s.freq))}</strong></li>`
  ).join('');
  return `<p style="margin: 0 0 4px 0;"><strong>Frequency:</strong></p><ul style="margin: 0 0 8px 0; padding-left: 20px;">${lines}</ul>`;
}

function buildResendFrequencyTableRow(
  services: string[],
  frequency: string,
  serviceFrequencies?: Record<string, string>,
): string {
  const perService = getPerServiceFrequencies(services, frequency, serviceFrequencies);
  const uniqueFreqs = new Set(perService.map(s => s.freq));

  if (uniqueFreqs.size <= 1) {
    return `<tr><td class="label">Frequency:</td><td class="value">${escapeHtml(formatFrequency(perService[0]?.freq || frequency))}</td></tr>`;
  }

  const lines = perService.map(s =>
    `<li style="padding: 2px 0;">${escapeHtml(s.name)}: <strong>${escapeHtml(formatFrequency(s.freq))}</strong></li>`
  ).join('');
  return `<tr><td class="label" style="vertical-align: top;">Frequency:</td><td class="value"><ul style="margin: 0; padding-left: 20px;">${lines}</ul></td></tr>`;
}
