# FriendsBets

Закрытый MVP турнира прогнозов на футбольные матчи для друзей.

## Стек

- Next.js App Router
- TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS + shadcn/ui-стиль компонентов
- Cookie-based session auth
- bcryptjs

## Быстрый старт

### 1. Установка зависимостей

```powershell
npm install
```

### 2. PostgreSQL через Docker (только БД для локальной разработки)

```powershell
docker compose up -d postgres
```

Для dev: `docker compose up -d postgres` и свой `DATABASE_URL` в `.env` (см. `.env.example`).

### 3. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```powershell
Copy-Item .env.example .env
```

Обязательные переменные:

- `DATABASE_URL` — строка подключения PostgreSQL
- `SESSION_SECRET` — длинная случайная строка для подписи сессий
- `ADMIN_EMAIL` — email админа для seed
- `ADMIN_PASSWORD` — пароль админа для seed

### 4. Миграции и генерация клиента

```powershell
npm run db:generate
npm run db:migrate
```

Если база ещё не создана, создайте её в PostgreSQL, затем выполните migrate.

### 5. Seed и матчи Championat

```powershell
npm run db:seed
npm run sync:championat
```

`db:seed` создаёт правила начисления, системный шаблон ЧМ-2026 и админа. Турнир создаёте на `/create`; матчи подтягиваются при создании или через `sync:championat`.

### 6. Запуск dev-сервера

```powershell
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## После seed

| Что | Значение |
|-----|----------|
| Admin email | `admin@friendsbets.local` (или из `ADMIN_EMAIL`) |
| Admin password | `admin123456` (или из `ADMIN_PASSWORD`; пустой `ADMIN_PASSWORD=` тоже даёт дефолт) |

После смены пароля в `.env`: `npm run admin:sync-password` (или полный `npm run db:seed`).

Демо-игра и моковые матчи больше не создаются. Повторный `db:seed` удаляет старые демо-записи (`demo2026`, `seed-tournament-2026` и т.п.).

## Основные страницы

- `/` — главная / список игр
- `/create` — создать турнир прогнозов (авторизованный пользователь)
- `/create/success?slug=...` — invite-ссылка после создания
- `/login`, `/register` — авторизация
- `/game/[inviteCode]` — главная турнира (в URL — invite-код, латиница и цифры)
- `/game/[inviteCode]/predictions` — прогнозы
- `/game/[inviteCode]/leaderboard` — таблица
- `/game/[inviteCode]/live` — матчи в прямом эфире
- `/admin/missing` — кто не поставил (админ платформы или организатор турнира)
- `/admin` — админка (ADMIN)

## Создание турнира

На `/create` — два режима:

1. **По шаблону** — готовый турнир (например ЧМ-2026) без ссылки на Championat
2. **Профессиональный** — своя ссылка Championat, опционально сохранить как шаблон

Также: название турнира, схема очков, invite-код (6 символов A–Z/0–9 или свой).

Создатель становится организатором. Ссылка для друзей: `/?register=1&invite=КОД` или `/join` для уже зарегистрированных.

Для корректных абсолютных ссылок укажите `NEXT_PUBLIC_APP_URL` в `.env`.

## Scoring engine

Модуль: `src/lib/scoring/index.ts`

Поддерживаемые правила:

- `FOOTBALL_CLASSIC`
- `MANY_POINTS`
- `DIFFERENCE_DECIDES`
- `DRY_NUMBERS`

Тестовые кейсы:

```powershell
npx tsx src/lib/scoring/test-cases.ts
```

## Пересчёт очков

В админке можно:

1. Вручную сохранить результат матча
2. Нажать «Пересчитать очки»

Пересчёт идемпотентный: старые `PredictionScore` удаляются перед записью новых.

## Email-напоминания о прогнозах

За **3 часа**, **1 час** и **15 минут** до начала матча система проверяет, кто не сделал прогноз:

