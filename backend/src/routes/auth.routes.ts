import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { LoginSchema, SignupSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/signup', validateBody(SignupSchema), authController.signup);
router.post('/login', validateBody(LoginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
