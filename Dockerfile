FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared/ ./shared/
COPY services/monolith/ ./services/monolith/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile

# Build shared libs first (required by monolith)
WORKDIR /app/shared/libs
RUN pnpm build

# Build monolith
WORKDIR /app/services/monolith
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared libs source (needed for workspace link resolution)
COPY shared/libs/package.json ./shared/libs/package.json

# Copy monolith package.json
COPY services/monolith/package.json ./services/monolith/package.json

# Install production dependencies (this creates workspace links)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --no-frozen-lockfile --prod

# Now copy the built artifacts
COPY --from=builder /app/shared/libs/dist ./shared/libs/dist
COPY --from=builder /app/services/monolith/dist ./services/monolith/dist

WORKDIR /app/services/monolith

EXPOSE 3000

CMD ["node", "dist/server.js"]

