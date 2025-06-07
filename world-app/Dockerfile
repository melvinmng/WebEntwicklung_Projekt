# Build stage
FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --prod

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist/world-app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf