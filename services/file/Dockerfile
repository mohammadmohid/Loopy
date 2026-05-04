FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy shared package and the specific service
COPY services/shared ./services/shared
COPY services/file ./services/file

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the shared package first, then the service
RUN pnpm --filter @loopy/shared build
RUN pnpm --filter loopy-file build

EXPOSE 5006

# Start the service
CMD ["pnpm", "--filter", "loopy-file", "start"]
