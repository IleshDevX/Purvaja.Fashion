import { Router } from 'express';
import { csrf, forgotPassword, login, logout, me, register, resendVerification, resetPassword, updateMe, verifyEmail } from '../controllers/auth.controller.js';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware.js';
import { loginLimiter, passwordResetLimiter, registerLimiter, verificationResendLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();
router.get('/csrf', csrf);
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', verificationResendLimiter, resendVerification);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, requireCsrf, updateMe);
router.post('/logout', requireAuth, requireCsrf, logout);
export default router;
