# Аватар отправителя в почте

## Beget + свой домен (ваш случай)

Почта: ящик `noreply@friendsbets.ru` на Beget, отправка через `smtp.beget.com`.

### 1. Env приложения (Dokploy)

```env
SMTP_HOST=smtp.beget.com
SMTP_PORT=465
SMTP_USER=noreply@friendsbets.ru
SMTP_PASS=пароль_ящика_из_панели_Beget
SMTP_FROM=FriendsBets <noreply@friendsbets.ru>
```

`SMTP_USER` и адрес в `SMTP_FROM` — **один и тот же** ящик. Иначе Gravatar не совпадёт.

### 2. Gravatar (уже сделали)

- Регистрация на **noreply@friendsbets.ru** (не на личную почту).
- Проверка: [gravatar.com/site/check/](https://gravatar.com/site/check/) → должен быть логотип FB.

### 3. Где увидят логотип получатели

| Как читают почту | Аватар в списке |
|------------------|----------------|
| **Яндекс.Почта** | Обычно Gravatar (FB) |
| **Mail.ru** | Часто Gravatar |
| **Веб-почта Beget** (Roundcube) | Часто только буквы **FR**, Gravatar не тянет |
| **Gmail** (в т.ч. ящик с Beget через IMAP) | Буквы, не Gravatar |

То есть «FR» в скрине — нормально для Beget-вебки или Gmail. На **Яндексе** проверь тестовое письмо — там должен быть FB.

### 4. DNS в Beget (доставка, не аватар)

Панель Beget → домен `friendsbets.ru` → почта / DNS:

- **MX** на серверы Beget (как в инструкции Beget).
- **SPF** и **DKIM** из панели почты Beget — включить и прописать TXT, иначе письма в спам.

### 5. Лого при открытии письма

В HTML письма уже подставляется `https://friendsbets.ru/favicon.png`. Файл должен быть на сайте в `public/favicon.png`.

---

## Опционально: BIMI (если нужен лого в Gmail / Apple Mail)

Не обязательно для Beget. Только если принципиально нужен круг с логотипом в Gmail.

---

## Gmail: BIMI по шагам (опционально)

### 1. Почта только с домена

```env
SMTP_FROM=FriendsBets <noreply@friendsbets.ru>
```

SMTP-провайдер должен подписывать письма **DKIM** для `friendsbets.ru` (в панели почты — включить DKIM, скопировать DNS).

### 2. DNS (у регистратора / Timeweb / Cloudflare)

**SPF** (пример, подставь хост SMTP):

```txt
v=spf1 include:_spf.timeweb.ru ~all
```

**DMARC** (обязательно для BIMI):

```txt
Имя: _dmarc.friendsbets.ru
Тип: TXT
Значение: v=DMARC1; p=quarantine; adkim=s; aspf=s; pct=100; rua=mailto:admin@friendsbets.ru
```

Через 1–2 недели при стабильной доставке можно `p=reject`.

**BIMI**:

```txt
Имя: default._bimi.friendsbets.ru
Тип: TXT
Значение: v=BIMI1; l=https://friendsbets.ru/bimi/logo.svg;
```

Логотип в репозитории: `public/bimi/logo.svg` — после деплоя открывается по URL выше (HTTPS, без редиректа).

### 3. Проверка

- [bimigroup.org/bimi-generator](https://bimigroup.org/bimi-generator/) — ввод домена, проверка записей  
- [Google Postmaster Tools](https://postmaster.google.com/) — добавить домен `friendsbets.ru`, смотреть DMARC  
- Отправить письмо на Gmail, подождать **до 48 ч** (BIMI кэшируется)

### 4. VMC (если Gmail не показал лого)

Google иногда требует **Verified Mark Certificate** на логотип (~$1000/год, DigiCert / Entrust).

Без VMC лого в Gmail появляется не у всех. Тогда либо VMC, либо смириться с инициалами в списке + лого в теле письма.

---

## Яндекс: Gravatar

1. Аккаунт Gravatar = **тот же email**, что в `SMTP_FROM`  
2. Картинка рейтинг **G**, квадрат ≥ 200×200  
3. Проверка: [gravatar.com/site/check/](https://gravatar.com/site/check/) → `noreply@friendsbets.ru`

---

## Лого в открытом письме

В шаблоне подставляется `https://friendsbets.ru/favicon.png` (или `NEXT_PUBLIC_APP_URL` + `/favicon.png`). Файл должен лежать в `public/favicon.png` на проде.
