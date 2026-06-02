#!/bin/sh
set -e

missing=""
for var in POSTGRES_PASSWORD SESSION_SECRET CRON_SECRET ADMIN_PASSWORD NEXT_PUBLIC_APP_URL ADMIN_EMAIL; do
  eval "val=\$$var"
  if [ -z "$val" ]; then
    missing="$missing $var"
  fi
done

if [ -n "$missing" ]; then
  echo "[entrypoint] ERROR: не заданы переменные:$missing"
  echo "[entrypoint] Dokploy: вкладка Environment → вставьте все ключи из .env.example"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  export POSTGRES_USER="${POSTGRES_USER:-friendsbets}"
  export POSTGRES_DB="${POSTGRES_DB:-friendsbets}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
fi

echo "[entrypoint] Prisma migrate deploy…"
npm run db:migrate:deploy

echo "[entrypoint] Platform essentials (scoring rules, system template)…"
npm run db:essentials

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Database seed…"
  npm run db:seed
else
  echo "[entrypoint] Full seed skipped (RUN_DB_SEED=false); essentials already applied above."
fi

echo "[entrypoint] Starting application…"
exec "$@"
