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

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
  FRONTEND_URL: blankAsUndefined(z.string().url().default('http://localhost:5173')),

  GOOGLE_CLIENT_ID: blankAsUndefined(z.string().optional()),
  GOOGLE_CLIENT_SECRET: blankAsUndefined(z.string().optional()),
  GOOGLE_CALLBACK_URL: blankAsUndefined(
    z.string().url().default('http://localhost:3000/api/auth/google/callback'),
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
