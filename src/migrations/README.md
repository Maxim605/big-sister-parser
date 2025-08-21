# ArangoDB Migration System

Система управления миграциями для ArangoDB с поддержкой наката и отката миграций.

## CLI Команды

### Накат миграций

Применить все pending миграции:

```bash
npm run migrate
```

### Откат миграций

Откатить последнюю миграцию:

```bash
npm run migrate:rollback
```

Откатить несколько последних миграций:

```bash
npm run migrate:rollback -- --count 3
```

### Просмотр статуса

Показать статус всех миграций:

```bash
npm run migrate:status
```

## Структура миграции

Каждая миграция должна иметь следующую структуру:

```typescript
import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

class MigrationName {
  private db: Database;

  constructor() {
    this.db = new Database({
      url: settings.arango.url,
      databaseName: settings.arango.database,
      auth: {
        username: settings.arango.username,
        password: settings.arango.password,
      },
    });
  }

  async up(): Promise<void> {
    // Логика наката миграции
  }

  async down(): Promise<void> {
    // Логика отката миграции
  }
}

export const migrationName = new MigrationName();
```

## Создание новой миграции

1. Создайте новый файл в папке `src/migrations/` с именем `{timestamp}-{MigrationName}.ts`
2. Реализуйте методы `up()` и `down()`
3. Добавьте миграцию в `migration-loader.ts`

## Примеры

### Создание коллекции

```typescript
async up(): Promise<void> {
  const collection = this.db.collection('new_collection');
  if (!(await collection.exists())) {
    await this.db.createCollection('new_collection');
  }
}

async down(): Promise<void> {
  const collection = this.db.collection('new_collection');
  if (await collection.exists()) {
    await collection.drop();
  }
}
```

### Создание индекса

```typescript
async up(): Promise<void> {
  const collection = this.db.collection('users');
  await collection.ensureIndex({
    type: 'persistent',
    fields: ['email'],
    unique: true
  });
}

async down(): Promise<void> {
  const collection = this.db.collection('users');
  await collection.dropIndex('email');
}
```

## Безопасность

- Все миграции выполняются в транзакциях
- При ошибке в любой миграции весь процесс откатывается
- Система ведет журнал примененных миграций в коллекции `migrations` 