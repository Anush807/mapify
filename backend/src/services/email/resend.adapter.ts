import { Resend } from 'resend';
import { env } from '../../config/env';
import { EmailProviderError, type EmailAdapter, type EmailMessage } from './types';

let client: Resend | null = null;

function getClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new EmailProviderError('resend', 'RESEND_API_KEY is not configured');
  }
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export const resendAdapter: EmailAdapter = {
  name: 'resend',

  async send(message: EmailMessage): Promise<void> {
    try {
      const { error } = await getClient().emails.send({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      // Resend reports failures in the payload rather than by throwing.
      if (error) throw new EmailProviderError('resend', error.message);
    } catch (err) {
      if (err instanceof EmailProviderError) throw err;
      throw new EmailProviderError('resend', describe(err), { cause: err });
    }
  },
};

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default resendAdapter;
