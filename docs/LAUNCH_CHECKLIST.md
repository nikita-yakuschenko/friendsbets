# FriendsBets — состояние, запуск и развитие

Чеклист для сценария: **~15 участников, ~1 месяц**, закрытый турнир друзей.

Дата актуализации: 2026-06-03.

---

## 1. Краткая оценка «готово ли к проду»

| Критерий | Оценка | Для вашей нагрузки |
|----------|--------|-------------------|
| Функционал (турнир, прогнозы, очки, Championat) | **88 / 100** | Достаточно |
| Надёжность при низкой нагрузке | **86 / 100** | Запас большой |
| Безопасность (закрытая группа) | **82 / 100** | Нужны свои секреты и пароль админа |
| Эксплуатация (deploy, cron, почта) | **зависит от вас** | См. раздел 3 — это главный риск |
| **Итого: можно открывать друзьям** | **~85 / 100** | После обязательного чеклиста ниже |

**Вывод:** код и архитектура для 15 человек на месяц **пригодны для production**. Блокеры запуска — не «переписать приложение», а **один раз правильно выкатить и настроить окружение**.

---

## 2. Текущее состояние (что уже есть)

### Продукт
- Регистрация / вход, верификация email, сессии в httpOnly cookie
- Создание турнира (`/create`), invite-код, OPEN / REQUEST доступ
- Прогнозы, блокировка после старта, 4 схемы очков, leaderboard, Live
- Синхронизация Championat (календарь + опрос страниц матчей)
- Email-напоминания (3 ч / 1 ч / 15 мин) + письмо организатору «кто не поставил»
- Админка платформы и организатор турнира

### Техническая зрелость (недавние улучшения)
- Индексы Prisma под reminders и sync
- Пул PostgreSQL через env (`DATABASE_POOL_*`)
- Quick / full sync (`?mode=quick|full` на cron)
- Bulk-запросы в reminders (без N+1)
- `timingSafeEqual` для подписи сессии
- Health: `/api/health`, `/api/health/db`, `/api/health/cron`
- История cron в таблице `CronRun`
- **150** unit/integration-тестов, конфиги в Git

### Документация в репозитории
- `README.md` — стек, dev, cron, Dokploy
- **`docs/DATABASE.md`** — БД отдельно от app, `DATABASE_URL`, локально / prod
- `docs/TESTING.md` / `docs/TESTING_REPORT.md` — тесты
- `.env.example` — локальная разработка
- `deploy.env.example` — Dokploy Environment (только app)

---

## 3. Запуск: что НЕ готово без ваших действий

Это **не баги кода**, а то, что **нельзя сделать только коммитом** — нужна настройка на сервере.

| # | Что не готово «из коробки» | Почему важно | Блокер? |
|---|---------------------------|--------------|---------|
| 1 | Миграции на **боевой** БД (индексы + `CronRun`) | Perf reminders/sync, health/cron | **Да** |
| 2 | Уникальные `SESSION_SECRET`, `CRON_SECRET`, пароль БД в `DATABASE_URL` | Безопасность | **Да** |
| 3 | Пароль админа ≠ дефолт `admin123456` | Любой знает пример из README | **Да** |
| 4 | `NEXT_PUBLIC_APP_URL` = реальный HTTPS URL | Ссылки в письмах и invite | **Да** |
| 5 | SMTP (если нужны письма) | Без SMTP — только `[email:mock]` в логах | **Да**, если ждёте email |
| 6 | Cron-задачи на сервере / в Dokploy | Без cron — устаревшие счёта и нет напоминаний | **Да** |
| 7 | Разовый full sync + регулярный quick sync | Quick не подтягивает весь календарь | **Почти да** |
| 8 | Бэкап PostgreSQL | Потеря VPS = потеря турнира | Нет, но **сильно рекомендуется** |
| 9 | Ручная проверка сценария «логин → прогноз → таблица» | Уверенность перед открытием друзьям | Нет |
| 10 | CI (GitHub Actions) | На работу 15 users не влияет | Нет |

