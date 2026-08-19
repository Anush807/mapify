import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { requireAuth, optionalAuth } from '../middleware/requireAuth';
import {
  loginLimiter,
  resendVerificationLimiter,
  signupLimiter,
} from '../middleware/rateLimit';
import {
  LoginSchema,
  ResendVerificationSchema,
  SignupSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post('/signup', signupLimiter, validateBody(SignupSchema), authController.signup);
router.post('/login', loginLimiter, validateBody(LoginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

router.get('/verify-email', authController.verifyEmail);
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  // Accepts either a session or an { email } in the body.
  optionalAuth,
  validateBody(ResendVerificationSchema),
  authController.resendVerification,
);

router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

export default router;
