# Telegram-бот FriendsBets

Персональные уведомления: пользователь привязывает Telegram в **Профиль → Привязать Telegram**. Сообщения дублируют in-app уведомления (заявки, рассылка, и т.д.).

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=123456:ABC...        # обязательно, от @BotFather
TELEGRAM_BOT_USERNAME=FriendsBetsBot    # опционально (без @); иначе берётся из getMe
TELEGRAM_WEBHOOK_SECRET=случайная_строка # опционально, но рекомендуется для webhook
```

`NEXT_PUBLIC_APP_URL` должен указывать на прод-домен (ссылки в сообщениях бота).

## Webhook (прод)

После деплоя и `prisma migrate deploy`:

```powershell
$token = "ВАШ_BOT_TOKEN"
$secret = "ВАШ_WEBHOOK_SECRET"
$url = "https://friendsbets.ru/api/telegram/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" -Method Post -Body @{
  url = $url
  secret_token = $secret
  allowed_updates = '["message"]'
}
```

Проверка:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
```

## Привязка пользователя

1. Пользователь в профиле нажимает **Привязать Telegram**.
2. Открывается `https://t.me/BOT?start=link_<токен>` (токен 15 минут).
3. В боте пользователь нажимает **Start** — `chat_id` сохраняется в `User.telegramChatId`.

Отвязка: кнопка в профиле или команда `/unlink` в боте.

## Локальная разработка

Webhook на localhost Telegram не принимает. Варианты:

- туннель (ngrok / cloudflared) на `https://xxx/api/telegram/webhook`;
- тестировать привязку и отправку только на стейдже/проде.

Без `TELEGRAM_BOT_TOKEN` блок Telegram в профиле скрыт (показывается «не настроен»).

## Миграция

```powershell
npx prisma migrate deploy
```

Добавляет поля `telegramChatId`, `telegramUsername`, `telegramLinkedAt`, `telegramLinkToken`, `telegramLinkExpiresAt` в таблицу `User`.
