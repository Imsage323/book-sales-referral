FROM node:20-alpine AS server-builder

WORKDIR /app/server

COPY src/server/package*.json ./
RUN npm ci

COPY src/server/. .
RUN npm run build

FROM node:20-alpine AS admin-builder

WORKDIR /app/admin

COPY src/admin/package*.json ./
RUN npm ci

COPY src/admin/. .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY src/server/package*.json ./
RUN npm ci --only=production

COPY --from=server-builder /app/server/dist ./dist
COPY --from=admin-builder /app/admin/dist ./admin-dist

EXPOSE 3000

CMD ["sh", "-c", "npx typeorm migration:run -d dist/config/data-source.js && node dist/main"]
