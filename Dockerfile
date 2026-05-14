# ─── Stage 1: build the React client ─────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install --no-audit --no-fund --loglevel=error
COPY client/ ./
RUN npm run build

# ─── Stage 2: install server deps + copy everything ─────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# better-sqlite3 needs python + build tools to compile native binding
RUN apk add --no-cache python3 make g++ \
    && ln -sf python3 /usr/bin/python

COPY server/package.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

WORKDIR /app
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

# Strip build deps to keep image slim
RUN apk del python3 make g++

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/server
CMD ["node", "server.js"]
