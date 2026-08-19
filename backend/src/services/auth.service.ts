import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { HttpError } from '../lib/httpError';
import { createVerificationToken, hashToken } from '../lib/tokens';
import { sendVerificationEmail } from './email';
import { EmailProviderError } from './email/types';
import type { LoginInput, SignupInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;

/** One send per account per minute — the email-bombing guard from spec §8. */
const RESEND_COOLDOWN_MS = 60_000;

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  createdAt: true,
} as const;

/**
 * A failure to send must not lose the account that was just created — the user
 * can always resend. Logged loudly instead.
 */
async function trySendVerification(email: string, rawToken: string): Promise<void> {
  try {
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    const provider = err instanceof EmailProviderError ? err.provider : 'unknown';
    console.error(`[email:${provider}] verification send failed:`, err);
  }
}

export async function signup(input: SignupInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  // Deliberately identical whether the existing account is Google or password —
  // signup must not become an account-existence oracle.
  if (existing) throw HttpError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const token = createVerificationToken();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      emailVerified: false,
      emailVerificationToken: token.hash,
      emailVerificationExpires: token.expiresAt,
    },
    select: publicUserSelect,
  });

  await trySendVerification(user.email, token.raw);
  return user;
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for "no such user" and "wrong password" — don't leak which
  // emails are registered.
  const invalid = new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  if (!user) throw invalid;

  // The one intentional exception (spec §8): telling a Google-only user to use
  // Google is genuinely more helpful than a generic failure they can't act on.
  if (!user.passwordHash) {
    throw new HttpError(
      409,
      'GOOGLE_ACCOUNT',
      'This email is registered with Google — continue with Google instead',
    );
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw invalid;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function findUserById(userId: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
}

/** Single-use: the token fields are cleared the moment it succeeds. */
export async function verifyEmail(rawToken: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: hashToken(rawToken) },
  });

  if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw new HttpError(
      400,
      'INVALID_TOKEN',
      'This verification link is invalid or has expired',
    );
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
    select: publicUserSelect,
  });
}

export async function resendVerification(target: {
  userId?: string;
  email?: string;
}): Promise<void> {
  const user = target.userId
    ? await prisma.user.findUnique({ where: { id: target.userId } })
    : target.email
      ? await prisma.user.findUnique({ where: { email: target.email } })
      : null;

  // Unknown or already-verified addresses return quietly: responding
  // differently would turn this endpoint into an account-existence oracle.
  if (!user || user.emailVerified) return;

  // Per-account cooldown, mirrored by the button countdown in the UI. The issue
  // time is derived from the expiry rather than stored separately.
  const issuedAt = user.emailVerificationExpires
    ? user.emailVerificationExpires.getTime() -
      env.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    : 0;
  if (issuedAt && Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
    throw new HttpError(
      429,
      'RESEND_TOO_SOON',
      'A verification email was just sent. Wait a minute before trying again.',
    );
  }

  const token = createVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token.hash,
      emailVerificationExpires: token.expiresAt,
    },
  });

  await trySendVerification(user.email, token.raw);
}

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name?: string | undefined;
}

/**
 * Find-or-create-or-link. Linking matters: someone who signed up with a
 * password and later uses Google must land on the same account, not a duplicate
 * with the same email.
 */
export async function findOrCreateGoogleUser(
  profile: GoogleProfileInput,
): Promise<PublicUser> {
  const byGoogleId = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    select: publicUserSelect,
  });
  if (byGoogleId) return byGoogleId;

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.googleId,
        // Google already proved they own the address.
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        ...(byEmail.name ? {} : { name: profile.name ?? null }),
      },
      select: publicUserSelect,
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      googleId: profile.googleId,
      name: profile.name ?? null,
      passwordHash: null,
      emailVerified: true,
    },
    select: publicUserSelect,
  });
}
