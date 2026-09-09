import type { RequestHandler } from 'express';
import { z } from 'zod';
import { NewsletterService } from '../services/newsletter.service.js';
import { ValidationError } from '../utils/errors.js';

const service = new NewsletterService();
const schema = z.object({
  email: z.string().trim().email().max(320),
  consentSource: z.literal('storefront_footer'),
});

export const subscribe: RequestHandler = async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid newsletter request.', parsed.error.flatten());
    res.status(201).json({ success: true, data: await service.subscribe(parsed.data.email, parsed.data.consentSource) });
  } catch (error) {
    next(error);
  }
};
