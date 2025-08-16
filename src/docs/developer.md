# Документация для разработчиков

**ВАЖНО!** Для запуска необходима сеттинги, без сеттингов ничего не запустится.
## Именования

В названии функций и файлов предполагалось следующее сопоставление

get - получение чего-либо из базы
fetch - получение чего-либо из сети
load - получение чего-либо из сети с последующим сохранением в базу


В проекте использован паттерн CQRS

Query	- Получение данных без изменения состояния
Command	- Операции, изменяющие состояние (POST, PUT, DEL)
Handler	- Обработчик Query/Command
Event	- Оповещение о завершённом действии (не обязательно)
Bus	- Шина (CommandBus, QueryBus, EventBus)


Заметка про типы данных

Контроллер      - DTO (класс)	Валидация, документация, приём данных
Сервис          - Бизнес-логика	Интерфейс или Entity	Внутренние типы, бизнес-методы, домен
Хранение данных - Entity, взаимодействие с БД
Ответ клиенту   - Response DTO, Формирует данные ответа, фильтрует лишнее



## Миграции
В приложении реализованы миграции

Все миграции лежат в `src/migrations`
Если миграция успешна и устраивает разработчика, то следует миграцию провести (запустить) на базе
`npm run migrate:arango`





# Содержание

1. Технологический стек
2. Общая архитектура и слои (DDD)
3. Логика инкапсуляции и правила зависимости
4. Основные модули и их взаимодействие (с примерами последовательностей)
5. Key Module — дизайн и поведение
6. Хранилища данных: ArangoDB, PostgreSQL, Redis (с примерами схем)
7. CQRS, read-модели и event-driven паттерны
8. Потоковая/многопоточная обработка и масштабирование
9. Тестирование и CI
10. Безопасность, шифрование и эксплуатация
11. Запуск локально (docker-compose) и деплой
12. Руководство оператора / runbook
13. Контрибьюция и кодстайл

---

# 1. Технологический стек

**Ядро:**

* Node.js
* TypeScript
* NestJS (модульная архитектура, DI)

**Базы данных и кэш:**

* ArangoDB — граф/документы (основное хранилище сущностей и графовых коллекций)
* PostgreSQL — хранение API-ключей, audit-логов (реляционная целевая БД)
* Redis — механизм distributed leasing, очередь (BullMQ) и кэш

**Очереди и обработка:**

* BullMQ (на Redis) или Redis Streams для очередей задач и delayed jobs

**Мониторинг и трассировка:**

* Prometheus (метрики)
* OpenTelemetry (трассировка)
* Loki/ELK (логирование) — опционально

**Секреты:**

* Vault / KMS (AWS KMS / GCP KMS) — хранение master key для шифрования токенов

**Тесты и dev-инструменты:**

* Jest — unit tests
* testcontainers / docker-compose — integration tests
* ESLint, Prettier — кодстайл

**Инфраструктура:**

* Docker / docker-compose (локальная разработка)
* CI: GitHub Actions / GitLab CI

---

# 2. Общая архитектура и слои (DDD)

Проект организован по слоям DDD:

```
src/
  domain/         # сущности, value-objects, интерфейсы репозиториев, доменные события, доменные сервисы
  application/    # use-cases (interactors), commands/queries, DTO, мапперы
  infrastructure/ # реализации репозиториев, внешние клиенты (VK, Arango, Postgres, Redis), Key Module
  presentation/   # контроллеры (HTTP/RPC), DTO для транспорта, валидация
  modules/        # сборочные модули NestJS (импортируют слои и провайдеры)
  main.ts         # bootstrap
```

**Ответственность слоёв:**

* `domain` — чистые бизнес-сущности (POJO), value objects, доменные инварианты, интерфейсы (порты).
* `application` — реализация сценариев (use-cases), оркестрация, транзакционные границы. Использует только порты `domain`.
* `infrastructure` — адаптеры/реализации портов: Arango-репозитории, Postgres-репозитории, VkApiClient, KeyManager, очередь, логирование, metrics. Не содержит бизнес-логики (кроме адаптации).
* `presentation` — контроллеры, DTO, валидация, маппинг transport ↔ domain.

---

# 3. Логика инкапсуляции и правила зависимости

