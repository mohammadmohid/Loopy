FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5001

# We use 'tsx' directly to run the TypeScript file without a separate build step for now.
CMD ["pnpm", "exec", "tsx", "src/index.ts"]