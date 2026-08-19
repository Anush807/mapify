import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Brute-force and email-bombing are the abuse vectors on the auth routes
 * specifically (spec §8), so the limits live here rather than app-wide.
 * Disabled outside production-like runs so tests and local clicking aren't
 * throttled — set RATE_LIMIT_DISABLED=1 to force it off.
 */
const disabled = process.env.RATE_LIMIT_DISABLED === '1' || env.NODE_ENV === 'test';

function limiter(options: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => disabled,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: options.message },
      });
    },
  });
}

/** Credential stuffing: generous enough for typos, tight enough to matter. */
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again in a few minutes.',
});

export const signupLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this address. Try again later.',
});

/** Email bombing — the per-account cooldown in the service is the other half. */
export const resendVerificationLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many verification emails requested. Try again later.',
});
