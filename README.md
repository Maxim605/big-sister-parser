Бэкенд парсера big-siser 

**Технологии:** NestJS + gRPC

Документация API: [http://localhost:3002/api/v1](http://localhost:3002/api/v1)

---

## Перед запуском

1. Установите [apache thrift](https://thrift.apache.org/download), если он не установлен. рекомендованная версия 0.22.0
2. Разверните контейнеры Arango, Redis и запустите их (см. пункт "Запуск с помощью docker-compose")
3. Скопируйте файл конфигурации `settings-example.yml` в корень репозитория как `settings.yml` и при необходимости измените параметры. Настоятельно рекомендуется получить API токены соц сетей и заблаговременно добавить их в settings.yml (раздел token) - без них приложение бесполезно. 
4. Проверьте, что в Arango инициализированна база данных с именем, указанным в settings.yml. GUI бд доступно по адресу [http://localhost:8529/_db/_system/_admin/aardvark/index.html#login](http://localhost:8529/_db/_system/_admin/aardvark/index.html#login)
5. Накатите миграции ArangoDB:
```bash
npm run migrate
```
6. Установите зависимости:
```bash
npm install
```
7. Запустите приложение

---

## Запуск приложения

- В режиме отладки (рекомендуется):

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
docker run -d --name arangodb --memory=150g --memory-swap=150g -e ARANGO_ROOT_PASSWORD="test" -e ARANGODB_OVERRIDE_DETECTED_TOTAL_MEMORY=245G -v arangodb-data:/var/lib/arangodb3 -p 8529:8529 arangodb/arangodb-preview:devel-nightly
docker run -d --name redis --memory=6g --memory-swap=6g -p 6379:6379 redis:7
docker build --no-cache --progress=plain -t bs-parser .
docker run --rm -p 3002:3002 --name bs-parser `
    -v "$(pwd)/settings.prod.yml:/app/settings.yml:ro" `
    bs-parser
```
### Примечание - для загрузки debian bookworm может потребоваться VPN

---

## SwaggerUI

Если в настройках (settings.yml) установлен `debug: true`, по адресу `/api/v1` доступен SwaggerUI с описанием схемы API.

---

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
