import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import type { LoginInput, SignupInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

export async function signup(input: SignupInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict('An account with that email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      ...(input.name ? { name: input.name } : {}),
    },
    select: publicUserSelect,
  });
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for "no such user" and "wrong password" — don't leak which
  // emails are registered.
  if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function findUserById(userId: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
}
