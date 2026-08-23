# Backend REST API

Production-grade Express + TypeScript REST API powering the e-commerce platform.

## Architecture

- **`src/app.ts`**: Express application configuration, security middleware, routing, and centralized error handler.
- **`src/server.ts`**: HTTP server bootstrap and graceful shutdown handler.
- **`src/config/`**: Zod-validated environment and database connection boundary.
- **`src/controllers/`**: HTTP request handlers.
- **`src/middleware/`**: Helmet, rate-limiting, CORS, 404, and error handling.
- **`src/routes/`**: Centralized API route definitions.
- **`src/utils/`**: Pino structured logging and standard HTTP error classes.

## Commands

```bash
# Run in development mode with live reload
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test

# Build production bundle
pnpm build

# Start production server
pnpm start
```
