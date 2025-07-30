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
host: "http://localhost:3000/"

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

vkApi:
  baseUrl: "https://api.vk.com/method"
  version: "5.131"

```

---

## SwaggerUI

Если в настройках установлен `debug: true`, по адресу `/api/v1` доступен SwaggerUI с описанием схемы API. (TODO)

---