- **Участникам без прогноза** — личное напоминание со ссылкой на прогнозы
- **Организатору турнира** — письмо со списком тех, кто не поставил

- Логика: `src/lib/reminders/prediction-reminders.ts`
- Повторная отправка блокируется таблицей `PredictionReminder`
- Без SMTP письма выводятся в консоль (`[email:mock]`)

### Настройка SMTP (`.env`)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=FriendsBets <noreply@example.com>
CRON_SECRET=длинный-секрет
```

### Запуск по расписанию

Каждые **5–10 минут** вызывайте cron-эндпоинт:

```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/prediction-reminders
```

Или локально:

```powershell
npm run reminders:send
```

## Football API (Championat)

Синхронизация расписания и результатов с [Championat](https://www.championat.com/football/_worldcup/tournament/6858/calendar/):

- `src/lib/football-api/championat/parser.ts` — парсер календаря (группы + плей-офф)
- `src/lib/football-api/sync.ts` — upsert команд и матчей в БД
- `src/lib/football-api/match-visibility.ts` — матчи с плейсхолдерами (`2A`, `A03`) скрыты из прогнозов

### Переменные окружения

```env
CHAMPIONAT_TOURNAMENT_ID=6858
CHAMPIONAT_SPORT_SLUG=_worldcup
# CHAMPIONAT_SYNC_TOURNAMENT_ID=<cuid-турнира-в-бд>
```

Если не задан, cron-синк ищет турнир по `externalId=championat:tournament:6858` или первый ACTIVE.

### Ручной запуск

```powershell
npm run sync:championat
```

### Cron (календарь + расписание опроса страниц матчей)

`GET /api/cron/sync-matches` сначала опрашивает страницы матчей по расписанию (МСК), затем подтягивает календарь Championat.

**Расписание на каждый матч** (от `startsAt` в МСК):

| До начала | Опрос (все времена **относительно старта** в МСК) |
|-----------|--------|
| > 7 календарных дней | не опрашиваем |
| 7–3 дня | раз в **2 суток** в **час:мин старта** (дни 7, 5 и 3 до матча) |
| 2–1 день | **−12 ч** и **время старта** на каждый из этих календарных дней (для 22:00 → 10:00 и 22:00) |
| День матча | **−12 ч, −6 ч, −1 ч, −10 мин**, старт (для 22:00 → 10:00, 16:00, 21:00, 21:50, 22:00) |
| С момента старта | каждые **30 с** до статуса FINISHED на Championat |
| После FINISHED | ещё **10 мин** каждые **30 с** (уточнение счёта/событий), затем отписка |

Зависшие матчи (старт > 3 ч назад, в БД ещё не FINISHED) опрашиваются при каждом cron до получения результата.

- **5–15 мин** — достаточно до дня матча и для календаря.
- **1 мин** — в день матча и во время лайва, чтобы соблюдать интервал 30 с.

```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/sync-matches
```

Матчи плей-офф с неопределёнными парами (`2A – 2B`) видны в прогнозах как «Команды неизвестны»; ставить прогноз можно, когда обе сборные станут известны.

**Флаги:** ISO-код страны задаётся по русскому названию сборной (`team-country-codes.ts`). В календаре Championat нет flag SVG — только эмблемы команд.

**Стадионы:** город и арена подтягиваются со страницы каждого матча (календарь их не содержит). При синке заполняются только пустые `venueName` / `venueCity`.

## Деплой в Dokploy (один проход)

В репозитории есть `Dockerfile` и `docker-compose.yml` с сервисами **postgres** + **app**. При старте контейнера приложения автоматически выполняются миграции Prisma и (опционально) seed.

### 1. Подготовка секретов

Скопируйте шаблон и заполните **все** пустые поля (без стандартных паролей):

```powershell
Copy-Item .env.example .env
```

Сгенерировать случайные секреты (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Используйте отдельные значения для `POSTGRES_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD`.

### 2. Dokploy

1. Новый проект → **Docker Compose**
2. Репозиторий + ветка
3. Путь к compose: `docker-compose.yml`
4. **Environment** (обязательно): вставьте переменные **построчно** (как в `.env.example`).  
   Dokploy должен создать файл `.env` рядом с `docker-compose.yml` на сервере.  
   Без этого шага будет ошибка `CRON_SECRET is missing` или падение при старте контейнера.
5. Домен и HTTPS на сервис **app**, порт **3000**
6. Deploy

Минимальный набор (все со своими значениями, не оставляйте пустым):

```env
POSTGRES_USER=friendsbets
POSTGRES_PASSWORD=<случайный>
POSTGRES_DB=friendsbets
SESSION_SECRET=<случайный>
NEXT_PUBLIC_APP_URL=https://ваш-домен
CRON_SECRET=<случайный>
ADMIN_EMAIL=admin@ваш-домен
ADMIN_PASSWORD=<свой>
RUN_DB_SEED=true
SKIP_CHAMPIONAT_SEED=true
```

`DATABASE_URL` в Dokploy **не нужен** — собирается внутри контейнера из `POSTGRES_*`.

### 3. После первого успешного деплоя

| Действие | Зачем |
|----------|--------|
| `RUN_DB_SEED=false` | Seed идемпотентный, но Championat при seed не нужен на каждый рестарт |
| Cron в Dokploy / внешний | `GET /api/cron/prediction-reminders` и `/api/cron/sync-matches` с заголовком `Authorization: Bearer <CRON_SECRET>` каждые 5–15 мин |
| `npm run sync:championat` (опционально) | Разово загрузить матчи, если `SKIP_CHAMPIONAT_SEED=true` |

Вход: `ADMIN_EMAIL` / `ADMIN_PASSWORD` из `.env`.

### 4. Тома данных

- `friendsbets_pg_data` — база
- `friendsbets_avatars` — загруженные аватары

PostgreSQL **не** проброшен на хост (только внутренняя сеть compose).

### Локальная проверка production-образа

```powershell
Copy-Item .env.example .env
# заполните .env
docker compose up -d --build
```

Приложение: `http://localhost:3000` (или `APP_PORT` из `.env`).

