import { Router } from 'express';
import { getProduct, listProductReviews, listProducts } from '../controllers/product.controller.js';

const router = Router();

router.get('/', listProducts);
router.get('/:productId/reviews', listProductReviews);
router.get('/:slugOrId', getProduct);

export default router;
