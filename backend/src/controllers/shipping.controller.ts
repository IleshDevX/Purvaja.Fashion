import type { RequestHandler } from 'express';
import { shippingService } from '../services/shipping.service.js';
import { ValidationError } from '../utils/errors.js';

export const shipOrder: RequestHandler = async (req, res, next) => {
  try {
    const actor = req.auth?.userId || 'admin';
    const param = req.params.id;
    const orderId = Array.isArray(param) ? param[0] : param;
    if (!orderId) {
      throw new ValidationError('Order ID is required.', undefined, 'INVALID_ORDER_ID');
    }
    const { carrier } = req.body as { carrier?: string };
    const result = await shippingService.shipOrder(orderId, actor, carrier || 'DELHIVERY');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const shippingWebhook: RequestHandler = async (req, res, next) => {
  try {
    const payload = req.body as {
      trackingNumber: string;
      status: string;
      location?: string;
      timestamp?: string;
    };
    const result = await shippingService.processWebhook(payload);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
