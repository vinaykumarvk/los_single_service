FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/masters ./services/masters

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/masters/dist ./services/masters/dist
COPY --from=build /app/services/masters/package.json ./services/masters/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/masters && pnpm install --prod --no-optional

EXPOSE 3004
CMD ["node", "services/masters/dist/server.js"]

