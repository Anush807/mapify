import type { Request, RequestHandler, Response } from 'express';
import * as authService from '../services/auth.service';
import { clearAuthCookie, setAuthCookie, signToken } from '../lib/jwt';
import { getUserId } from '../middleware/requireAuth';
import { HttpError } from '../lib/httpError';
import { env } from '../config/env';
import { isGoogleOAuthConfigured, passport } from '../lib/passport';
import { VerifyEmailSchema } from '../schemas/auth.schema';
import type {
  LoginInput,
  ResendVerificationInput,
  SignupInput,
} from '../schemas/auth.schema';

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.signup(req.body as SignupInput);
    // A session is issued immediately (spec §2): the user can start using the
    // app while unverified, and the UI nudges them until emailVerified flips.
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.login(req.body as LoginInput);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.findUserById(getUserId(req));
    if (!user) throw HttpError.unauthorized('Session user no longer exists');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail: RequestHandler = async (req, res, next) => {
  try {
    const parsed = VerifyEmailSchema.safeParse(req.query);
    if (!parsed.success) throw HttpError.badRequest('Missing verification token');

    const user = await authService.verifyEmail(parsed.data.token);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * Works signed-in (no body needed) or signed-out with an { email }, since the
 * user may open the link on another device.
 */
export const resendVerification: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as ResendVerificationInput;
    const userId = req.userId;

    if (!userId && !body?.email) {
      throw HttpError.badRequest('An email address is required');
    }

    await authService.resendVerification({
      ...(userId ? { userId } : {}),
      ...(body?.email ? { email: body.email } : {}),
    });

    // Always the same response shape, verified or not, known address or not.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const googleStart: RequestHandler = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    next(
      new HttpError(
        503,
        'GOOGLE_NOT_CONFIGURED',
        'Google sign-in is not available on this deployment',
      ),
    );
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
    req,
    res,
    next,
  );
};

/**
 * Stateless: Passport only resolves the profile, then we issue our own JWT
 * cookie so OAuth and password logins produce an identical session.
 */
export const googleCallback: RequestHandler = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_unavailable`);
    return;
  }

  passport.authenticate(
    'google',
    { session: false, failureRedirect: `${env.FRONTEND_URL}/login?error=google_failed` },
    (err: unknown, user: authService.PublicUser | false) => {
      if (err || !user) {
        res.redirect(`${env.FRONTEND_URL}/login?error=google_failed`);
        return;
      }
      setAuthCookie(res, signToken(user.id));
      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    },
  )(req as Request, res as Response, next);
};
