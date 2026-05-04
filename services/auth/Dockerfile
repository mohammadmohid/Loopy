FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.15.1

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared package and the specific service
COPY services/shared ./services/shared
COPY services/auth ./services/auth

# Install all dependencies (pnpm will link them correctly)
RUN pnpm install --frozen-lockfile

# Build the shared package first, then the service
RUN pnpm --filter @loopy/shared build
RUN pnpm --filter loopy-auth build

EXPOSE 5001

# Start the service
CMD ["pnpm", "--filter", "loopy-auth", "start"]