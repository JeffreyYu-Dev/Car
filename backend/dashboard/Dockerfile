# ---------------------------------------------------------------------------
# Backend dashboard (cloud side) — pipeline traces, knowledge base admin,
# and the feedback/expert-scoring UI.
#
# TanStack Start, so this is a server-rendered app rather than static files:
# the build emits dist/client (assets) and dist/server (the SSR handler), and
# both are served together by `vite preview`.
#
# Production image. For local development use Dockerfile.dev, which runs the
# vite dev server against a bind mount instead.
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine

WORKDIR /app

# Dependencies first, so a source-only change doesn't reinstall them.
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# VITE_* values are inlined into the client bundle at build time, so they have
# to be present as build args — reading them at runtime would be too late.
ARG VITE_API_URL
ARG VITE_API_URL_INTERNAL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_URL_INTERNAL=${VITE_API_URL_INTERNAL}

RUN bun run build

ENV NODE_ENV=production
EXPOSE 5000

CMD ["/bin/sh", "-c", "exec bunx vite preview --host 0.0.0.0 --port \"${PORT:-5000}\""]
