import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail fast at boot on missing/invalid config rather than at the first request
 * that happens to need it.
 */
/**
 * A key present in .env but left blank arrives as '' rather than undefined,
 * which would fail `.optional()` numeric/url checks. Blank means "not set".
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

/**
 * dotenv only strips quotes wrapping the *whole* value, so a per-item quoted
 * list like `"https://a","https://b"` keeps its inner quotes and they end up
 * inside the split values, matching nothing.
 */
const unquote = (v: string) => v.trim().replace(/^['"]|['"]$/g, '');

function assertOrigin(value: string, ctx: z.RefinementCtx, label: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: `${label} is not a valid URL: "${value}"` });
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    ctx.addIssue({ code: 'custom', message: `${label} must be http(s): "${value}"` });
  }
}

/**
 * Exactly one origin. `new URL()` is lenient enough to accept a comma-joined
 * pair like `https://a,https://b` as a single "host", which then gets
 * concatenated straight into verification links — so reject separators here
 * rather than emailing people a dead link.
 */
const singleOrigin = (label: string) =>
  z
    .string()
    .transform(unquote)
    // Trailing slash would produce `https://host//verify-email?token=...`.
    .transform((v) => v.replace(/\/+$/, ''))
    .superRefine((v, ctx) => {
      if (/[,\s]/.test(v)) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be a single URL, not a list: "${v}"`,
        });
        return;
      }
      assertOrigin(v, ctx, label);
    });

/** Comma-separated allow-list, normalised into the array `cors` expects. */
const originList = (label: string) =>
  z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map(unquote)
        .filter((o) => o.length > 0),
    )
    .superRefine((list, ctx) => {
      if (list.length === 0) {
        ctx.addIssue({ code: 'custom', message: `${label} must list at least one origin` });
        return;
      }
      for (const origin of list) assertOrigin(origin, ctx, label);
    });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Default is the output type (already-normalised array), not a raw string.
  CORS_ORIGIN: originList('CORS_ORIGIN').default(['http://localhost:5173']),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  AI_PROVIDER: z.enum(['gemini', 'openai', 'claude', 'mock']).default('gemini'),
  GEMINI_API_KEY: blankAsUndefined(z.string().optional()),
  /**
   * An alias by default, so a model retirement doesn't break generation the way
   * `gemini-2.5-flash` did. Pin a dated id here when you need reproducibility —
   * note the free tier's request quota is counted per model, so switching this
   * moves you to a fresh daily bucket.
   */
  GEMINI_MODEL: blankAsUndefined(z.string().default('gemini-flash-latest')),
  OPENAI_API_KEY: blankAsUndefined(z.string().optional()),
  ANTHROPIC_API_KEY: blankAsUndefined(z.string().optional()),

  // Where the browser is. Used to build verification links and to land the
  // OAuth callback back on the app — NOT the API's own origin.
  FRONTEND_URL: blankAsUndefined(singleOrigin('FRONTEND_URL').default('http://localhost:5173')),

  GOOGLE_CLIENT_ID: blankAsUndefined(z.string().optional()),
  GOOGLE_CLIENT_SECRET: blankAsUndefined(z.string().optional()),
  GOOGLE_CALLBACK_URL: blankAsUndefined(
    singleOrigin('GOOGLE_CALLBACK_URL').default(
      'http://localhost:3000/api/auth/google/callback',
    ),
  ),

  EMAIL_PROVIDER: z.enum(['resend', 'smtp', 'log']).default('log'),
  EMAIL_FROM: z.string().default('Mapify <no-reply@mapify.local>'),
  RESEND_API_KEY: blankAsUndefined(z.string().optional()),
  SMTP_HOST: blankAsUndefined(z.string().optional()),
  SMTP_PORT: blankAsUndefined(z.coerce.number().int().positive().optional()),
  SMTP_USER: blankAsUndefined(z.string().optional()),
  SMTP_PASS: blankAsUndefined(z.string().optional()),

  EMAIL_VERIFICATION_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
