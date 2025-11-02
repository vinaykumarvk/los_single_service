FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/bureau ./services/bureau

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/bureau/dist ./services/bureau/dist
COPY --from=build /app/services/bureau/package.json ./services/bureau/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/bureau && pnpm install --prod --no-optional

EXPOSE 3013
CMD ["node", "services/bureau/dist/server.js"]


