FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDependencies like nodemon) because the
# compose service runs `npm run dev`. bcryptjs is pure JS, so no native rebuild.
RUN npm ci

COPY . .

# Run as the unprivileged `node` user that ships with the official image. The
# app only reads its files, so it never needs root: if the process were ever
# compromised, the attacker would not get root inside the container.
USER node

EXPOSE 5000

# /health pings PostgreSQL too, so "healthy" means the API can really serve
# requests. `docker compose up --wait` (used by the smoke test) waits for it.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT:-5000}/health" >/dev/null || exit 1

CMD ["npm", "start"]
