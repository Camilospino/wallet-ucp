FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including devDependencies like nodemon) because the
# compose service runs `npm run dev`. bcryptjs is pure JS, so no native rebuild.
RUN npm ci

COPY . .

EXPOSE 5000

# Fail fast and surface connection errors instead of crashing silently
CMD ["npm", "start"]
