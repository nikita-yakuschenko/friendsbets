# Тестирование FriendsBets

## Команды

| Команда | Описание |
|---------|----------|
| `npm run test` | Vitest: unit + integration |
| `npm run test:watch` | Режим watch |
| `npm run test:coverage` | Покрытие `src/lib` и `src/server/actions` |
| `npm run test:perf` | Smoke performance (`vitest.perf.config.ts`) |
| `npm run test:e2e` | Playwright |
| `npm run test:all` | Vitest + Playwright |

## Настройка

1. Скопируйте `.env.test.example` → `.env.test.local` (в Git не коммитится).
2. Integration: БД `friendsbets_test`, `npm run db:migrate:deploy`, `npm run db:essentials`.
3. E2E: `npx playwright install chromium`.
4. Сквозной E2E турнира: `E2E_GAME_INVITE_CODE` — invite существующей игры с матчами.

## Структура

- `src/**/*.test.ts` — unit (моки Prisma, Championat HTTP, email).
- `tests/integration/` — Prisma против test DB (skip без `DATABASE_URL_TEST`).
- `tests/e2e/` — Playwright.
- `tests/fixtures/` — HTML Championat без сети.

## CI

Рекомендуется: `npm run lint && npm run test && npm run build` на каждый PR; E2E — по расписанию или с поднятой БД.
