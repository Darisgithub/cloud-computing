# Tahap 1: build frontend React menjadi file statis
FROM node:20-alpine AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Tahap 2: backend Node.js yang juga menyajikan hasil build frontend
FROM node:20-alpine
RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    PORT=5000 \
    TZ=Asia/Jakarta
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=build /app/frontend/dist ./public
EXPOSE 5000
CMD ["node", "app.js"]
