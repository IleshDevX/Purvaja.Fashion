import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Base health route directly at /health and /api/v1/health
router.use('/health', healthRoutes);
router.use('/api/v1/health', healthRoutes);

export default router;
