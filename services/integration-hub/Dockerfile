FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/integration-hub ./services/integration-hub

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/integration-hub/dist ./services/integration-hub/dist
COPY --from=build /app/services/integration-hub/package.json ./services/integration-hub/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/integration-hub && pnpm install --prod --no-optional

EXPOSE 3020
CMD ["node", "services/integration-hub/dist/server.js"]

