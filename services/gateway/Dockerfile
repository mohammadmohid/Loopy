FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared package and the specific service (Gateway doesn't depend on shared, but we copy for consistency in build context)
COPY services/shared ./services/shared
COPY services/gateway ./services/gateway

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the service
RUN pnpm --filter loopy-gateway build

EXPOSE 8000

# Start the service
CMD ["pnpm", "--filter", "loopy-gateway", "start"]