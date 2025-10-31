FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY services/sanction-offer ./services/sanction-offer

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/services/sanction-offer/dist ./services/sanction-offer/dist
COPY --from=build /app/services/sanction-offer/package.json ./services/sanction-offer/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd services/sanction-offer && pnpm install --prod --no-optional

EXPOSE 3007
CMD ["node", "services/sanction-offer/dist/server.js"]

