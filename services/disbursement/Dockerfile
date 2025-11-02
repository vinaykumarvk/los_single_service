FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/disbursement ./services/disbursement

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/disbursement/dist ./services/disbursement/dist
COPY --from=build /app/services/disbursement/package.json ./services/disbursement/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/disbursement && pnpm install --prod --no-optional

EXPOSE 3009
CMD ["node", "services/disbursement/dist/server.js"]