---

## 4. Обязательный чеклист перед открытием турнира

Отмечайте `[x]` по мере выполнения.

### 4.1. База данных (отдельно) и секреты app

**Сначала БД:** Dokploy → **Databases** → PostgreSQL (`friendsbets`, `postgres:16-alpine`, без external port).  
Подробно: **`docs/DATABASE.md`**.

**Потом app:** Dokploy → **Docker Compose** → `docker-compose.yml` (только сервис `app`).  
Шаблон env: **`deploy.env.example`**.

Сгенерировать случайную строку (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

| Переменная | Обязательно | Что указать | Где |
|------------|-------------|-------------|-----|
| `DATABASE_URL` | **Да (app)** | Internal URL из Databases + `?schema=public` | Prisma, entrypoint |
| `SESSION_SECRET` | Да | ≥ 32 символа, случайный | Cookie |
| `CRON_SECRET` | Да | Случайный | `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | Да | `https://ваш-домен.ru` без `/` | Письма, invite |
| `ADMIN_EMAIL` | Да | Реальный email | Seed |
| `ADMIN_PASSWORD` | Да | Свой, не из примера | Seed |
| `RUN_DB_SEED` | Первый деплой | `true`, потом **`false`** | Entrypoint |
| `SKIP_CHAMPIONAT_SEED` | Рекомендуется | `true` на prod | Seed |

`POSTGRES_*` в Environment **app не нужны** — только в карточке Databases при создании БД.

**Миграции до деплоя app (опционально):** локально `npm run db:migrate:deploy` с `DATABASE_URL` на prod (туннель / временный port) — см. `docs/DATABASE.md`.

**Опционально (есть дефолты, для 15 users можно не трогать):**

| Переменная | Default | Назначение |
|------------|---------|------------|
| `DATABASE_POOL_MAX` | `10` | `src/lib/db.ts` |
| `DATABASE_POOL_IDLE_TIMEOUT_MS` | `30000` | Пул PG |
| `DATABASE_POOL_CONNECTION_TIMEOUT_MS` | `10000` | Пул PG |
| `CHAMPIONAT_SYNC_CONCURRENCY` | `3` | Параллель enrichment в sync |

### 4.2. SMTP (если нужны email-напоминания)

**Где:** тот же `.env` / Dokploy Environment.

```env
SMTP_HOST=smtp.ваш-провайдер.ru
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=FriendsBets <noreply@ваш-домен.ru>
```

**Проверка:** после деплоя дождаться окна напоминания или вызвать cron вручную (раздел 4.5). В логах не должно быть только `[email:mock]`.

**Если SMTP не настраивать:** турнир работает; напоминания придётся делать вручную (чат, «Кто не поставил» в админке).

### 4.3. База данных и миграции

**На первом деплое** Docker entrypoint обычно выполняет `prisma migrate deploy`.

**Проверить вручную** (если деплой уже был до миграций `perf_indexes` и `cron_runs`):

```powershell
# Локально с DATABASE_URL на prod (осторожно!) или в shell контейнера app:
npm run db:migrate:deploy
```

Ожидаемые миграции включают:
- `20260603210000_perf_indexes`
- `20260603220000_cron_runs`

**После первого успешного seed:**

| Действие | Где | Значение |
|----------|-----|----------|
| Отключить повторный seed | Dokploy env | `RUN_DB_SEED=false` |

**Смена пароля админа после правки `.env`:**

```powershell
npm run admin:sync-password
```

(нужен `DATABASE_URL` / доступ к prod БД)

### 4.4. Championat и матчи

| Шаг | Команда / действие | Когда |
|-----|-------------------|--------|
| Создать турнир | Войти как админ → `/create` | Перед приглашением друзей |
| Разовая загрузка календаря | `npm run sync:championat` **или** cron `mode=full` | После создания турнира |
| Уточнить env (опционально) | `CHAMPIONAT_TOURNAMENT_ID`, `CHAMPIONAT_SPORT_SLUG` | Если не ЧМ-2026 — своя ссылка в «профессиональном» режиме |

```env
CHAMPIONAT_TOURNAMENT_ID=6858
CHAMPIONAT_SPORT_SLUG=_worldcup
# CHAMPIONAT_SYNC_TOURNAMENT_ID=<cuid-конкретного-турнира-в-бд>
```

### 4.5. Cron (обязательно на время турнира)

**Где настраивать:** Dokploy Scheduled Tasks, cron на VPS, GitHub Actions schedule, Uptime Robot + HTTP — любой планировщик с HTTP GET.

**Авторизация (обязательно):**

```http
Authorization: Bearer <ваш CRON_SECRET>
```

или query (менее безопасно): `?secret=<CRON_SECRET>`

#### A. Напоминания о прогнозах

| Параметр | Значение |
|----------|----------|
| URL | `https://ваш-домен/api/cron/prediction-reminders` |
| Метод | GET или POST |
| Интервал | **каждые 5–10 минут** |
| Окно работы | Весь период турнира (пока есть предстоящие матчи) |

Локальная проверка:

```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" https://ваш-домен/api/cron/prediction-reminders
```

#### B. Синхронизация Championat

**Два режима** (важно не путать):

| Режим | URL | Как часто | Что делает |
|-------|-----|-----------|------------|
| **quick** (основной) | `.../api/cron/sync-matches?mode=quick` | **каждые 5–15 мин** | LIVE, ближайшие матчи, счёт; без полного календаря |
| **full** | `.../api/cron/sync-matches?mode=full` | **1–2 раза в сутки** | Календарь, команды, venues, нормализация городов |

Без `mode` сейчас по умолчанию **quick** (в коде cron route).

**В день матчей / во время LIVE:** интервал **1 мин** желателен (в README — опрос страниц матча каждые 30 с).

Пример:

```powershell
# quick
curl -H "Authorization: Bearer $env:CRON_SECRET" "https://ваш-домен/api/cron/sync-matches?mode=quick"

# full (раз в день)
curl -H "Authorization: Bearer $env:CRON_SECRET" "https://ваш-домен/api/cron/sync-matches?mode=full"
```

### 4.6. Health-check после деплоя

| URL | Ожидание | Нужна БД |
|-----|----------|----------|
| `GET /api/health` | `{ "ok": true, "service": "friendsbets" }` | Нет |
| `GET /api/health/db` | `{ "ok": true, "database": "up" }` | Да |
| `GET /api/health/cron` | `persistence: true`, массив `lastRuns` после первых cron | Да |

Публично открывать health **можно** — секреты не отдаются. При желании ограничьте IP на reverse proxy.

### 4.7. Ручная приёмка (15 минут)

- [ ] Вход под `ADMIN_EMAIL` / своим паролем
- [ ] Создание турнира на `/create`, копирование invite-ссылки
- [ ] Регистрация тестового пользователя (или второй браузер)
- [ ] Вступление по invite, страница прогнозов
- [ ] Сохранение прогноза на матч с известными командами
- [ ] Leaderboard открывается и показывает участника
- [ ] (Опционально) `/admin/missing` — список без прогноза

### 4.8. Бэкап (сильно рекомендуется на месяц)

**Где:** хостинг / Dokploy / ручной cron на VPS.

```powershell
# Локально: docker compose -f docker-compose.db.yml exec postgres pg_dump ...
# Prod: Dokploy → Databases → Backups или docker exec в контейнер БД
```

Частота для 15 users: **раз в 2–3 дня** или перед каждым турнирным этапом.

---

## 5. Деплой: куда что прописать (шпаргалка)

### Dokploy (из README)

1. **Databases** → PostgreSQL (отдельно)
2. **Docker Compose** → `docker-compose.yml` (только app), `deploy.env.example`
3. Домен + HTTPS на **app**, порт **3000**
4. Deploy → health (4.6)
5. `RUN_DB_SEED=false` после первого старта
6. Scheduled tasks — cron (4.5)

### Локальный production-образ

```powershell
Copy-Item .env.example .env
npm run docker:up
```

Приложение: `http://localhost:3000` (или `APP_PORT`).

### Файлы, которые **не** коммитить

| Файл | Причина |
|------|---------|
| `.env`, `.env.local`, `.env.test.local` | Секреты |
| `coverage/`, `playwright-report/`, `test-results/` | Артефакты |

Шаблон для команды: `.env.example`, `.env.test.example`.

---

## 6. Во время турнира (эксплуатация)

| Что смотреть | Как | Действие |
|--------------|-----|----------|
| Cron отработал | `/api/health/cron` → `lastRuns`, `ok: true` | Если `ok: false` — логи контейнера `app` |
| Письма не ходят | Логи: `[email:mock]` | Проверить SMTP в env |
| Счёт не обновился | Championat вручную vs Live в приложении | `mode=full` sync или подождать scheduled poll |
| Диск / БД | Dokploy / `docker system df` | Бэкап, при необходимости очистка логов |

**Не критично для 15 users:** APM, Sentry, отдельный мониторинг — достаточно health + логов.

---

## 7. Развитие после запуска (не блокирует старт)

Приоритет для спокойствия на **следующий** турнир или если проект продлится.

| Приоритет | Задача | Зачем |
|-----------|--------|-------|
| Средний | GitHub Actions: `lint` + `test` + `build` | Не сломать prod при правках |
| Средний | Тесты `games.ts` (leaderboard, overview) | Регрессии таблицы |
| Средний | E2E: создать турнир → прогноз без `E2E_GAME_INVITE_CODE` | Автопроверка перед турниром |
| Средний | Integration: approve join → participant + уведомление | Режим REQUEST |
| Низкий | Параллелизм в `runScheduledChampionatMatchSyncs` | Пик LIVE при большем числе матчей |
| Низкий | UI-тесты карточки прогноза | Косметика/формы |
| Низкий | Очистка старых `CronRun` (> 90 дней) | Размер БД |
| Низкий | Защита `/api/health/db` по IP | Hardening |

Подробнее по тестам: `docs/TESTING_REPORT.md`.

---

## 8. Известные ограничения (принять осознанно)

1. **Championat** — внешний сайт; смена вёрстки может сломать парсер (редко, но возможно).
2. **Rate limit login/register** — in-memory; при рестарте контейнера сбрасывается (для 15 users OK).
3. **Quick sync** не заменяет **full** — без периодического full календарь может отставать.
4. **Тесты integration** требуют `DATABASE_URL_TEST` в `.env.test.local` — только для разработки.
5. **Суперадмин** = `User.role ADMIN` в коде (не отдельная роль SUPERADMIN).

---

## 9. Команды на память

| Задача | Команда |
|--------|---------|
| Prod миграции | `npm run db:migrate:deploy` |
| Синк Championat вручную | `npm run sync:championat` |
| Напоминания вручную | `npm run reminders:send` |
| Синк пароля админа | `npm run admin:sync-password` |
| Тесты перед правкой | `npm run test` |
| Сборка | `npm run build` |
| Essentials без полного seed | `npm run db:essentials` |

---

## 10. Контакты в коде (если что-то сломалось)

| Область | Путь |
|---------|------|
| Сессии | `src/lib/auth.ts` |
| Прогнозы | `src/server/actions/predictions.ts` |
| Очки | `src/lib/scoring/` |
| Championat sync | `src/lib/football-api/sync.ts` |
| Scheduled poll матчей | `src/lib/football-api/championat/sync-scheduled-championat-matches.ts` |
| Напоминания | `src/lib/reminders/prediction-reminders.ts` |
| Cron HTTP | `src/app/api/cron/` |
| Запись cron в БД | `src/lib/cron-run.ts` |
| Join / заявки | `src/server/actions/join-request.ts` |
| Уведомления | `src/lib/notifications.ts` |

---

*Этот файл можно обновлять после каждого крупного релиза. Коммить в Git вместе с `docs/TESTING_REPORT.md`.*
