import { env } from '../../config/env';
import { logAdapter } from './log.adapter';
import { resendAdapter } from './resend.adapter';
import { smtpAdapter } from './smtp.adapter';
import { verificationEmail } from './templates';
import type { EmailAdapter } from './types';

const adapters: Record<string, EmailAdapter> = {
  resend: resendAdapter,
  smtp: smtpAdapter,
  log: logAdapter,
};

export function getEmailAdapter(): EmailAdapter {
  const adapter = adapters[env.EMAIL_PROVIDER];
  if (!adapter) throw new Error(`Unknown EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
  return adapter;
}

/** Builds the link, composes the message, hands it to the configured provider. */
export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await getEmailAdapter().send(verificationEmail(to, link));
}

export { EmailProviderError } from './types';
export type { EmailAdapter, EmailMessage } from './types';
