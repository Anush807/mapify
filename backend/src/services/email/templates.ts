import { env } from '../../config/env';
import type { EmailMessage } from './types';

/**
 * Short, plain, one clear action, no marketing. The link is spelled out in the
 * text part because some clients strip buttons.
 */
export function verificationEmail(to: string, link: string): EmailMessage {
  const hours = env.EMAIL_VERIFICATION_EXPIRY_HOURS;

  const text = [
    'Verify your email',
    '',
    'Confirm this address to secure your Mapify account:',
    link,
    '',
    `This link expires in ${hours} hours.`,
    "If you didn't create a Mapify account, you can ignore this email.",
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1218;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">Verify your email</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b5a5f;">
          Confirm this address to secure your Mapify account.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ff5841;color:#1a1218;font-weight:600;font-size:15px;text-decoration:none;">
          Verify your email
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b5a5f;">
          This link expires in ${hours} hours. If you didn't create a Mapify account, you can ignore this email.
        </p>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b5a5f;word-break:break-all;">
          ${link}
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to, subject: 'Verify your email for Mapify', html, text };
}
