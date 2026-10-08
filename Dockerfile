# --- Stage 1: Build both server and client ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests across root, server, and client
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/
COPY prisma prisma/

# Install all dependencies without triggering lifecycle scripts
RUN npm install --ignore-scripts
RUN npm install --prefix server --ignore-scripts
RUN npm install --prefix client --ignore-scripts

# Copy full source tree
COPY . .

# Generate Prisma client and compile TypeScript
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build --prefix server
RUN npm run build --prefix client

# --- Stage 2: Minimal Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy package manifests and schema
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/
COPY prisma prisma/

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts
RUN npm install --prefix server --omit=dev --ignore-scripts
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy built server and client assets from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 4000

# Push DB migrations if needed and run the server
CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma && node server/dist/index.js"]
