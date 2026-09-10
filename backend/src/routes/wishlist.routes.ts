import { Router } from 'express';
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  syncWishlist,
} from '../controllers/wishlist.controller.js';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getWishlist);
router.post('/', requireCsrf, addToWishlist);
router.delete('/:productId', requireCsrf, removeFromWishlist);
router.post('/sync', requireCsrf, syncWishlist);

export default router;
