FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/ ./shared/
COPY services/monolith/ ./services/monolith/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile

# Build monolith
WORKDIR /app/services/monolith
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
RUN pnpm install --no-frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/services/monolith/dist ./services/monolith/dist

WORKDIR /app/services/monolith

EXPOSE 3000

CMD ["node", "dist/server.js"]

