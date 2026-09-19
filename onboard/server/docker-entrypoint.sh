#!/bin/sh
set -e

# The sqlite file is created on demand but starts empty, and on a mounted
# volume it persists across deploys — so the schema has to be brought up to
# date on every boot, not just the first one. `push` is idempotent.
echo "==> syncing database schema (${DATABASE:-db.sqlite})"
bun drizzle-kit push --force

echo "==> starting on-board server"
exec bun run src/index.ts
