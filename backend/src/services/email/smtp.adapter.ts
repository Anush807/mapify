import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { EmailProviderError, type EmailAdapter, type EmailMessage } from './types';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    throw new EmailProviderError('smtp', 'SMTP_HOST and SMTP_PORT are not configured');
  }

  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // 465 is implicit TLS; everything else negotiates STARTTLS.
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  return transporter;
}

export const smtpAdapter: EmailAdapter = {
  name: 'smtp',

  async send(message: EmailMessage): Promise<void> {
    try {
      await getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (err) {
      if (err instanceof EmailProviderError) throw err;
      throw new EmailProviderError('smtp', describe(err), { cause: err });
    }
  },
};

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default smtpAdapter;
