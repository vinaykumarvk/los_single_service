FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/notifications ./services/notifications

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/notifications/dist ./services/notifications/dist
COPY --from=build /app/services/notifications/package.json ./services/notifications/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/notifications && pnpm install --prod --no-optional

EXPOSE 3011
CMD ["node", "services/notifications/dist/server.js"]