Правила, которые обязательно соблюдать коде:

1. **Направление зависимостей:** `presentation` → `application` → `domain`. 
`infrastructure` реализует интерфейсы `domain` и экспортирует реализации в NestJS-модули. Никто из верхних слоёв не должен импортировать реализацию инфраструктуры напрямую (только через DI-токены).
2. **Domain-first:** домен не содержит ссылок на NestJS, ORM-пакеты, ArangoJS и т.д. Только интерфейсы (репозитории, API-клиенты), value-objects и события.
3. **Repository pattern:** все операции сохранения/чтения должны проходить через реализации интерфейсов репозитория.
4. **Unit of Work:** если use-case требует атомарного изменения нескольких агрегатов, использовать UoW (реализуемый для конкретной DB) или транзакции DB.
5. **Mapper boundary:** мапперы DTO ↔ Domain живут в `application` (или presentation), а доменные сущности не имеют зависимостей от валидаторов/декораторов.
6. **Не хранить чувствительные данные в логах.** Логируются только keyId, не токены.

---

# 4. Основные модули и их взаимодействие

## Основные модули

* `ParserModule` — высокоуровневые сценарии парсинга (import user, sync friends, import posts).
* `KeyModule` — управление API-ключами, leasing, rate-limits, backoff.
* `StorageModule` — ArangoDB adapters (document & edge repositories).
* `ApiKeysModule` — Postgres adapter для ключей (IApiKeyRepository).
* `QueueModule` — обёртка для BullMQ, delayed jobs.
* `MonitoringModule` — метрики, трассировка, логирование.
* `PresentationModule` — HTTP-контроллеры для запуска джоб, админки.

## Примеры последовательностей

### 1) Импорт пользователя — 

1. HTTP запрос → `ImportUserController` (presentation) → валидирует DTO → вызывает `ImportUserUseCase` (application).
2. `ImportUserUseCase`:
   * Запрашивает `KeyManager.leaseKey('vk')` (key module).
   * Вызывает `ISocialApiClient.call('users.get', params, lease)` (infrastructure → VkApiClient).
   * Преобразует ответ в доменный агрегат `VkUser` (domain factory / value-objects).
   * Сохраняет через `IUserRepository.save(user)` (domain interface → infrastructure arango implementation).
   * Добавляет domain event `UserImportedEvent` к агрегату.
   * Коммит транзакции / UoW.
   * После успешного сохранения dispatch domain events (синхронно/асинхронно).
   * `KeyManager.releaseKey(lease, result)` обновляет статистику и rate-limit.
3. Событие `UserImportedEvent` ставится в очередь, воркеры обрабатывают (sync friends, parse posts).

### 2) Вызов API через KeyManager (вк/мульти-сеть)

* `KeyManager` выдаёт `ApiKeyLease` (ключ + leaseId + expiresAt).
* Перед вызовом делается локальная проверка token bucket. Если нет токенов — KeyManager выбирает другой ключ или просит requeue.
* Выполнение происходит через `ISocialApiClient` адаптер, который понимает 429/401 и возвращает structured result.
* В зависимости от кода: при 429 — `KeyManager` помечает ключ `pausedUntil`, requeue задачи; при 401 — помечает key invalid и инициирует refresh (если есть).

---

# 5. Key Module — дизайн и поведение (подробно)

**Цель:** безопасное, масштабируемое и отказоустойчивое распределение вызовов к внешним API через пул ключей с поддержкой rate-limits, backoff и распределённого leasing.

## Основные компоненты

* **IApiKeyRepository** (domain) — интерфейс получения/обновления ключей; реализация — `PostgresApiKeyRepository`.
* **KeyManager** (infrastructure) — пул ключей в памяти + синхронизация с Redis.
* **RateLimiter** — per-key token-bucket, global limiter.
* **DistributedLeasing (Redis)** — получение лизинга через `SET NX EX`, предотвращение двойного использования ключа в нескольких инстансах.
* **IKeySelectionStrategy** — pluggable стратегия выбора ключа (round-robin, weighted, least-used).
* **ApiKeyLease** — объект-лизинг: `{ keyId, token, leaseId, expiresAt }`.
* **KeyStateStore** — хранение метрик per-key (lastUsedAt, errorCount, pausedUntil).
* **Backoff/CircuitBreaker** — пометка проблемных ключей на backoff с экспоненциальным увеличением `pausedUntil`.
* **Metrics** — Prometheus metrics per-key.

