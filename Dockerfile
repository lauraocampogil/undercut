# Undercut — production image (Coolify, Docker, any VPS)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
# Chromium: real Lighthouse runs on the server (no Google quota) and live checks of published fixes
ENV NODE_ENV=production PORT=3000 TZ=Europe/Brussels CHROME_PATH=/usr/bin/chromium-browser
RUN apk add --no-cache tzdata chromium nss freetype harfbuzz ttf-freefont font-noto
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
# All data (clients, events, heatmaps, Google tokens) lives here — mount a persistent volume on /app/.data
RUN mkdir -p /app/.data && chown -R node:node /app
USER node
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "build"]
