FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/customer-kyc ./services/customer-kyc

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/customer-kyc/package.json ./services/customer-kyc/package.json
COPY --from=build /app/services/customer-kyc/dist ./services/customer-kyc/dist
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/customer-kyc && pnpm install --prod --no-optional
EXPOSE 3002
CMD ["node", "services/customer-kyc/dist/server.js"]


