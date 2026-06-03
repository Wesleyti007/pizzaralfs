# node:22-slim (Debian) — melhor com sharp/pg que alpine; menos CVEs que node:20-alpine
FROM node:22-slim AS frontend
WORKDIR /app
ARG APP_RELEASE=20260531
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
ENV VITE_API_URL=
RUN npm run build

FROM node:22-slim
ARG APP_RELEASE=20260531
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
COPY --from=frontend /app/dist ./dist
ENV NODE_ENV=production
ENV APP_RELEASE=$APP_RELEASE
WORKDIR /app/backend
EXPOSE 3001
USER node
CMD ["node", "src/server.js"]
