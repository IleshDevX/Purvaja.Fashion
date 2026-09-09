import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';
import { CartService } from '../services/cart.service.js';
import { mergeCartSchema } from '../validators/commerce.validator.js';
import { CommerceService } from '../services/commerce.service.js';
import { addCartItemSchema, addressSchema, cancelOrderSchema, checkoutSchema, demoResultSchema, orderListSchema, parse, returnOrderSchema, updateCartItemSchema, validateCouponSchema } from '../validators/commerce.validator.js';

const cart = new CartService();
const commerce = new CommerceService();
const send = (res: Parameters<RequestHandler>[1], data: unknown, status = 200) => res.status(status).json({ success: true, data });
const param = (value: string | string[] | undefined, name: string): string => { if (typeof value !== 'string') throw new Error(`Missing ${name} route parameter.`); return value; };

export const getCart: RequestHandler = async (req, res, next) => { try { send(res, await cart.get(req.auth!.userId)); } catch (error) { next(error); } };
export const mergeCart: RequestHandler = async (req, res, next) => { try { const input = parse(mergeCartSchema, req.body); send(res, await cart.merge(req.auth!.userId, input.mergeId, input.items)); } catch (error) { next(error); } };
export const addCartItem: RequestHandler = async (req, res, next) => { try { const input = parse(addCartItemSchema, req.body); send(res, await cart.add(req.auth!.userId, input.variantId, input.quantity)); } catch (error) { next(error); } };
export const updateCartItem: RequestHandler = async (req, res, next) => { try { const input = parse(updateCartItemSchema, req.body); send(res, await cart.update(req.auth!.userId, param(req.params.itemId, 'itemId'), input.quantity)); } catch (error) { next(error); } };
export const removeCartItem: RequestHandler = async (req, res, next) => { try { send(res, await cart.remove(req.auth!.userId, param(req.params.itemId, 'itemId'))); } catch (error) { next(error); } };
export const clearCart: RequestHandler = async (req, res, next) => { try { send(res, await cart.clear(req.auth!.userId)); } catch (error) { next(error); } };
export const listAddresses: RequestHandler = async (req, res, next) => { try { send(res, await commerce.addresses(req.auth!.userId)); } catch (error) { next(error); } };
export const createAddress: RequestHandler = async (req, res, next) => { try { send(res, await commerce.saveAddress(req.auth!.userId, parse(addressSchema, req.body)), 201); } catch (error) { next(error); } };
export const updateAddress: RequestHandler = async (req, res, next) => { try { const input = parse(addressSchema.partial(), req.body); send(res, await commerce.updateAddress(req.auth!.userId, param(req.params.addressId, 'addressId'), input)); } catch (error) { next(error); } };
export const deleteAddress: RequestHandler = async (req, res, next) => { try { send(res, await commerce.deleteAddress(req.auth!.userId, param(req.params.addressId, 'addressId'))); } catch (error) { next(error); } };
export const validateCoupon: RequestHandler = async (req, res, next) => { try { const input = parse(validateCouponSchema, req.body); send(res, await commerce.validateCoupon(req.auth!.userId, input.code, input.subtotalPaise)); } catch (error) { next(error); } };
export const checkout: RequestHandler = async (req, res, next) => { try { const key = req.get('Idempotency-Key'); send(res, await commerce.checkout(req.auth!.userId, parse(checkoutSchema, req.body), key)); } catch (error) { next(error); } };
export const initiatePayment: RequestHandler = async (req, res, next) => { try { send(res, await commerce.initiate(req.auth!.userId, param(req.params.paymentId, 'paymentId'))); } catch (error) { next(error); } };
export const paymentStatus: RequestHandler = async (req, res, next) => { try { send(res, await commerce.paymentStatus(req.auth!.userId, param(req.params.paymentId, 'paymentId'))); } catch (error) { next(error); } };
export const demoResult: RequestHandler = async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production' || env.PAYMENT_PROVIDER !== 'demo') {
      throw new ForbiddenError('Demo payment operations are disabled.', 'DEMO_PAYMENTS_DISABLED');
    }
    const input = parse(demoResultSchema, req.body);
    send(res, await commerce.complete(req.auth!.userId, param(req.params.paymentId, 'paymentId'), input.result));
  } catch (error) {
    next(error);
  }
};
export const phonepeCallback: RequestHandler = async (req, res, next) => {
  try {
    const xVerify = (req.get('X-VERIFY') || req.get('x-verify'))?.trim();
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const responsePayload = req.body?.response || (typeof req.body === 'string' ? req.body : '');
    const routePaymentId = typeof req.params.paymentId === 'string' ? req.params.paymentId : undefined;
    const result = await commerce.handlePhonePeCallback(rawBody, responsePayload, xVerify, routePaymentId);
    send(res, result);
  } catch (error) {
    next(error);
  }
};
export const listOrders: RequestHandler = async (req, res, next) => { try { send(res, await commerce.orders(req.auth!.userId, parse(orderListSchema, req.query))); } catch (error) { next(error); } };
export const getOrder: RequestHandler = async (req, res, next) => { try { send(res, await commerce.order(req.auth!.userId, param(req.params.orderId, 'orderId'))); } catch (error) { next(error); } };
export const cancelOrder: RequestHandler = async (req, res, next) => { try { parse(cancelOrderSchema, req.body); send(res, await commerce.cancel(req.auth!.userId, param(req.params.orderId, 'orderId'))); } catch (error) { next(error); } };
export const requestReturnOrder: RequestHandler = async (req, res, next) => { try { const input = parse(returnOrderSchema, req.body); send(res, await commerce.requestReturn(req.auth!.userId, param(req.params.orderId, 'orderId'), input.reason, input.items)); } catch (error) { next(error); } };
