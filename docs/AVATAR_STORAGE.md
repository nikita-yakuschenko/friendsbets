# Аватары пользователей

Файлы аватаров **не хранятся в PostgreSQL**. В БД только `User.avatarUrl` (путь или полный URL).

## Режимы

| Режим | Когда | Где файлы | `avatarUrl` в БД |
|-------|--------|-----------|------------------|
| **local** (по умолчанию) | нет облачных env | `public/avatars/` + Docker-том `friendsbets_avatars` | `/avatars/{userId}.webp` |
| **supabase** | `AVATAR_STORAGE=supabase` или заданы `SUPABASE_*` | Supabase Storage (бакет public) | `.../storage/v1/object/public/...` |
| **s3** | задан `S3_BUCKET` или `AVATAR_STORAGE=s3` | S3-совместимое хранилище | `https://.../avatars/{userId}.webp` |

Для десятков/сотен аватаров **Supabase Storage** на уже работающем инстансе — нормальный выбор, MinIO не обязателен.

---

## Supabase Storage (VPS / self-hosted)

1. В Supabase Studio → **Storage** → бакет `avatars` (или своё имя).
2. Бакет **public** (чтение без авторизации для `<img>`).
3. В Dokploy → env приложения:

```env
AVATAR_STORAGE=supabase
SUPABASE_URL=https://ваш-kong-или-домен-supabase
SUPABASE_PUBLIC_URL=https://тот-же-внешний-url
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # из env Supabase, только сервер
SUPABASE_STORAGE_BUCKET=avatars
```

`SUPABASE_URL` — для загрузки с сервера app (можно внутренний Docker host, если app в той же сети).  
`SUPABASE_PUBLIC_URL` — что попадёт в БД и откроется в браузере (внешний HTTPS). Если один URL — можно не задавать `SUPABASE_PUBLIC_URL`.

Путь объекта: `avatars/{userId}.webp` (как при S3).

Локальная разработка без S3 — как раньше (`npm run docker:db` + `npm run dev`).

---

## Production: S3 (рекомендуется на VPS)

Подойдут **MinIO** (Dokploy), **Timeweb S3**, **Selectel**, **Cloudflare R2**, **Yandex Object Storage** — любой API S3.

### 1. Бакет

- Имя, например `friendsbets`
- **Публичное чтение** на префикс `avatars/*` (или отдельный CDN-домен)
- CORS для браузера не обязателен (картинки через `<img src="https://...">`)

### 2. Environment (Dokploy → Compose)

```env
AVATAR_STORAGE=s3
S3_ENDPOINT=https://s3.timeweb.com
S3_REGION=ru-1
S3_BUCKET=friendsbets
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://cdn.friendsbets.ru
# для MinIO на VPS часто:
# S3_ENDPOINT=http://minio:9000
# S3_FORCE_PATH_STYLE=true
```

`S3_PUBLIC_URL` — **корень** публичного доступа (без `/` в конце, **без** `/avatars`).  
Ключ в бакете: `avatars/{userId}.webp` → в браузере:  
`https://cdn.friendsbets.ru/avatars/{userId}.webp`

### 3. Docker-том `friendsbets_avatars`

При **s3** том в `docker-compose.yml` **не обязателен** (можно оставить — не мешает).

### 4. Миграция со старых локальных аватаров

Старые записи `/avatars/...` продолжают работать, пока файлы лежат в томе app.  
Новые загрузки пойдут в S3. При желании пользователи перезальют аватар.

---

## MinIO в Dokploy (кратко)

1. **Create Service** → можно отдельный MinIO или внешний S3.
2. Бакет `friendsbets`, policy public read на `avatars/*`.
3. В app env: `S3_ENDPOINT` = internal host MinIO, `S3_PUBLIC_URL` = внешний URL бакета/CDN.

---

## Переменные

| Переменная | Обязательно (s3) | Описание |
|------------|------------------|----------|
| `AVATAR_STORAGE` | Нет | `local` \| `supabase` \| `s3` |
| `SUPABASE_URL` | supabase | API (загрузка/удаление) |
| `SUPABASE_PUBLIC_URL` | Нет | Публичный URL для `<img>` (по умолчанию = `SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase | Service role, **секрет** |
| `SUPABASE_STORAGE_BUCKET` | supabase | Имя бакета |
| `S3_BUCKET` | Да | Имя бакета |
| `S3_ACCESS_KEY_ID` | Да | Ключ |
| `S3_SECRET_ACCESS_KEY` | Да | Секрет |
| `S3_PUBLIC_URL` | Да | Публичная база URL для `<img>` |
| `S3_ENDPOINT` | Часто | API endpoint (MinIO, не-AWS) |
| `S3_REGION` | Нет | `auto` по умолчанию |
| `S3_FORCE_PATH_STYLE` | MinIO | `true` |
