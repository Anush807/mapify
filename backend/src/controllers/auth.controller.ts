import type { RequestHandler } from 'express';
import * as authService from '../services/auth.service';
import { clearAuthCookie, setAuthCookie, signToken } from '../lib/jwt';
import { getUserId } from '../middleware/requireAuth';
import { HttpError } from '../lib/httpError';
import type { LoginInput, SignupInput } from '../schemas/auth.schema';

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.signup(req.body as SignupInput);
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

/** Lets the frontend rehydrate `authAtom` on reload — the cookie is httpOnly. */
export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.findUserById(getUserId(req));
    if (!user) throw HttpError.unauthorized('Session user no longer exists');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};
