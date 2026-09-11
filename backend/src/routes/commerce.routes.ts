import { Router } from 'express';
import { env } from '../config/env.js';
import {
  addCartItem,
  cancelOrder,
  checkout,
  clearCart,
  createAddress,
  deleteAddress,
  demoResult,
  getCart,
  mergeCart,
  getOrder,
  initiatePayment,
  listAddresses,
  listOrders,
  paymentStatus,
  phonepeCallback,
  removeCartItem,
  requestReturnOrder,
  updateAddress,
  updateCartItem,
  validateCoupon,
} from '../controllers/commerce.controller.js';
import { requireAuth, requireCsrf } from '../middleware/auth.middleware.js';
import { couponLimiter, paymentLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// Public PhonePe webhook endpoints use the SHA authorization configured in the
// PhonePe dashboard. They never trust a browser session or redirect payload.
router.post('/payments/phonepe-callback', phonepeCallback);
router.post('/payments/:paymentId/callback', phonepeCallback);
router.post('/payments/webhook', phonepeCallback);

// Rate limiting on sensitive operations before auth check
router.use('/payments/:paymentId/initiate', paymentLimiter);
router.use('/checkout', paymentLimiter);
router.use('/coupons/validate', couponLimiter);

// Authenticated user commerce endpoints
router.use(['/cart', '/addresses', '/checkout', '/payments', '/orders', '/coupons'], requireAuth);

router.get('/cart', getCart);
router.post('/cart/merge', requireCsrf, mergeCart);
router.post('/cart/items', requireCsrf, addCartItem);
router.patch('/cart/items/:itemId', requireCsrf, updateCartItem);
router.delete('/cart/items/:itemId', requireCsrf, removeCartItem);
router.delete('/cart', requireCsrf, clearCart);

router.get('/addresses', listAddresses);
router.post('/addresses', requireCsrf, createAddress);
router.patch('/addresses/:addressId', requireCsrf, updateAddress);
router.delete('/addresses/:addressId', requireCsrf, deleteAddress);

router.post('/coupons/validate', requireCsrf, validateCoupon);
router.post('/checkout', requireCsrf, checkout);

router.post('/payments/:paymentId/initiate', requireCsrf, initiatePayment);
router.get('/payments/:paymentId/status', paymentStatus);

if (env.PAYMENT_PROVIDER === 'demo' && env.NODE_ENV !== 'production') {
  router.post('/payments/:paymentId/demo-result', requireCsrf, demoResult);
}

router.get('/orders', listOrders);
router.get('/orders/:orderId', getOrder);
router.post('/orders/:orderId/cancel', requireCsrf, cancelOrder);
router.post('/orders/:orderId/returns', requireCsrf, requestReturnOrder);

export default router;
