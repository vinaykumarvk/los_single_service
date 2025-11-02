FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/orchestrator ./services/orchestrator

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/orchestrator/dist ./services/orchestrator/dist
COPY --from=build /app/services/orchestrator/package.json ./services/orchestrator/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/orchestrator && pnpm install --prod --no-optional

EXPOSE 3010
CMD ["node", "services/orchestrator/dist/server.js"]


