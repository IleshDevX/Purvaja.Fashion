import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { csrf, forgotPassword, login, logout, me, register, resendVerification, resetPassword, updateMe, verifyEmail } from '../controllers/auth.controller.js';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts. Please try again later.' } } });
const verificationResendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'VERIFICATION_RESEND_RATE_LIMIT_EXCEEDED', message: 'Too many verification requests. Please try again later.' } } });
router.get('/csrf', csrf);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', verificationResendLimiter, resendVerification);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, requireCsrf, updateMe);
router.post('/logout', requireAuth, requireCsrf, logout);
export default router;
