Бэкенд парсера big-siser 

**Технологии:** NestJS + gRPC

Документация API: [http://localhost:3002/api/v1](http://localhost:3002/api/v1)

---

## Перед запуском

1. Скопируйте файл конфигурации `settings-example.yml` в корень репозитория как `settings.yml` и при необходимости измените параметры.
2. Установите зависимости:

```bash
npm install
```

---

## Запуск

- В режиме отладки:

```bash
npm run start:dev
```

- В продакшн-режиме:

```bash
npm run build && npm run start:prod
```

---


## Запуск с помощью docker-compose

Для одновременного запуска базы данных и бэкенда выполните:

```bash
docker run -d -e ARANGO_ROOT_PASSWORD="test" -p 8529:8529 arangodb/arangodb-preview:devel-nightly
docker run -d --name redis -p 6379:6379 redis:7
docker build --no-cache --progress=plain -t bs-parser .
docker run --rm -p 3002:3002 --name bs-parser `
    -v "$(pwd)/settings.prod.yml:/app/settings.yml:ro" `
    bs-parser
```

---

## Пример конфига (settings.yml)

```yml
debug: true
envSecret: "dev-insecure-secret-key-32bytes!"

enableThrift: false
basePath: "big-sister-parser"
host: "http://localhost:3002/"

db:
  debug: true
  host: "host"
  port: 5432
  username: "admin"
  password: "admin"
  database: "big-sister-parser"

arango: {
  url: 'http://localhost:8529',  
  database: 'big-sister-parser',
  username: 'root',
  password: 'test',
}

redis: {
  url: "redis://127.0.0.1:6379"
}

vkApi:
  baseUrl: "https://api.vk.com/method"
  version: "5.131"

token: 
  vkDefault: "vk1.a.abcdef123456..."

```

---

## Пример прод конфига (settings.yml)

```yml
debug: false
envSecret: "prod-insecure-secret-key-32bytes!"

basePath: "big-sister-parser"
host: "http://localhost:3002/"
enableThrift: true

db:
  debug: true
  host: "host.docker.internal"
  port: 5432
  username: "postgres"
  password: "admin"
  database: "big-sister"

arango:
  url: "http://host.docker.internal:8529"
  database: "big-sister-parser"
  username: "root"
  password: "test"

redis:
  url: "redis://host.docker.internal:6379"

vkApi:
  baseUrl: "https://api.vk.com/method"
  version: "5.131"

token: 
  vkDefault: "vk1.a.fEjt5bznMF-MZxX3..."

```

---

## SwaggerUI

Если в настройках установлен `debug: true`, по адресу `/api/v1` доступен SwaggerUI с описанием схемы API. (TODO)

---

## Миграции ArangoDB

Система управления миграциями для ArangoDB с поддержкой наката и отката миграций.

### CLI Команды

#### Накат миграций

Применить все pending миграции:

```bash
npm run migrate
```

#### Откат миграций

Откатить последнюю миграцию:

```bash
npm run migrate:rollback
```

Откатить несколько последних миграций:

```bash
npm run migrate:rollback -- --count 3
```

#### Просмотр статуса

Показать статус всех миграций:

```bash
npm run migrate:status
```

### Создание новой миграции

1. Создайте новый файл в папке `src/migrations/` с именем `{timestamp}-{MigrationName}.ts`
2. Реализуйте методы `up()` и `down()` по образцу существующих миграций
3. Добавьте миграцию в `src/migrations/migration-loader.ts`

Подробная документация: [src/migrations/README.md](src/migrations/README.md)

---