## API Key lifecycle

1. Ключ загружается из Postgres, токены дешифруются только в инфраструктуре (с помощью KMS).
2. KeyManager инициализирует rate-limiter per-key на основании метаданных (quota).
3. При lease — создаётся запись lease в Redis с TTL.
4. После выполнения — releaseKey обновляет статистику и удаляет lease.
5. В случае ошибок — key помечается/увеличивается penalty.

## Поведение при ошибках внешнего API

* 429: respect `Retry-After` header; пометить `pausedUntil` = now + retryAfter; requeue task.
* 401: mark invalid; при наличии refresh flow попробовать обновить; alert.
* 5xx: увеличивать errorCount; при threshold — circuit open.

---

# 6. Хранилища данных и схемы

## ArangoDB

Используется для:

* `users` (document collection)
* `groups` (document)
* `posts` (document)
* `edges` (edge collections): `friendships`, `subscriptions`, `group_posts`, `user_posts`

**Рекомендации:**

* Документы (доменные сущности) сериализуются через мапперы (Domain ↔ DB format).
* Репозитории возвращают доменные сущности, не raw documents или курсоры.
* Для массовых инсёртов использовать bulk/transaction operations Arango.

## PostgreSQL (api\_keys)

Таблица `api_keys` (пример):

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  network TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  owner_id UUID,
  scopes TEXT[],
  rate_limit jsonb, -- { per_minute: 150, per_second: 5, ... }
  status TEXT, -- active | paused | invalid
  last_used_at timestamptz,
  meta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Шифрование:** `token_encrypted` хранится зашифрованным (KMS/Vault). Дешифрация производится в KeyManager при lease.

## Redis

* `lease:{keyId}` → leaseId (SET NX EX)
* counters, token buckets (инкремент/деинкремент) или использовать Redisson-like primitives
* BullMQ queues

---

# 7. CQRS и Read-models

**Когда использовать:**

* Для тяжёлых read-запросов (визуализации графа, аналитики) — держать оптимизированные read-модели. Например:

  * `user_profile_read` — агрегированная информация о пользователе
  * `graph_summary` — предвычисленные метрики (degree, clustering, etc.)

**Поток синхронизации:**

1. Команда (Command) изменяет write-model: `ImportUserUseCase` → сохраняет данные в Arango.
2. Domain Event (`UserImportedEvent`) публикуется в шину (internal queue).
3. Consumer подписан и обновляет read-model (Arango collections/Redis).

---

# 8. Потоковая обработка и масштабирование

**Локальная параллельность (Node.js):**

* IO-bound операции: использовать асинхронный execution + ограничение concurrency (p-limit/semaphore).
* CPU-bound: выносить в worker threads или отдельный микросервис.

**Горизонтальное масштабирование:**

* Можно запускать несколько Node-инстансов (PM2/Kubernetes). Для координации leasing/locks — Redis.
* Для обработки джобов — использовать очередь (BullMQ) — воркеры берут задачи и лизят ключ.

**Event-driven:** архитектура с событиями даёт гибкость и асинхронность: новые подписчики на события добавляются без изменения бизнес-логики.

---

# 9. Тестирование и CI

**Unit tests (Jest):**

* Domain: invariants, value-objects, factories.
* Application: use-cases — мокировать репозитории и KeyManager.
* Infrastructure: стратегии KeySelection, RateLimiter (моки).

**Integration tests:**

* Использовать testcontainers/docker-compose для поднятия Arango, Postgres, Redis.
* Тестировать репозитории (интеграция с Arango/Postgres).
* Тесты KeyManager с живым Redis.

**Chaos / Load tests:**

* Симулировать 429/500/401 ответы API, смотреть поведение backoff/rotation.
* Нагрузочные сценарии: N concurrent requests, проверка распределения по ключам.

**CI pipeline:**

* Lint -> Unit tests -> Build -> Integration tests (optional) -> Publish image

---

# 10. Безопасность и эксплуатация

**Шифрование секретов:**

