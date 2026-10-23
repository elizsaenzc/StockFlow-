# 1) Frontend Angular 17
FROM node:20-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npx ng build

# 2) API Node.js (Express + SQLite con sql.js) que sirve también el frontend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=frontend /src/frontend/dist/stockflow/browser ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV NODE_ENV=production \
    STOCKFLOW_DB_PATH=/app/data/stockflow.db.bin \
    PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
