# Отчёт по тестированию FriendsBets

Дата: 2026-06-03 (обновлено)

## Инфраструктура

| Инструмент | Назначение |
|------------|------------|
| Vitest + v8 coverage | Unit + integration |
| React Testing Library | Компоненты |
| Playwright | E2E |
| `tests/fixtures/` | HTML Championat без HTTP |

**Тесты и конфиги в Git** (`.gitignore` только для `coverage/`, отчётов Playwright, `.env.test.local`).

Команды: `test`, `test:coverage`, `test:perf`, `test:e2e`, `test:all`.

## Покрытие по областям

### Критичная бизнес-логика
- Scoring (rules, index, catalog)
- Match prediction state, predictions list/filter
- Championat parser, snapshot, tracking, sync, match-sync-schedule
- Reminders (окна + flow без N+1)

### Auth / доступ / join
- Session token (timing-safe, tamper, expiry)
- game-access, roles, invite-code
- join-game, **join-request** (заявки + ответ организатора)
- **notifications** + **notification-preview**

### Ops
- **cron-run** (запись + health/cron)
- logger, concurrency, db pool config
- health API routes

### Server actions
- auth, predictions, create-game, admin, join-game, join-request

### Integration (test DB)
- prisma-models, prediction transaction
- **cron-run** persist/read
- **notifications-join** (JOIN_REQUEST_RECEIVED)

### E2E
- smoke (публичные страницы, защита маршрутов)
- user-flow (login, register, profile, admin, logout)
- **tournament-flow** (прогнозы + leaderboard при `E2E_GAME_INVITE_CODE`)

## Покрытие кода

`vitest --coverage` включает:
- `src/lib/**/*.ts`
- `src/server/actions/**/*.ts`

Пороги CI: invite-code, game-path, football-score, notification-preview, logger.

Ориентир **lines ~45–55%** по объединённому include (рост за счёт notifications, cron-run, join-request).

## Локальная настройка

1. `.env.test.local` из `.env.test.example`
2. `friendsbets_test` + `npm run db:migrate:deploy` + `db:essentials`
3. E2E: `E2E_GAME_INVITE_CODE` для сквозного турнира

## Следующие шаги

1. E2E: создание турнира из UI без ручного invite
2. UI-тесты leaderboard / match-prediction-card
3. Integration: полный approve join → participant + notification APPROVED

## Запуск в production

См. **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** — оценка готовности, обязательный чеклист, cron, env, Dokploy.