* Хранить master key в Vault/KMS; шифровать токены перед вставкой в DB.
* Дешифровать токен только в KeyManager на момент lease.

**Логи и PII:**

* Логи не содержат токенов и полных PII (при необходимости — хэшировать).
* Structured logging (JSON) — удобно для централизованного сбора.

**Мониторинг и оповещения:**

* Метрики:

  * `api_calls_total{network,method,result}`
  * `api_key_backoff_count{keyId}`
  * `api_key_usage_total{keyId}`
  * `queue_length`, `worker_errors`
* Алерты:

  * % 429 > threshold за N минут
  * Количество available keys < N
  * Высокая задержка (p95) внешних вызовов

---

# 11. Локальный запуск (docker-compose)

Пример `docker-compose.yml` (сервисы: arango, postgres, redis, app):

```yaml
version: '3.8'
services:
  arango:
    image: arangodb:latest
    ports: ["8529:8529"]
    environment:
      - ARANGO_ROOT_PASSWORD=secret
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=secret
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  app:
    build: .
    environment:
      - NODE_ENV=development
      - ARANGO_URL=http://arango:8529
      - POSTGRES_URL=postgres://postgres:secret@postgres:5432/postgres
      - REDIS_URL=redis://redis:6379
    ports: ["3000:3000"]
    depends_on:
      - arango
      - postgres
      - redis
```

**Запуск:**

1. `docker-compose up --build`
2. `npm run migrate` (создать схемы в Postgres/Arango)
3. `npm run start:dev`

---

# 12. Runbook / Руководство оператора

**Частые операции:**

* Ротация ключей:

  * Создать новый key через admin endpoint, пометить старый как `replaced`.
  * Обновить `api_keys` в Postgres.
* Если наблюдаются массовые 429:

  * Проверить метрики `api_key_backoff_count` / `api_key_errors_total`.
  * Увеличить пул ключей или уменьшить concurrency.
  * Рассмотреть throttling на стороне продьюсера (rate limiting upstream).
* Если один из инстансов отвалился:

  * Убедиться, что лизы (Redis) истекли и ключи возвращены; если нет — вручную снять лиз.
* Если Arango перегружена:

  * Переключиться на batch-операции / снизить параллелизм.
* Мониторинг:

  * Настроить алерты на Prometheus для 429 и падения доступности Redis/Postgres/Arango.

---

# 13. Контрибьюция и кодстайл

**Правила:**

* Код в `domain` — только POJO, интерфейсы и value objects.
* Все зависимости внедряются через DI (NestJS providers) и объявляются как интерфейсы в domain.
* Локальные тесты: `npm run test`
* Перед PR: `npm run lint && npm run test`
* PR должен содержать описание изменений, модифицированные модули и инструкции по тестированию.

**Рекомендации по оформлению:**

* TypeScript strict mode включён.
* Использовать `class-validator` и DTO в presentation слое только.
* Мапперы: небольшие, с одним файлом на сущность (`mappers/user.mapper.ts`).

---

# Приложение: полезные интерфейсы (примерные)

### `domain/repositories/iuser.repository.ts`

```ts
export interface IUserRepository {
  findById(id: string): Promise<VkUser | null>;
  findManyByIds(ids: string[]): Promise<VkUser[]>;
  save(user: VkUser): Promise<void>;
  bulkSave(users: VkUser[]): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

### `domain/ports/isocial-api-client.ts`


export interface ApiKeyLease {
  keyId: string;
  token: string; 
  leaseId: string;
  expiresAt: Date;
}

export interface ISocialApiClient {
  network: string;
  call(method: string, params: any, lease: ApiKeyLease): Promise<any>;
  parseRateLimit?(response: any): RateLimitInfo | null;
  refreshKey? (keyId: string): Promise<void>;
}


### `infrastructure/key/key-manager.ts` (псевдо)

class KeyManager {
  async leaseKey(network: string, timeoutMs = 20000): Promise<ApiKeyLease> { /* ... */ }
  async releaseKey(lease: ApiKeyLease, result?: { status: number, headers?: any }): Promise<void> { /* ... */ }
  async markInvalid(keyId: string, reason?: string): Promise<void> { /* ... */ }
}