## NPM scripts

| Script | Описание |
|--------|----------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:migrate:deploy` | Prisma migrate deploy (production / Docker) |
| `npm run db:seed` | Seed database |
| `npm run reminders:send` | Отправить due email-напоминания |
| `npm run sync:championat` | Синхронизировать матчи с Championat (env / первый ACTIVE) |
| `npm run db:push` | Prisma db push |

## Роли пользователей

| Роль | Где в БД | Кто это |
|------|----------|---------|
| **Суперадмин** | `User.role = ADMIN` | Один создатель сервиса. Все турниры, интеграции, будущее управление пользователями. Учётка из `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seed). |
| **Участник** | `User.role = PARTICIPANT` | Любой зарегистрированный пользователь: прогнозы, таблица, Live, вступление по invite. |
| **Организатор турнира** | `GameParticipant.role = ORGANIZER` | Создал турнир на `/create`. Управляет **только своими** играми: участники, матчи, «Кто не поставил». Не суперадмин. |

При регистрации всегда `PARTICIPANT`. Создатель турнира дополнительно получает `ORGANIZER` в своей игре.

В интерфейсе: корона у суперадмина, в сайдбаре «Платформа» vs «Мой турнир».

Логика прав — `src/lib/roles.ts`.

## Безопасность MVP

- Пароли хранятся только как hash
- Сессия в httpOnly cookie
- Honeypot в регистрации
- In-memory rate limit для login/register
- Доступ к игре только для участников
- Глобальная `/admin` (интеграции) — только **суперадмин**; организатор видит урезанные вкладки по своим турнирам
- Прогнозы блокируются после `startsAt`
- Чужие прогнозы скрыты до начала матча
