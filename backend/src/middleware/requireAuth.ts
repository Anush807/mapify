import type { RequestHandler } from 'express';
import { AUTH_COOKIE, verifyToken } from '../lib/jwt';
import { HttpError } from '../lib/httpError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Reads the JWT from the httpOnly cookie (the Authorization header is accepted
 * as a fallback so curl/Postman can drive the API without a cookie jar).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE] as string | undefined;
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  const token = cookieToken ?? bearerToken;
  if (!token) {
    next(HttpError.unauthorized());
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    next(HttpError.unauthorized('Invalid or expired session'));
    return;
  }

  req.userId = payload.userId;
  next();
};

/** Narrowing helper — `requireAuth` guarantees this, TypeScript doesn't know it. */
export function getUserId(req: { userId?: string }): string {
  if (!req.userId) throw HttpError.unauthorized();
  return req.userId;
}
