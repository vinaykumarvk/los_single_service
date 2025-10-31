FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/audit ./services/audit

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/audit/dist ./services/audit/dist
COPY --from=build /app/services/audit/package.json ./services/audit/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/audit && pnpm install --prod --no-optional

EXPOSE 3012
CMD ["node", "services/audit/dist/server.js"]

