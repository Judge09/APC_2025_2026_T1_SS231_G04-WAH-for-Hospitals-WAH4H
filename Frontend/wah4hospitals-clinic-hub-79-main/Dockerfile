# Stage 1: Build the React/Vite app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# No STURDY_ADVENTURE_BASE_8000 set — axios falls back to relative URLs.
# nginx (Stage 2) proxies /api/ to the backend container.
RUN npm run build

# Stage 2: Serve static build + proxy to backend via nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
