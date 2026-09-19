# ---------------------------------------------------------------------------
# On-board unit (vehicle side) — driver profiles, fault capture, the query
# generator, and the driver-facing UI.
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

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

# Bound at runtime from $PORT where the platform sets one; see src/index.ts.
EXPOSE 3000

# Syncs the sqlite schema, then starts the server.
CMD ["./docker-entrypoint.sh"]
