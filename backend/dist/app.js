import express from 'express';
import { applySecurityMiddleware } from './middleware/security.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';
export function createApp() {
    const app = express();
    // Security and request parsing
    applySecurityMiddleware(app);
    // Routes
    app.use(routes);
    // 404 handler
    app.use(notFoundHandler);
    // Centralized Error Handler
    app.use(errorHandler);
    return app;
}
export const app = createApp();
