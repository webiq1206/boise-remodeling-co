import { Resend } from 'resend';
import { checkedEmailSender } from '../../lib/emailDelivery';
import { PLATFORM_EMAIL } from './emailLayout';

/**
 * Outbound email transport backed by Resend. The API key is read from the
 * RESEND_API_KEY secret, falling back to the Replit "resend" connector. The
 * visible From address is the verified Resend sender (hello@boiseremodeling.co).
 */

async function getResendApiKey(): Promise<string> {
  if (process.env.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }
  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        Accept: 'application/json',
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Resend connector API error: ${response.status}`);
  }

  const data = await response.json();
  const apiKey = data.items?.[0]?.settings?.api_key;

  if (!apiKey) {
    throw new Error(
      'Resend not connected. Please add RESEND_API_KEY to your secrets or connect the Resend integration.'
    );
  }

  return apiKey;
}

type EmailSendResult = { data: { id: string } | null; error: { message: string } | null };

type EmailClient = {
  __noop?: boolean;
  emails: {
    send: (args: {
      from: string;
      to: string | string[];
      replyTo?: string;
      subject: string;
      html: string;
      text?: string;
      /**
       * Files sent with the message. Resend takes `content` as a Buffer or a
       * base64 string. Used so an RE-10 reaches the team as an attachment
       * rather than as a link into an upload store that does not outlive a
       * deploy.
       */
      attachments?: { filename: string; content: Buffer | string }[];
    }) => Promise<EmailSendResult>;
  };
};

let warnedNoEmailConfig = false;

/**
 * Returns an email client whose `emails.send` delivers through Resend.
 * In non-production environments without an API key, returns a no-op client
 * so local runs don't attempt real sends.
 */
export async function getUncachableEmailClient(): Promise<{
  client: EmailClient;
  fromEmail: string;
}> {
  try {
    const apiKey = await getResendApiKey();
    const client = new Resend(apiKey);
    client.emails.send = checkedEmailSender(client.emails.send.bind(client.emails), 'boiseremodeling.co');
    return {
      client: client as unknown as EmailClient,
      fromEmail: PLATFORM_EMAIL,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      if (!warnedNoEmailConfig) {
        warnedNoEmailConfig = true;
        console.warn(
          '[email] Resend not configured; outgoing emails will be skipped in this environment.'
        );
      }
      return {
        client: {
          __noop: true,
          emails: {
            send: async () => { throw new Error('Email delivery is not configured'); },
          },
        },
        fromEmail: PLATFORM_EMAIL,
      };
    }
    throw error;
  }
}
