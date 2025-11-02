FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY reporting ./reporting

RUN pnpm -w install && pnpm -w build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/reporting/dist ./reporting/dist
COPY --from=build /app/reporting/package.json ./reporting/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && \
    cd reporting && pnpm install --prod --no-optional

EXPOSE 3015
CMD ["node", "reporting/dist/server.js"]


