# Личный кабинет студента и сотрудника

Бэкенд парсера big-siser 

**Технологии:** NestJS + gRPC

Документация API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

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

## CLI-команды

CLI-команды позволяют выполнять действия приложения через консоль с необходимыми зависимостями.

### Запуск команды

- Через ts-node:

```bash
npx ts-node -r tsconfig-paths/register src/cli.ts <НАЗВАНИЕ_КОМАНДЫ> [<ПАРАМЕТРЫ>] [АРГУМЕНТЫ]
```

- Через npm-скрипт (рекомендуется):

```bash
npm run cli <НАЗВАНИЕ_КОМАНДЫ> -- [<ПАРАМЕТРЫ>] [АРГУМЕНТЫ]
```

- Для справки по команде:

```bash
npm run cli <НАЗВАНИЕ_КОМАНДЫ> --help
```


## Запуск с помощью docker-compose

Для одновременного запуска базы данных и бэкенда выполните:

```bash
docker-compose up -d (TODO)
```

---

## Пример конфига (settings.yml)

```yml
debug: true

basePath: "big-sister-parser"
host: "TODO"

db:
  debug: false
  host: "host"
  port: 5432
  username: "admin"
  password: "admin"
  database: "big-sister-parser-v1"
  
grpc:
  url: "http://127.0.0.1:8529"
  database: "_system"
  username: "root"
  password: "test"
  package: 'arango'
  protoPath: '../proto/arango.proto'
```

---

## SwaggerUI

Если в настройках установлен `debug: true`, по адресу `/api/v1` доступен SwaggerUI с описанием схемы API. (TODO)

---
