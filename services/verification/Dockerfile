FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/verification ./services/verification

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/verification/dist ./services/verification/dist
COPY --from=build /app/services/verification/package.json ./services/verification/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/verification && pnpm install --prod --no-optional

EXPOSE 3014
CMD ["node", "services/verification/dist/server.js"]

