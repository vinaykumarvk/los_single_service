# Monolith + Frontend Combined Dockerfile
# This builds the monolith service AND the web frontend, serving both from a single container
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared/ ./shared/
COPY services/monolith/ ./services/monolith/
COPY web/ ./web/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile

# Build shared libs first (required by monolith)
WORKDIR /app/shared/libs
RUN pnpm build

# Build monolith
WORKDIR /app/services/monolith
RUN pnpm build

# Build frontend web app
WORKDIR /app/web
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy workspace files for runtime
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/ ./shared/
COPY services/monolith/ ./services/monolith/

# Install production dependencies only
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/services/monolith/dist ./services/monolith/dist
# Copy built frontend to web-dist (where server.ts expects it)
COPY --from=builder /app/web/dist ./services/web-dist

WORKDIR /app/services/monolith

EXPOSE 3000

CMD ["node", "dist/server.js"]

