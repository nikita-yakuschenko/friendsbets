#!/bin/sh
set -e

# Обязательные переменные приложения (не БД)
for var in SESSION_SECRET CRON_SECRET ADMIN_PASSWORD NEXT_PUBLIC_APP_URL ADMIN_EMAIL; do
  eval "val=\$$var"
  if [ -z "$val" ]; then
    echo "[entrypoint] ERROR: не задана переменная: $var"
    echo "[entrypoint] Dokploy → Environment или .env (см. .env.example, deploy.env.example)"
    exit 1
  fi
done

if [ -z "$DATABASE_URL" ]; then
  if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "[entrypoint] ERROR: задайте DATABASE_URL (Dokploy / prod) или POSTGRES_PASSWORD (локальный postgres)"
    exit 1
  fi
  export POSTGRES_USER="${POSTGRES_USER:-friendsbets}"
  export POSTGRES_DB="${POSTGRES_DB:-friendsbets}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
  echo "[entrypoint] DATABASE_URL → host postgres (docker-compose.db.yml + app в одном проекте)"
else
  echo "[entrypoint] DATABASE_URL → внешняя БД (Dokploy Databases и т.п.)"
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
