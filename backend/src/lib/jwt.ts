import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env';

export const AUTH_COOKIE = 'mapify_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

/**
 * httpOnly so a stolen XSS payload can't read it; sameSite lax so ordinary
 * top-level navigation still carries it in dev across ports.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}
