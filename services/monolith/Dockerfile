# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared libs (monolith dependency)
COPY shared/libs/ ./shared/libs/

# Copy monolith service
COPY services/monolith/ ./services/monolith/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install ALL dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Build shared libs first (required by monolith)
WORKDIR /app/shared/libs
RUN pnpm build

# Build monolith
WORKDIR /app/services/monolith
RUN pnpm build

# Verify build output exists
RUN ls -la dist/ && test -f dist/server.js

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared libs (including built dist)
COPY --from=builder /app/shared/libs/ ./shared/libs/

# Copy monolith package.json for dependency installation
COPY services/monolith/package.json ./services/monolith/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Ensure @los/shared-libs has built JS available in node_modules at runtime
RUN test -f /app/shared/libs/dist/index.js \
  && if [ ! -e /app/services/monolith/node_modules/@los/shared-libs ]; then \
       mkdir -p /app/services/monolith/node_modules/@los/shared-libs; \
     fi \
  && cp -R /app/shared/libs/dist /app/services/monolith/node_modules/@los/shared-libs/ \
  && cp /app/shared/libs/package.json /app/services/monolith/node_modules/@los/shared-libs/package.json \
  && if [ -e /app/node_modules/@los/shared-libs ]; then \
       cp -R /app/shared/libs/dist /app/node_modules/@los/shared-libs/; \
       cp /app/shared/libs/package.json /app/node_modules/@los/shared-libs/package.json; \
     fi

# Copy built monolith files
COPY --from=builder /app/services/monolith/dist ./services/monolith/dist

WORKDIR /app/services/monolith

# Cloud Run sets PORT env var (defaults to 8080)
# Our app reads process.env.PORT
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
