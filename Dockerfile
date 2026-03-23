# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.19.5

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

FROM node:${NODE_VERSION}-alpine AS runner
LABEL org.opencontainers.image.title="recipe-extractor-api"
LABEL org.opencontainers.image.description="Recipe extraction API"
LABEL org.opencontainers.image.source="https://github.com/Julian-Jenkinson/Recipe-Extractor-API"

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache python3 py3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server.js package.json ./

# Use the bundled non-root user from the Node base image.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
