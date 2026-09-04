import { Router } from 'express';
import healthRoutes from './health.routes.js';
import productRoutes from './product.routes.js';
import authRoutes from './auth.routes.js';
import commerceRoutes from './commerce.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// Base health route directly at /health and /api/v1/health
router.use('/health', healthRoutes);
router.use('/api/v1/health', healthRoutes);
router.use('/api/v1/products', productRoutes);
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1', commerceRoutes);
router.use('/api/v1/admin', adminRoutes);

export default router;
