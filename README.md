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

### 2. PostgreSQL через Docker

```powershell
docker compose up -d
```

Контейнер: `postgres:16-alpine`, порт `5432`, БД `friendsbets`, логин/пароль `postgres`/`postgres`.

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

`db:seed` создаёт правила начисления, админа, турнир ЧМ-2026 и игру. Матчи подтягиваются отдельно из Championat.

### 6. Запуск dev-сервера

```powershell
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Тестовые данные

После seed доступны:

| Что | Значение |
|-----|----------|
| Invite-код игры | `demo2026` |
| Admin email | `admin@friendsbets.local` (или из `ADMIN_EMAIL`) |
| Admin password | `admin123456` (или из `ADMIN_PASSWORD`) |

Матчи — только из Championat (`npm run sync:championat`). Удалить старые моковые записи: `npm run cleanup:mock`.

## Основные страницы

- `/` — главная / список игр
- `/create` — создать свой турнир прогнозов (авторизованный пользователь)
- `/create/success?slug=...` — invite-ссылка после создания
- `/login`, `/register` — авторизация
- `/game/[gameId]` — главная игры
- `/game/[gameId]/predictions` — прогнозы
- `/game/[gameId]/leaderboard` — таблица
- `/game/[gameId]/live` — матчи в прямом эфире
- `/admin/missing` — кто не поставил (админ платформы или организатор турнира)
- `/admin` — админка (ADMIN)

## Создание своего турнира

Любой авторизованный пользователь может создать игру на `/create`:

1. **Спортивное событие** — выбор из активных чемпионатов с матчами в каталоге
2. **Начисление очков** — одно из правил scoring (`Классика`, `Много очков`, …)
3. **Размер взноса** — произвольный текст, например `500 ₽`
4. **Invite-ссылка** — генерируется автоматически на странице успеха

Создатель сразу становится участником игры. Ссылка для друзей ведёт на `/?register=1&invite=КОД`.

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
# CHAMPIONAT_SYNC_TOURNAMENT_ID=seed-tournament-2026
```

Если `CHAMPIONAT_SYNC_TOURNAMENT_ID` не задан, синк привязывается к турниру с `externalId=championat:tournament:6858` или к первому ACTIVE-турниру.

### Ручной запуск

```powershell
npm run sync:championat
```

### Cron (рекомендуется каждые 5–15 мин во время турнира)

```powershell
curl -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/sync-matches
```

Матчи плей-офф с неопределёнными командами (`2A – 2B`, `SF1 – SF2`) не показываются в прогнозах, пока Championat не подставит реальные сборные.

**Флаги:** ISO-код страны задаётся по русскому названию сборной (`team-country-codes.ts`). В календаре Championat нет flag SVG — только эмблемы команд.

**Стадионы:** город и арена подтягиваются со страницы каждого матча (календарь их не содержит). При синке заполняются только пустые `venueName` / `venueCity`.

## NPM scripts

| Script | Описание |
|--------|----------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed database |
| `npm run reminders:send` | Отправить due email-напоминания |
| `npm run sync:championat` | Синхронизировать матчи с Championat |
| `npm run cleanup:mock` | Удалить моковые матчи/пользователей из БД |
| `npm run db:push` | Prisma db push |

## Роли пользователей

| Роль | Код | Доступ |
|------|-----|--------|
| **Участник** | `PARTICIPANT` | Прогнозы, таблица, прогнозы друзей (после регистрации по invite-коду) |
| **Администратор платформы** | `ADMIN` | Глобальная админка, результаты матчей |

**Организатор игры** (`ORGANIZER` в `GameParticipant`) — создатель турнира: «Кто не поставил» и управление своей игрой.

Роль платформы при регистрации: `PARTICIPANT`. Админ платформы — через seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

Логика ролей и прав — в `src/lib/roles.ts`.

## Безопасность MVP

- Пароли хранятся только как hash
- Сессия в httpOnly cookie
- Honeypot в регистрации
- In-memory rate limit для login/register
- Доступ к игре только для участников
- ADMIN-only для админских страниц → роль **Администратор**
- Прогнозы блокируются после `startsAt`
- Чужие прогнозы скрыты до начала матча
