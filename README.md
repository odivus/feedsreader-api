# RSS API

REST API-заготовка на Node.js/Express/TypeScript с:

- регистрацией и входом (по username **или** email) через **Passport Local**;
- входом через **Google** и **GitHub** OAuth 2.0;
- аутентификацией на **JWT access-токенах** (короткоживущие) + **refresh-токенами**
  (хранятся хешированными в MySQL, поддерживают отзыв — полноценный logout);
- CRUD для RSS-ссылок пользователя (`/api/feeds`) — основная доменная сущность,
  которую предполагается расширять дальше (парсинг, обновление статей и т.д.).

## Стек

Node.js · Express · TypeScript · Passport · JWT · MySQL · Sequelize (+ sequelize-cli, миграции) · Zod · Docker

## Архитектура

```
src/
  config/       # env (валидация через zod), логгер, sequelize instance, passport-стратегии
  models/       # Sequelize-модели (User, RefreshToken, Feed) + ассоциации
  migrations/   # schema как единственный источник правды (без sequelize.sync в коде)
  services/     # бизнес-логика (auth, токены, feeds) — не знает про Express
  controllers/  # тонкий слой: разбор req -> вызов сервиса -> ответ
  routes/       # маршруты + подключение middleware
  middlewares/  # auth guard, валидация, rate limit, обработка ошибок
  validators/   # zod-схемы для body/params/query
  utils/        # ApiError, catchAsync, bcrypt/crypto хелперы, cookies
  app.ts        # сборка Express-приложения (security middleware, роуты)
  server.ts     # точка входа: подключение к БД, старт HTTP-сервера, graceful shutdown
```

Слои не смешиваются: контроллеры не содержат SQL/бизнес-правил, сервисы не знают о `req`/`res`.
Это упрощает дальнейшее расширение (например, добавление воркера, который парсит RSS по `Feed.url`).

## Быстрый старт (Docker)

```bash
cp .env.example .env
# отредактируйте .env: как минимум JWT_ACCESS_SECRET, DB_PASSWORD, DB_ROOT_PASSWORD

docker compose up --build
```

Контейнер `api` перед стартом сам применяет миграции (`npm run db:migrate`).
API будет доступен на `http://localhost:3000`, health-check — `GET /health`.

## Локальный запуск без Docker

```bash
npm install
cp .env.example .env   # укажите свою локальную MySQL (DB_HOST=localhost и т.д.)
npm run db:migrate
npm run dev
```

## Переменные окружения

Все переменные валидируются через `zod` в `src/config/env.ts` — при отсутствии/некорректном
значении обязательного параметра приложение не запустится и выведет понятную ошибку.
Полный список — в `.env.example`.

Важные моменты безопасности:

- `JWT_ACCESS_SECRET` — обязателен, минимум 32 символа. Сгенерировать: `openssl rand -hex 64`.
- `COOKIE_SECURE=true` обязательно в production (HTTPS) — иначе refresh-cookie не будет
  отправляться браузером как `Secure`.
- Google/GitHub OAuth включаются автоматически, если заданы соответствующие `CLIENT_ID`/`CLIENT_SECRET`;
  если нет — роуты `/api/auth/google` и `/api/auth/github` просто не регистрируются (без ошибок).

## API

### Аутентификация — `/api/auth`

| Метод | Путь                  | Описание                                                        | Требует токен |
|-------|-----------------------|-------------------------------------------------------------------|:---:|
| POST  | `/register`           | Регистрация (`username`, `email`, `password`)                    | — |
| POST  | `/login`              | Вход (`login` — username или email, `password`)                  | — |
| GET   | `/google`             | Редирект на Google OAuth                                          | — |
| GET   | `/google/callback`    | Callback Google → редирект на `CLIENT_URL/oauth/callback?accessToken=...` | — |
| GET   | `/github`             | Редирект на GitHub OAuth                                          | — |
| GET   | `/github/callback`    | Callback GitHub → редирект на `CLIENT_URL/oauth/callback?accessToken=...` | — |
| POST  | `/refresh`            | Обновление пары токенов по refresh-cookie (с ротацией)            | refresh-cookie |
| POST  | `/logout`             | Отзыв refresh-токена, очистка cookie                              | refresh-cookie |
| GET   | `/me`                 | Текущий пользователь                                              | ✅ |

**Access-токен** возвращается в теле JSON-ответа — хранить на клиенте в памяти (не в
localStorage, чтобы снизить риск XSS) и передавать в заголовке `Authorization: Bearer <token>`.

**Refresh-токен** устанавливается автоматически как `httpOnly` cookie (`path=/api/auth`),
недоступен из JS — клиенту не нужно им управлять руками, достаточно `credentials: 'include'`
в fetch/axios.

### RSS-ссылки — `/api/feeds` (везде нужен `Authorization: Bearer <accessToken>`)

| Метод  | Путь         | Описание                          |
|--------|--------------|------------------------------------|
| GET    | `/`          | Список фидов текущего пользователя |
| POST   | `/`          | Добавить фид (`url`, `title?`, `description?`) |
| GET    | `/:id`       | Получить один фид                  |
| PATCH  | `/:id`       | Частично обновить фид               |
| DELETE | `/:id`       | Удалить фид                         |

Фиды всегда скоупятся по `userId` на уровне сервиса — пользователь физически не может
получить/изменить/удалить чужой фид, даже подобрав `id`.

## Безопасность — что уже учтено

- Пароли — `bcrypt` (12 раундов), пароль никогда не возвращается в ответах (`toPublicJSON()`).
- Refresh-токены — случайная непрозрачная строка (crypto.randomBytes), в БД хранится только
  SHA-256 хеш; при `refresh` происходит **ротация** (старый токен отзывается, выдаётся новый) —
  это ограничивает ущерб от кражи refresh-токена (он одноразовый).
- Logout физически отзывает refresh-токен в БД (не просто "забывает" его на клиенте).
- `helmet`, `hpp`, `compression`, ограничение размера тела запроса (100kb).
- `cors` с explicit allow-list origins (`CLIENT_URL` + `CORS_ORIGINS`) и `credentials: true`
  (без чего браузер не отправит refresh-cookie).
- Rate limiting: общий лимитер на `/api/*`, отдельный жёсткий лимитер на
  `/register`, `/login`, `/refresh` (защита от брутфорса/credential stuffing).
- Валидация всех входных данных через `zod` (`validate()` middleware) — до контроллера
  долетают только чистые, проверенные данные.
- Централизованная обработка ошибок: непредвиденные ("не операционные") ошибки никогда не
  отдают клиенту внутренние детали/стектрейс (кроме `NODE_ENV=development`), но полностью
  логируются на сервере.
- Схема БД управляется только миграциями (`sequelize-cli`) — `sequelize.sync()` в коде
  приложения не используется, что исключает случайные расхождения схемы в проде.
- Параметризованные запросы Sequelize — защита от SQL-инъекций "из коробки".

## Куда расширять дальше

- Подтверждение email при регистрации.
- Смена/сброс пароля ("забыли пароль").
- Фоновый воркер, который периодически парсит `Feed.url` и сохраняет статьи в новую таблицу `articles`.
- Пагинация/поиск в `GET /api/feeds`.
- "Выйти со всех устройств" (уже есть `revokeAllUserRefreshTokens` в `token.service.ts` — осталось
  добавить роут).
- Роли/права (например, admin-панель).
