# ---------------------------------------------------------------------------
# Backend (cloud side) — the RAG pipeline and its HTTP/websocket API.
#
# Production image. For local development use Dockerfile.dev, which runs
# `bun --hot` against a bind mount instead.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Dependencies first, so a source-only change doesn't reinstall them.
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

# Bound at runtime from $PORT where the platform sets one; see src/index.tsx.
EXPOSE 4000

CMD ["bun", "run", "src/index.tsx"]
