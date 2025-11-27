FROM node:24.1.0-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY main.ts instrumentation.ts ./

RUN pnpm install --frozen-lockfile

CMD ["pnpm", "start"]
