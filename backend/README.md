# Backend REST API

Production-grade Express + TypeScript REST API powering the e-commerce platform.

## Architecture

- **`src/app.ts`**: Express application configuration, security middleware, routing, and centralized error handler.
- **`src/server.ts`**: HTTP server bootstrap and graceful shutdown handler.
- **`src/config/`**: Zod-validated environment and shared Prisma/PostgreSQL connection boundary.
- **`src/controllers/`**: HTTP request handlers.
- **`src/middleware/`**: Helmet, rate-limiting, CORS, 404, and error handling.
- **`src/routes/`**: Centralized API route definitions.
- **`src/utils/`**: Pino structured logging and standard HTTP error classes.
- **`prisma/`**: PostgreSQL Prisma configuration. Domain models and migrations begin in Phase 2.

## Database Foundation

The server requires a server-only `DATABASE_URL` before it accepts HTTP traffic.
`GET /api/v1/health/ready` performs a real database query and returns `503` when
PostgreSQL is unavailable. Generate the ignored Prisma client after setting a
local environment value:

```bash
pnpm prisma:generate
```

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
