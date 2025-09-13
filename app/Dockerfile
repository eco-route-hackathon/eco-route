# --- Build stage: frontend ---
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Build stage: backend ---
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev
COPY backend/ ./

# --- Final stage: production ---
FROM node:22-alpine
WORKDIR /app

# フロントのビルド成果物をpublicにコピー
COPY --from=frontend-build /app/frontend/dist ./public
# バックエンドをコピー
COPY --from=backend-build /app/backend ./backend

# 必要なら.env等もコピー（省略可）
# COPY .env ./

# ポート8080で待ち受け
ENV PORT=8080
EXPOSE 8080

# バックエンドサーバー起動（8080でlistenするようにserver側も修正必要）
CMD ["node", "backend/src/server.js"]
