import type { RequestHandler } from 'express';
import { ProductService } from '../services/product.service.js';
import { parseCreateReviewInput, parseProductIdentifier, parseProductListQuery, parseReviewListQuery } from '../validators/product.validator.js';

const productService = new ProductService();
const pathValue = (value: string | string[] | undefined): string => typeof value === 'string' ? value : '';

export const listProducts: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await productService.list(parseProductListQuery(req.query)) });
  } catch (error) {
    next(error);
  }
};

export const getProduct: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await productService.getDetail(parseProductIdentifier(pathValue(req.params.slugOrId))) });
  } catch (error) {
    next(error);
  }
};

export const listProductReviews: RequestHandler = async (req, res, next) => {
  try {
    const identifier = parseProductIdentifier(pathValue(req.params.productId));
    res.json({ success: true, data: await productService.getReviews(identifier, parseReviewListQuery(req.query)) });
  } catch (error) {
    next(error);
  }
};

export const createProductReview: RequestHandler = async (req, res, next) => {
  try {
    const identifier = parseProductIdentifier(pathValue(req.params.productId));
    const input = parseCreateReviewInput(req.body);
    const review = await productService.createReview(req.auth!.userId, identifier, input);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};
