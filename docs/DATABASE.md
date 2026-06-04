# База данных FriendsBets

PostgreSQL **не входит** в `docker-compose.yml` приложения. БД создаётся и живёт **отдельно**; приложение подключается только по `DATABASE_URL`.

## Схема

```
┌─────────────────────┐         DATABASE_URL          ┌──────────────────────┐
│  docker-compose.yml │  ───────────────────────────►  │  PostgreSQL          │
│  (только app)       │                              │  Dokploy Databases   │
│  Dokploy Compose    │                              │  или compose.db.yml  │
└─────────────────────┘                              └──────────────────────┘
```

| Среда | Где БД | Где app |
|-------|--------|---------|
| **Production** | Dokploy → **Databases** → PostgreSQL | Dokploy → **Docker Compose** → `docker-compose.yml` |
| **Локально (dev)** | `docker compose -f docker-compose.db.yml up -d` | `npm run dev` |
| **Локально (prod-образ)** | `docker-compose.db.yml` + `docker-compose.yml` | оба compose-файла |

---

## Production (Dokploy)

### 1. Создать БД (один раз)

Dokploy → **Databases** → PostgreSQL:

- Database / User: `friendsbets`
- Docker image: `postgres:16-alpine`
- **External port** — не публиковать (5432 на хосте часто занят)
- Запомнить **Internal Host** (например `friendsbetsdb-p8dn1v`) и пароль

### 2. Деплой приложения

Проект → **Docker Compose** → `docker-compose.yml` (только сервис `app`).

**Environment** (обязательно):

```env
DATABASE_URL=postgresql://friendsbets:ПАРОЛЬ@friendsbetsdb-p8dn1v:5432/friendsbets?schema=public
SESSION_SECRET=...
CRON_SECRET=...
NEXT_PUBLIC_APP_URL=https://ваш-домен
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
RUN_DB_SEED=true
SKIP_CHAMPIONAT_SEED=true
```

После первого успешного старта: `RUN_DB_SEED=false`.

`POSTGRES_*` в Dokploy для app **не нужны** — только `DATABASE_URL`.

При старте контейнера app entrypoint выполняет: `migrate deploy` → `db:essentials` → (опционально) seed.

### 3. Обновление только приложения

Redeploy / rebuild **только** compose app. Контейнер БД в Dokploy Databases **не трогать**.

---

## Локальная разработка

### Вариант A — локальная БД (по умолчанию)

```powershell
Copy-Item .env.example .env
# Заполните POSTGRES_PASSWORD, SESSION_SECRET, CRON_SECRET, ...

docker compose -f docker-compose.db.yml up -d
npm run db:generate
npm run db:migrate
npm run db:seed   # при необходимости
npm run dev
```

В `.env`:

```env
DATABASE_URL=postgresql://friendsbets:ВАШ_ПАРОЛЬ@localhost:5433/friendsbets?schema=public
```

Порт **5433** — чтобы не конфликтовать с другим PostgreSQL на Windows.

### Вариант B — та же БД, что на сервере (миграции до деплоя app)

Удобно, когда схему нужно накатить **до** redeploy приложения.

1. Временно открой доступ к БД (один из способов):
   - **SSH-туннель** с VPS на internal host (зависит от сети Docker на сервере), или
   - кратковременно **External port** в Dokploy Databases (не `5432`, если занят — другой, например `5435`).
2. В локальном `.env` укажи `DATABASE_URL` на туннель/внешний порт.
3. Выполни:

```powershell
npm run db:generate
npm run db:migrate:deploy
npm run db:essentials
```

4. Закрой внешний порт. Деплой app на сервере — entrypoint снова прогонит `migrate deploy` (идемпотентно).

**Не коммить** `.env` с prod-паролем.

### Вариант C — локальный production-образ + локальная БД

```powershell
docker compose -f docker-compose.db.yml -f docker-compose.yml up -d --build
```

В `.env` для контейнера app можно **не** задавать `DATABASE_URL` — entrypoint соберёт URL с `host=postgres`, если заданы `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`.

Для `npm run dev` на хосте по-прежнему `localhost:5433` в `DATABASE_URL`.

---

## NPM-команды и БД

| Команда | Когда |
|---------|--------|
| `npm run db:migrate` | Локально, dev-миграции |
| `npm run db:migrate:deploy` | Prod / удалённая БД (`DATABASE_URL` в env) |
| `npm run db:seed` | Локально или `RUN_DB_SEED=true` в entrypoint |
| `npm run db:essentials` | Правила очков + шаблон ЧМ (entrypoint делает сам) |
| `npm run docker:db` | Поднять только `docker-compose.db.yml` |
| `npm run docker:up` | Локально: БД + app-образ |

---

## Бэкап

```powershell
# Локальная БД из docker-compose.db.yml
docker compose -f docker-compose.db.yml exec postgres pg_dump -U friendsbets friendsbets > backup.sql
```

На сервере — через Dokploy (Backups) или `docker exec` в контейнер БД из Databases.

---

## Файлы в репозитории

| Файл | Назначение |
|------|------------|
| `docker-compose.yml` | Только **app** (Dokploy) |
| `docker-compose.db.yml` | Только **postgres** (локально) |
| `deploy.env.example` | Шаблон env для Dokploy app |
| `.env.example` | Локальная разработка + опционально remote `DATABASE_URL` |
