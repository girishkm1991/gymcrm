# Production-ready multi-stage or standalone Node image
FROM node:22-alpine

# Use secure non-root permissions inside container or run cleanly in alpine environment
WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install dependencites cleanly. Installs both dev and prod deps since build tools are devDeps.
RUN npm install

# Copy complete repository structure
COPY . .

# Compile optimized static bundle (Vite SPA template) and the backend Express bundle (dist/server.cjs via esbuild)
RUN npm run build

# Expose port (must match port 3000 mapping requirement)
EXPOSE 3000

# Set default production environment
ENV NODE_ENV=production

# Boot production build by default
CMD ["npm", "run", "start"]
