import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { TOKENS } from "src/common/tokens";

export interface GraphJobStats {
  api_calls: number;
  api_errors: number;
  api_retries: number;
  db_reads: number;
  db_writes: number;
  visited_count: number;
  frontier_size: number;
  level_processed: number;
}

@Injectable()
export class RedisGraphService {
  constructor(@Inject(TOKENS.RedisClient) private readonly redis: Redis) {}

  /**
   * Добавить ID в visited set, возвращает true если элемент был добавлен (новый)
   */
  async addVisited(
    jobId: string,
    userId: number,
    ttl: number,
  ): Promise<boolean> {
    const key = `visited:${jobId}`;
    const result = await this.redis.sadd(key, String(userId));
    if (result === 1) {
      await this.redis.expire(key, ttl);
    }
    return result === 1;
  }

  /**
   * Проверить, был ли ID посещён
   */
  async isVisited(jobId: string, userId: number): Promise<boolean> {
    const key = `visited:${jobId}`;
    const result = await this.redis.sismember(key, String(userId));
    return result === 1;
  }

  /**
   * Получить количество посещённых узлов
   */
  async getVisitedCount(jobId: string): Promise<number> {
    const key = `visited:${jobId}`;
    return await this.redis.scard(key);
  }

  /**
   * Получить все посещённые узлы
   */
  async getVisited(jobId: string): Promise<number[]> {
    const key = `visited:${jobId}`;
    const members = await this.redis.smembers(key);
    return members.map((m) => parseInt(m, 10)).filter((n) => !isNaN(n));
  }

  /**
   * Добавить ID в frontier уровня
   */
  async addToFrontier(
    jobId: string,
    level: number,
    userId: number,
    ttl: number,
  ): Promise<void> {
    const key = `frontier:${jobId}:${level}`;
    await this.redis.sadd(key, String(userId));
    await this.redis.expire(key, ttl);
  }

  /**
   * Получить все ID из frontier уровня
   */
  async getFrontier(jobId: string, level: number): Promise<number[]> {
    const key = `frontier:${jobId}:${level}`;
    const members = await this.redis.smembers(key);
    return members.map((m) => parseInt(m, 10)).filter((n) => !isNaN(n));
  }

  /**
   * Получить размер frontier уровня
   */
  async getFrontierSize(jobId: string, level: number): Promise<number> {
    const key = `frontier:${jobId}:${level}`;
    return await this.redis.scard(key);
  }

  /**
   * Очистить frontier уровня
   */
  async clearFrontier(jobId: string, level: number): Promise<void> {
    const key = `frontier:${jobId}:${level}`;
    await this.redis.del(key);
  }

  /**
   * Попытаться установить lock для fetch операции
   */
  async tryLockFetch(userId: number, ttl: number): Promise<boolean> {
    const key = `locks:fetch:${userId}`;
    const result = await this.redis.set(key, "1", "EX", ttl, "NX");
    return result === "OK";
  }

  /**
   * Освободить lock для fetch операции
   */
  async releaseLockFetch(userId: number): Promise<void> {
    const key = `locks:fetch:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Обновить статистику джоба
   */
  async updateStats(
    jobId: string,
    updates: Partial<GraphJobStats>,
    ttl: number,
  ): Promise<void> {
    const key = `job:stats:${jobId}`;
    const fields: string[] = [];
    const values: string[] = [];

    for (const [field, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(field);
        values.push(String(value));
      }
    }

    if (fields.length > 0) {
      await this.redis.hset(key, ...fields.flatMap((f, i) => [f, values[i]]));
      await this.redis.expire(key, ttl);
    }
  }

  /**
   * Инкрементировать счётчик в статистике
   */
  async incrStats(
    jobId: string,
    field: keyof GraphJobStats,
    by: number = 1,
    ttl: number = 3600,
  ): Promise<void> {
    const key = `job:stats:${jobId}`;
    await this.redis.hincrby(key, field, by);
    await this.redis.expire(key, ttl);
  }

  /**
   * Получить статистику джоба
   */
  async getStats(jobId: string): Promise<Partial<GraphJobStats>> {
    const key = `job:stats:${jobId}`;
    const data = await this.redis.hgetall(key);
    const stats: Partial<GraphJobStats> = {};

    for (const [field, value] of Object.entries(data)) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        (stats as any)[field] = numValue;
      }
    }

    return stats;
  }

  /**
   * Сохранить прогресс джоба
   */
  async saveProgress(
    jobId: string,
    level: number,
    batchIndex: number,
    ttl: number,
  ): Promise<void> {
    const key = `job:progress:${jobId}`;
    await this.redis.hset(
      key,
      "level",
      String(level),
      "batch_index",
      String(batchIndex),
    );
    await this.redis.expire(key, ttl);
  }

  /**
   * Получить прогресс джоба
   */
  async getProgress(
    jobId: string,
  ): Promise<{ level: number; batchIndex: number } | null> {
    const key = `job:progress:${jobId}`;
    const data = await this.redis.hgetall(key);
    if (!data.level) return null;

    return {
      level: parseInt(data.level, 10),
      batchIndex: parseInt(data.batch_index || "0", 10),
    };
  }

  /**
   * Очистить все данные джоба
   */
  async cleanupJob(jobId: string): Promise<void> {
    const pattern = `*:${jobId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
