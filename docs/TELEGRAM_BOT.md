# Telegram-бот FriendsBets

Персональные уведомления: пользователь привязывает Telegram в **Профиль → Привязать Telegram**. Сообщения дублируют in-app уведомления (заявки, рассылка, и т.д.).

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=123456:ABC...        # обязательно, от @BotFather
TELEGRAM_BOT_USERNAME=FriendsBetsBot    # опционально (без @); иначе берётся из getMe
TELEGRAM_WEBHOOK_SECRET=случайная_строка # только A-Za-z0-9_-
TELEGRAM_CHANNEL_ID=@friendsbets      # канал: бот — администратор
TELEGRAM_CHANNEL_URL=https://t.me/friendsbets  # опционально, «Подписывайтесь на наш канал»
```

`NEXT_PUBLIC_APP_URL` — прод-домен (https) для webhook и ссылок в напоминаниях.

## Канал

- Рассылка платформы из админки дублируется в канал.
- Cron `/api/cron/prediction-reminders`: пост в канал + личные TG напоминания (за 1 ч / старт матча).
- В личных сообщениях и `/start` внизу может быть строка с `TELEGRAM_CHANNEL_URL` (если задан).

## Личные сообщения из админки

Карточка пользователя → блок **Сообщение в Telegram**. Отправка возможна только если у **этого** пользователя привязан бот (не путать с вашей привязкой админа).

## Webhook (прод)

После деплоя, `prisma migrate deploy` и env в Dokploy:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (та же строка, что при ручной регистрации)
- `NEXT_PUBLIC_APP_URL=https://friendsbets.ru` (обязательно **https**, не localhost)

При старте приложения (`next start` / Docker) webhook **регистрируется автоматически**.

Ручная регистрация с машины разработки:

```powershell
$env:NEXT_PUBLIC_APP_URL="https://friendsbets.ru"
npm run telegram:webhook
```

Проверка:

```powershell
$token = "ВАШ_BOT_TOKEN"
Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
```

В `result.url` должен быть `https://friendsbets.ru/api/telegram/webhook`, `last_error_message` пустой.

## Привязка пользователя

1. Пользователь в профиле нажимает **Привязать Telegram**.
2. Открывается `https://t.me/BOT?start=link_<токен>` (токен 15 минут).
3. В боте пользователь нажимает **Start** — `chat_id` сохраняется в `User.telegramChatId`.

Отвязка: кнопка в профиле или команда `/unlink` в боте.

## Локальная разработка

Webhook на `localhost` Telegram не принимает.

**Вариант 1 — polling (проще):**

```powershell
npm run telegram:poll
```

Оставьте процесс запущенным, в профиле нажмите «Привязать Telegram» и откройте **выданную ссылку** (с `start=link_...`), не просто `/start` в пустом чате.

Не используйте `telegram:poll` на том же боте, что прод: команда снимает webhook с бота.

**Вариант 2 — туннель:** ngrok/cloudflared на `https://xxx/api/telegram/webhook` и `NEXT_PUBLIC_APP_URL` на URL туннеля, затем `npm run telegram:webhook`.

Без `TELEGRAM_BOT_TOKEN` блок Telegram в профиле скрыт (показывается «не настроен»).

## Миграция

```powershell
npx prisma migrate deploy
```

Добавляет поля `telegramChatId`, `telegramUsername`, `telegramLinkedAt`, `telegramLinkToken`, `telegramLinkExpiresAt` в таблицу `User`.
