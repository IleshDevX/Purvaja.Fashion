import type { RequestHandler } from 'express';
import { z } from 'zod';
import { shippingService } from '../services/shipping.service.js';
import { verifyShippingWebhook } from '../services/shipping-webhook.service.js';
import { ValidationError } from '../utils/errors.js';
import { input } from '../validators/admin.validator.js';

const shipmentRequest = z.object({
  carrier: z.string().trim().min(1).max(64).optional(),
  trackingNumber: z.string().trim().min(1).max(128).optional(),
  awbCode: z.string().trim().min(1).max(128).optional(),
  trackingUrl: z.string().url().max(500).optional(),
}).strict();

const shippingEvent = z.object({
  trackingNumber: z.string().trim().min(1).max(128),
  status: z.enum(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED']),
  location: z.string().trim().max(255).optional(),
  timestamp: z.string().trim().max(64).optional(),
}).strict();

export const shipOrder: RequestHandler = async (req, res, next) => {
  try {
    const actor = req.auth?.userId || 'admin';
    const param = req.params.id;
    const orderId = Array.isArray(param) ? param[0] : param;
    if (!orderId) {
      throw new ValidationError('Order ID is required.', undefined, 'INVALID_ORDER_ID');
    }
    const result = await shippingService.shipOrder(orderId, actor, input(shipmentRequest, req.body));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const shippingWebhook: RequestHandler = async (req, res, next) => {
  try {
    const verifiedEvent = verifyShippingWebhook(req);
    const payload = input(shippingEvent, req.body);
    const result = await shippingService.processWebhook(payload, verifiedEvent);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
