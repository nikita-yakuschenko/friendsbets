#!/bin/sh
set -e

echo "[entrypoint] Prisma migrate deploy…"
npm run db:migrate:deploy

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Database seed…"
  npm run db:seed
else
  echo "[entrypoint] Seed skipped (RUN_DB_SEED=false)."
fi

echo "[entrypoint] Starting application…"
exec "$@"
