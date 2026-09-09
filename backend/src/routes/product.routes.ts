import { Router } from 'express';
import { createProductReview, getProduct, listProductReviews, listProducts } from '../controllers/product.controller.js';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware.js';
import { reviewLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

router.get('/', listProducts);
router.get('/:productId/reviews', listProductReviews);
router.post('/:productId/reviews', requireAuth, requireCsrf, reviewLimiter, createProductReview);
router.get('/:slugOrId', getProduct);

export default router;
