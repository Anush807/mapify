import type { EmailAdapter, EmailMessage } from './types';

/**
 * Not in the spec — the local equivalent of the `mock` AI provider. Prints the
 * message (including the verification link) to stdout instead of sending it, so
 * the whole signup -> verify loop is exercisable with no provider credentials.
 * Default in `.env`; never select this in production.
 */
export const logAdapter: EmailAdapter = {
  name: 'log',

  async send(message: EmailMessage): Promise<void> {
    console.log(
      [
        '',
        '──────── email (EMAIL_PROVIDER=log, not actually sent) ────────',
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        '',
        message.text,
        '───────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
  },
};

export default logAdapter;
