# Imagen de PRODUCCION del backend para el laboratorio. A diferencia de
# backend/Dockerfile (pensado para `npm run dev` con nodemon), aqui solo se
# instalan las dependencias de runtime.
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

USER node

# /health tambien consulta PostgreSQL, asi que "healthy" significa que la API
# puede atender peticiones de verdad.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT:-5000}/health" >/dev/null || exit 1

CMD ["node", "src/server.js"]
