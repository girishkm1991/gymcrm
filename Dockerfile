# ==========================================================
# STAGE 1: Build intermediate assets and bundle code
# ==========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install entire dependency graph (including build-time devDependencies)
RUN npm install

# Copy source tree and config
COPY . .

# Build both React static assets and bundle TypeScript server into dist/
RUN npm run build

# ==========================================================
# STAGE 2: Secure, lightweight production runtime
# ==========================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Enable optimized Node runtime environment
ENV NODE_ENV=production

# Copy package configs for production dependencies
COPY package*.json ./

# Install only production dependencies (skips massive build tools)
RUN npm install --omit=dev

# Gather static distribution files and build bundle from builder stage
COPY --from=builder /app/dist ./dist

# Expose server listener port
EXPOSE 3000

# Run native Node process executing bundled server
CMD ["node", "dist/server.cjs"]
