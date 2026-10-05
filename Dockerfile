# Multi-stage production build for Kollab
# Includes native compilers (gcc, g++, python3, javac, java, node) for code runner

FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV DATABASE_URL="file:./dev.db"

# Install build tools needed for node-gyp and native packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy root and package manifests
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY prisma ./prisma

# Install dependencies
RUN npm install
RUN npm install --prefix server
RUN npm install --prefix client

# Copy full source
COPY server ./server
COPY client ./client

# Generate Prisma Client for both root and server
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN cd server && npx prisma generate --schema=../prisma/schema.prisma

# Build client and server
RUN npm run build --prefix client
RUN npm run build --prefix server

# Production runtime stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL="file:/app/prisma/prod.db"

# Install compilers & runtimes for real execution of user code:
# - build-essential (gcc, g++, make) for C and C++17
# - python3 for Python execution
# - default-jdk-headless for Java (javac and java)
# - golang-go for Go execution
# - rustc for Rust execution
# - php-cli for PHP execution
# - ruby for Ruby execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    default-jdk-headless \
    golang-go \
    rustc \
    php-cli \
    ruby \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and production dependencies
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY prisma ./prisma

RUN npm install --omit=dev
RUN npm install --prefix server --omit=dev

# Generate Prisma Client for runner
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN cd server && npx prisma generate --schema=../prisma/schema.prisma

# Remove any potential .env files so Prisma relies purely on process environment
RUN rm -f /app/.env /app/prisma/.env /app/server/.env

# Copy built artifacts from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose port (default 4000)
EXPOSE 4000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 4000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Clean any residual .env from mounted volume, export DATABASE_URL, run prisma db push, and start server
CMD ["sh", "-c", "rm -f /app/.env /app/prisma/.env /app/server/.env && export DATABASE_URL=\"${DATABASE_URL:-file:/app/prisma/prod.db}\" && npx prisma db push --schema=./prisma/schema.prisma && node server/dist/index.js"]
