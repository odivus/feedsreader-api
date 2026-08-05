# ---- Builder: install all deps (incl. dev) and compile TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app

# Dev tools (only for builder)
RUN apk add --no-cache git

# Needed to build the native bcrypt addon
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production: only prod deps + compiled output ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY .sequelizerc ./
COPY src/config/config.js ./src/config/config.js
COPY src/migrations ./src/migrations
COPY src/seeders ./src/seeders

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
