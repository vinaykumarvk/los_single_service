FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/document ./services/document

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/document/package.json ./services/document/package.json
COPY --from=build /app/services/document/dist ./services/document/dist
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/document && pnpm install --prod --no-optional
EXPOSE 3003
CMD ["node", "services/document/dist/server.js"]


