FROM node:20-alpine AS frontend
WORKDIR /app
ARG VITE_ADMIN_USER=admin
ARG VITE_ADMIN_PASSWORD=25364758@Cd
ARG VITE_WAITER_USER=garcom
ARG VITE_WAITER_PASSWORD=ralfsgarcom@26
ARG APP_RELEASE=20260531
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
ENV VITE_API_URL=
ENV VITE_ADMIN_USER=$VITE_ADMIN_USER
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD
ENV VITE_WAITER_USER=$VITE_WAITER_USER
ENV VITE_WAITER_PASSWORD=$VITE_WAITER_PASSWORD
RUN npm run build

FROM node:20-alpine
ARG APP_RELEASE=20260531
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
COPY --from=frontend /app/dist ./dist
ENV NODE_ENV=production
ENV APP_RELEASE=$APP_RELEASE
WORKDIR /app/backend
EXPOSE 3001
CMD ["node", "src/server.js"]
