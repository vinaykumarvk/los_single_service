FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/underwriting ./services/underwriting

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/underwriting/dist ./services/underwriting/dist
COPY --from=build /app/services/underwriting/package.json ./services/underwriting/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/underwriting && pnpm install --prod --no-optional

EXPOSE 3006
CMD ["node", "services/underwriting/dist/server.js"]

