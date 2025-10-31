FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/application ./services/application

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/application/dist ./services/application/dist
COPY --from=build /app/services/application/package.json ./services/application/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/application && pnpm install --prod --no-optional

EXPOSE 3001
CMD ["node", "services/application/dist/server.js"]


