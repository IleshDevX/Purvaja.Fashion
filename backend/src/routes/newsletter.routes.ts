import { Router } from 'express';
import { subscribe } from '../controllers/newsletter.controller.js';
import { newsletterLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();
router.post('/subscriptions', newsletterLimiter, subscribe);
export default router;
