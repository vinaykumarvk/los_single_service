FROM node:20-alpine AS build
WORKDIR /app

# install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# copy workspace files
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY gateway ./gateway

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only copy runtime output for gateway
COPY --from=build /app/gateway/dist ./gateway/dist
COPY --from=build /app/gateway/package.json ./gateway/package.json

# Install only gateway production deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd gateway && pnpm install --prod --no-optional

EXPOSE 3000
CMD ["node", "gateway/dist/server.js"]


