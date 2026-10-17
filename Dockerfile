# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app
RUN npm install --global pnpm@10.30.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Scripts are skipped: `prepare` sets up git hooks and `nuxt build` runs `nuxt prepare` itself.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app/.output ./.output
# Cached schedule and favorites, see compose.yaml.
RUN mkdir .data && chown node:node .data
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
