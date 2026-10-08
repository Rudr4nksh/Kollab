FROM node:20-alpine AS builder

WORKDIR /app

# Copy root, server, and client package definitions
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/
COPY prisma prisma/

# Install dependencies across all workspaces
RUN npm install
RUN npm install --prefix server
RUN npm install --prefix client

# Copy application source
COPY . .

# Generate Prisma client and compile TypeScript for server and client
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build --prefix server
RUN npm run build --prefix client

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy manifests and Prisma schema
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY prisma prisma/

# Install production dependencies only
RUN npm install --omit=dev
RUN npm install --prefix server --omit=dev
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy built server and client from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 4000

# Push DB schema (ensures SQLite / DB tables exist) and start Kollab server
CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma && node server/dist/index.js"]
