# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.12.0

# ------------------------------------------------------------------------------
# Stage 1: Base image with corepack & pnpm
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

# ------------------------------------------------------------------------------
# Stage 2: Install dependencies & generate Prisma client
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
COPY backend/prisma.config.ts ./backend/prisma.config.ts
COPY frontend/package.json ./frontend/package.json
COPY shared ./shared

RUN pnpm install --frozen-lockfile
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @ecommerce/prototype-b-backend db:generate

# ------------------------------------------------------------------------------
# Stage 3: Build backend and frontend
# ------------------------------------------------------------------------------
FROM deps AS builder
COPY backend ./backend
COPY frontend ./frontend

RUN pnpm --filter @ecommerce/prototype-b-backend build
RUN pnpm --filter @ecommerce/prototype-b build

# ------------------------------------------------------------------------------
# Stage 4: Production backend runner
# ------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001
ENV HOST=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add unprivileged user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs

# Copy root workspace configs & node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/shared ./shared

# Copy backend dependencies, compiled dist, and prisma
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/backend/prisma ./backend/prisma
COPY --from=deps /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=builder /app/backend/dist ./backend/dist

# Copy static frontend build for unified serving if needed
COPY --from=builder /app/frontend/dist ./frontend/dist

USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "const http=require('http');http.get('http://127.0.0.1:5001/readyz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
