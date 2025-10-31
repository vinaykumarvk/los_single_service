FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/payments ./services/payments

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/payments/dist ./services/payments/dist
COPY --from=build /app/services/payments/package.json ./services/payments/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/payments && pnpm install --prod --no-optional

EXPOSE 3008
CMD ["node", "services/payments/dist/server.js"]

