import type { RequestHandler } from 'express';
import { wishlistService } from '../services/wishlist.service.js';
import { ValidationError } from '../utils/errors.js';

export const getWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const items = await wishlistService.getWishlist(userId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const { productId } = req.body as { productId?: string };
    if (!productId || typeof productId !== 'string') {
      throw new ValidationError('productId is required and must be a valid string.', undefined, 'INVALID_PRODUCT_ID');
    }
    const items = await wishlistService.addToWishlist(userId, productId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const param = req.params.productId;
    const productId = Array.isArray(param) ? param[0] : param;
    if (!productId) {
      throw new ValidationError('productId parameter is required.', undefined, 'INVALID_PRODUCT_ID');
    }
    const items = await wishlistService.removeFromWishlist(userId, productId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

export const syncWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const { productIds } = req.body as { productIds?: string[] };
    if (!Array.isArray(productIds)) {
      throw new ValidationError('productIds must be an array of strings.', undefined, 'INVALID_SYNC_PAYLOAD');
    }
    const items = await wishlistService.syncWishlist(userId, productIds);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};
