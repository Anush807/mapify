import crypto from 'node:crypto';
import { env } from '../config/env';

export interface VerificationToken {
  /** Goes in the email link. Never stored. */
  raw: string;
  /** Goes in the database. Never emailed. */
  hash: string;
  expiresAt: Date;
}

/**
 * SHA-256 rather than bcrypt: the token is 32 bytes of CSPRNG output, so it has
 * nothing to brute-force, and a deterministic hash lets verification look the
 * user up by index instead of scanning every row.
 */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function createVerificationToken(): VerificationToken {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
  };
}
