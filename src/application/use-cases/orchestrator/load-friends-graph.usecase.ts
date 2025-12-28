import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkApiClient } from "src/application/ports/vk-api.client";
import { TOKENS } from "src/common/tokens";
import { IFriendshipRepository } from "src/domain/repositories/ifriendship.repository";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import { VkApiError } from "src/infrastructure/vk/types";
import { RedisGraphService } from "src/infrastructure/redis/redis-graph.service";
import { VkUser } from "src/domain/entities/vk-user";
import { Observable, Subject } from "rxjs";
import { Semaphore } from "./semaphore";
import { LoadFriendsGraphParams } from "./dto/load-friends-graph-params.interface";
import { LoadFriendsGraphResult } from "./dto/load-friends-graph-result.interface";
import { GraphEvent } from "./dto/graph-event.interface";
import { FriendBatchEvent } from "./dto/friend-batch-event.interface";
import { LevelCompleteEvent } from "./dto/level-complete-event.interface";
import { JobCompleteEvent } from "./dto/job-complete-event.interface";

@Injectable()
export class LoadFriendsGraphUseCase {
  private readonly logger = new Logger(LoadFriendsGraphUseCase.name);

  constructor(
    @Inject("IVkApiClient") private readonly api: IVkApiClient,
    @Inject(TOKENS.IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(TOKENS.IFriendshipRepository)
    private readonly friendshipRepository: IFriendshipRepository,
    private readonly redisGraph: RedisGraphService,
  ) {}

  async execute(
    params: LoadFriendsGraphParams,
  ): Promise<LoadFriendsGraphResult | Observable<GraphEvent>> {
    const {
      start_id,
      max_depth = 1,
      rewrite = false,
      mode,
      db_batch_size = 500,
      api_batch_size = 100,
      api_concurrency = 16,
      worker_count = 8,
      api_timeout_ms = 30000,
      max_retries = 3,
      backoff_base_ms = 500,
      redis_namespace = "graph",
      job_ttl = 3600,
      access_token,
      fields,
      name_case,
    } = params;

    const jobId = `${redis_namespace}:${Date.now()}:${start_id}`;
    const effectiveMaxDepth =
      max_depth === null || max_depth === undefined ? 1 : max_depth;

    if (mode === "stream") {
      const subject = new Subject<GraphEvent>();
      this.executeStream(
        jobId,
        start_id,
        effectiveMaxDepth,
        rewrite,
        db_batch_size,
        api_batch_size,
        api_concurrency,
        worker_count,
        api_timeout_ms,
        max_retries,
        backoff_base_ms,
        job_ttl,
        access_token,
        fields,
        name_case,
        subject,
      ).catch((err) => {
        this.logger.error(`Stream execution failed: ${err.message}`, err.stack);
        subject.error(err);
      });
      return new Observable((subscriber) => {
        subject.subscribe(subscriber);
      });
    }

    const result = await this.executeSyncOrAsync(
      jobId,
      start_id,
      effectiveMaxDepth,
      rewrite,
      mode,
      db_batch_size,
      api_batch_size,
      api_concurrency,
      worker_count,
      api_timeout_ms,
      max_retries,
      backoff_base_ms,
      job_ttl,
      access_token,
      fields,
      name_case,
    );

    return result;
  }

  private async ensureRootUser(userId: number): Promise<void> {
    try {
      const existing = await this.userRepository.findById(userId);
      if (!existing) {
        this.logger.log(
          `Root user ${userId} not found in DB, creating placeholder`,
        );
        await this.userRepository.save(new VkUser(userId, "", ""));
      }
    } catch (e) {
      this.logger.warn(`Failed to ensure root user ${userId}: ${e}`);
    }
  }

  private async executeSyncOrAsync(
    jobId: string,
    startId: number,
    maxDepth: number,
    rewrite: boolean,
    mode: "sync" | "async",
    dbBatchSize: number,
    apiBatchSize: number,
    apiConcurrency: number,
    workerCount: number,
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
  ): Promise<LoadFriendsGraphResult> {
    await this.ensureRootUser(startId);
    await this.redisGraph.addVisited(jobId, startId, jobTtl);
    await this.redisGraph.addToFrontier(jobId, 1, startId, jobTtl);
    await this.redisGraph.updateStats(
      jobId,
      { level_processed: 0, visited_count: 1 },
      jobTtl,
    );

    let currentLevel = 1;
    const visitedIds: number[] = [startId];

    while (currentLevel <= maxDepth) {
      const levelStartTime = Date.now();
      this.logger.log(
        `Processing level ${currentLevel}/${maxDepth} for job ${jobId}`,
      );

      const frontier = await this.redisGraph.getFrontier(jobId, currentLevel);
      if (frontier.length === 0) {
        this.logger.log(`Frontier empty at level ${currentLevel}, stopping`);
        break;
      }

      this.logger.log(
        `Frontier size at level ${currentLevel}: ${frontier.length}`,
      );

      // Сохраняем прогресс перед обработкой уровня
      await this.redisGraph.saveProgress(jobId, currentLevel, 0, jobTtl);

      // Обработка уровня
      if (mode === "sync") {
        await this.processLevelSync(
          jobId,
          currentLevel,
          frontier,
          rewrite,
          dbBatchSize,
          apiBatchSize,
          apiTimeoutMs,
          maxRetries,
          backoffBaseMs,
          jobTtl,
          accessToken,
          fields,
          nameCase,
        );
      } else {
        await this.processLevelAsync(
          jobId,
          currentLevel,
          frontier,
          rewrite,
          dbBatchSize,
          apiBatchSize,
          apiConcurrency,
          workerCount,
          apiTimeoutMs,
          maxRetries,
          backoffBaseMs,
          jobTtl,
          accessToken,
          fields,
          nameCase,
        );
      }

      // Получить следующий frontier
      const nextLevel = currentLevel + 1;
      const nextFrontier: number[] = [];
      const visitedSet = new Set(visitedIds);

      // Собрать кандидатов из друзей обработанных узлов
      // Получаем друзей из БД (для всех узлов, включая haveLocal и только что загруженные)
      const processedUsers = await this.friendshipRepository.findFriendIdsMany(
        frontier,
      );
      for (const [userId, friendIds] of processedUsers.entries()) {
        for (const friendId of friendIds) {
          if (!visitedSet.has(friendId)) {
            const isNew = await this.redisGraph.addVisited(
              jobId,
              friendId,
              jobTtl,
            );
            if (isNew) {
              nextFrontier.push(friendId);
              visitedIds.push(friendId);
              visitedSet.add(friendId);
            }
          }
        }
      }

      // Добавить в frontier следующего уровня
      for (const candidateId of nextFrontier) {
        await this.redisGraph.addToFrontier(
          jobId,
          nextLevel,
          candidateId,
          jobTtl,
        );
      }

      const levelLatency = Date.now() - levelStartTime;
      this.logger.log(
        `Level ${currentLevel} completed in ${levelLatency}ms, next frontier size: ${nextFrontier.length}`,
      );

      // Сохраняем прогресс после завершения уровня
      await this.redisGraph.saveProgress(jobId, currentLevel, 0, jobTtl);
      await this.redisGraph.updateStats(
        jobId,
        {
          level_processed: currentLevel,
          frontier_size: nextFrontier.length,
          visited_count: visitedIds.length,
        },
        jobTtl,
      );

      if (nextFrontier.length === 0) {
        this.logger.log(
          `Next frontier empty, stopping at level ${currentLevel}`,
        );
        break;
      }

      currentLevel++;
    }

    const stats = await this.redisGraph.getStats(jobId);
    const finalVisited = await this.redisGraph.getVisited(jobId);

    return {
      job_id: jobId,
      visited_count: finalVisited.length,
      levels_processed: currentLevel - 1,
      stats: {
        api_calls: stats.api_calls || 0,
        api_errors: stats.api_errors || 0,
        api_retries: stats.api_retries || 0,
        db_reads: stats.db_reads || 0,
        db_writes: stats.db_writes || 0,
      },
      visited_ids: finalVisited,
    };
  }

  private async processLevelSync(
    jobId: string,
    level: number,
    frontier: number[],
    rewrite: boolean,
    dbBatchSize: number,
    apiBatchSize: number,
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
  ): Promise<void> {
    // Разбить frontier на батчи
    const batches: number[][] = [];
    for (let i = 0; i < frontier.length; i += dbBatchSize) {
      batches.push(frontier.slice(i, i + dbBatchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      await this.redisGraph.incrStats(jobId, "db_reads", 1, jobTtl);

      // Читаем статусы из БД
      const statusMap = await this.userRepository.findFriendsStatusByIds(batch);
      const haveLocal: number[] = [];
      const needFetch: number[] = [];

      for (const userId of batch) {
        const status = statusMap.get(userId);
        if (!rewrite && status?.status === "ok") {
          haveLocal.push(userId);
        } else {
          needFetch.push(userId);
        }
      }

      // Обработка needFetch батчами
      for (let i = 0; i < needFetch.length; i += apiBatchSize) {
        const apiBatch = needFetch.slice(i, i + apiBatchSize);
        try {
          await this.fetchAndSaveBatch(
            jobId,
            level,
            batchIndex,
            apiBatch,
            apiTimeoutMs,
            maxRetries,
            backoffBaseMs,
            jobTtl,
            accessToken,
            fields,
            nameCase,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to process API batch ${
              i / apiBatchSize + 1
            } for level ${level}, batch ${batchIndex}: ${
              error?.message || error
            }`,
          );
          // Продолжаем обработку следующих батчей
        }
      }

      // Для haveLocal друзья уже в БД, они будут обработаны при формировании следующего frontier

      // Логируем прогресс каждые 10 батчей
      if ((batchIndex + 1) % 10 === 0) {
        this.logger.debug(
          `Level ${level}: processed ${batchIndex + 1}/${
            batches.length
          } DB batches`,
        );
      }
    }
  }

  private async processLevelAsync(
    jobId: string,
    level: number,
    frontier: number[],
    rewrite: boolean,
    dbBatchSize: number,
    apiBatchSize: number,
    apiConcurrency: number,
    workerCount: number,
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
  ): Promise<void> {
    // Разбить frontier на батчи
    const batches: number[][] = [];
    for (let i = 0; i < frontier.length; i += dbBatchSize) {
      batches.push(frontier.slice(i, i + dbBatchSize));
    }

    this.logger.log(
      `Processing level ${level} (async): ${frontier.length} nodes in ${batches.length} DB batches`,
    );

    const semaphore = new Semaphore(apiConcurrency);
    const allPromises: Promise<void>[] = [];
    let processedBatches = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      await this.redisGraph.incrStats(jobId, "db_reads", 1, jobTtl);

      // Читаем статусы из БД
      const statusMap = await this.userRepository.findFriendsStatusByIds(batch);
      const haveLocal: number[] = [];
      const needFetch: number[] = [];

      for (const userId of batch) {
        const status = statusMap.get(userId);
        if (!rewrite && status?.status === "ok") {
          haveLocal.push(userId);
        } else {
          needFetch.push(userId);
        }
      }

      // Обработка needFetch батчами с параллелизмом
      for (let i = 0; i < needFetch.length; i += apiBatchSize) {
        const apiBatch = needFetch.slice(i, i + apiBatchSize);
        allPromises.push(
          (async () => {
            await semaphore.acquire();
            try {
              await this.fetchAndSaveBatch(
                jobId,
                level,
                batchIndex,
                apiBatch,
                apiTimeoutMs,
                maxRetries,
                backoffBaseMs,
                jobTtl,
                accessToken,
                fields,
                nameCase,
              );
              processedBatches++;
              if (processedBatches % 10 === 0) {
                this.logger.debug(
                  `Level ${level}: processed ${processedBatches} API batches`,
                );
              }
            } catch (error: any) {
              this.logger.error(
                `Failed to process API batch for level ${level}: ${
                  error?.message || error
                }`,
              );
            } finally {
              semaphore.release();
            }
          })(),
        );
      }

      // Для haveLocal друзья уже в БД, они будут обработаны при формировании следующего frontier
    }

    this.logger.log(
      `Level ${level}: waiting for ${allPromises.length} API batch promises`,
    );
    const results = await Promise.allSettled(allPromises);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      this.logger.warn(`Level ${level}: ${failed} API batches failed`);
    }
  }

  private async fetchAndSaveBatch(
    jobId: string,
    level: number,
    batchIndex: number,
    userIds: number[],
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
  ): Promise<Map<number, number[]>> {
    const results = new Map<number, number[]>();
    const pageSize = 5000;

    for (const userId of userIds) {
      // Проверка lock
      const lockAcquired = await this.redisGraph.tryLockFetch(userId, 60);
      if (!lockAcquired) {
        continue;
      }

      try {
        let attempt = 0;
        let success = false;
        const allFriendIds: number[] = [];
        const allUsersToUpsert: Array<VkUser & Record<string, any>> = [];

        while (attempt <= maxRetries && !success) {
          try {
            // Обработка пагинации с промежуточным сохранением
            let offset = 0;
            let total = 0;
            let hasMore = true;
            const saveBatchSize = 500; // Сохраняем каждые 500 пользователей

            while (hasMore) {
              await this.redisGraph.incrStats(jobId, "api_calls", 1, jobTtl);
              if (attempt > 0 && offset === 0) {
                await this.redisGraph.incrStats(
                  jobId,
                  "api_retries",
                  1,
                  jobTtl,
                );
              }

              const response = await Promise.race([
                this.api.friendsGet({
                  user_id: userId,
                  access_token: accessToken,
                  fields: fields,
                  name_case: nameCase as
                    | "nom"
                    | "gen"
                    | "dat"
                    | "acc"
                    | "ins"
                    | "abl"
                    | undefined,
                  count: pageSize,
                  offset: offset,
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("API timeout")),
                    apiTimeoutMs,
                  ),
                ),
              ]);

              if (offset === 0) {
                total = response.count || 0;
              }

              const friendIds: number[] = [];
              const usersToUpsert: Array<VkUser & Record<string, any>> = [];

              if (Array.isArray(response.items)) {
                for (const item of response.items) {
                  if (typeof item === "number") {
                    friendIds.push(item);
                    usersToUpsert.push(
                      new VkUser(item, "", "") as VkUser & Record<string, any>,
                    );
                  } else if (item && typeof item === "object" && "id" in item) {
                    friendIds.push(item.id);
                    const user = new VkUser(
                      item.id,
                      item.first_name || "",
                      item.last_name || "",
                      (item as any).domain,
                    ) as VkUser & Record<string, any>;

                    // Сохраняем все дополнительные поля из ответа API
                    for (const key in item) {
                      if (
                        key !== "id" &&
                        key !== "first_name" &&
                        key !== "last_name" &&
                        key !== "domain" &&
                        item.hasOwnProperty(key)
                      ) {
                        const value = (item as any)[key];
                        if (value !== undefined) {
                          user[key] = value;
                        }
                      }
                    }

                    usersToUpsert.push(user);
                  }
                }
              }

              allFriendIds.push(...friendIds);
              allUsersToUpsert.push(...usersToUpsert);

              // Промежуточное сохранение для больших списков
              if (allUsersToUpsert.length >= saveBatchSize) {
                try {
                  await this.userRepository.saveMany(allUsersToUpsert);
                  await this.redisGraph.incrStats(
                    jobId,
                    "db_writes",
                    1,
                    jobTtl,
                  );
                  // Очищаем сохранённых пользователей, но оставляем friendIds
                  allUsersToUpsert.length = 0;
                } catch (saveError: any) {
                  this.logger.error(
                    `Failed to save intermediate batch for user ${userId}: ${
                      saveError?.message || saveError
                    }`,
                  );
                  // Продолжаем, попробуем сохранить в конце
                }
              }

              if (
                !response.items ||
                response.items.length < pageSize ||
                (total > 0 && offset + response.items.length >= total)
              ) {
                hasMore = false;
              } else {
                offset += response.items.length;
              }
            }

            // Сохранить оставшихся пользователей и друзей
            if (allUsersToUpsert.length > 0) {
              try {
                await this.userRepository.saveMany(allUsersToUpsert);
                await this.redisGraph.incrStats(jobId, "db_writes", 1, jobTtl);
              } catch (saveError: any) {
                this.logger.error(
                  `Failed to save final batch for user ${userId}: ${
                    saveError?.message || saveError
                  }`,
                );
                throw saveError;
              }
            }

            // Сохранить связи друзей
            if (allFriendIds.length > 0) {
              try {
                await this.friendshipRepository.replaceForUser(
                  userId,
                  allFriendIds,
                );
                await this.userRepository.updateFriendsAdded(
                  userId,
                  new Date(),
                );
                await this.redisGraph.incrStats(jobId, "db_writes", 1, jobTtl);
              } catch (saveError: any) {
                this.logger.error(
                  `Failed to save friendships for user ${userId}: ${
                    saveError?.message || saveError
                  }`,
                );
                // Не бросаем ошибку, чтобы не потерять уже сохранённых пользователей
              }
            } else {
              // Даже если нет друзей, обновляем статус
              await this.userRepository.updateFriendsAdded(userId, new Date());
            }

            results.set(userId, allFriendIds);
            success = true;
          } catch (error: any) {
            attempt++;
            const isVkError = error instanceof VkApiError;
            const isTransient =
              isVkError &&
              (error.code === 6 || error.code === 9 || error.code >= 500);
            const isPermanent = isVkError && !isTransient;

            if (isPermanent || attempt > maxRetries) {
              await this.redisGraph.incrStats(jobId, "api_errors", 1, jobTtl);
              const errorCode = isVkError ? error.code : undefined;
              if (errorCode !== undefined) {
                await this.userRepository.updateFriendsAdded(
                  userId,
                  `err:${errorCode}`,
                );
              }
              results.set(userId, []);
              success = true; // Помечаем как обработанное, чтобы не ретраить
            } else if (isTransient && attempt <= maxRetries) {
              const backoff = backoffBaseMs * Math.pow(2, attempt - 1);
              await new Promise((resolve) => setTimeout(resolve, backoff));
            } else {
              throw error;
            }
          }
        }
      } finally {
        await this.redisGraph.releaseLockFetch(userId);
      }
    }

    return results;
  }

  private async executeStream(
    jobId: string,
    startId: number,
    maxDepth: number,
    rewrite: boolean,
    dbBatchSize: number,
    apiBatchSize: number,
    apiConcurrency: number,
    workerCount: number,
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
    subject?: Subject<GraphEvent>,
  ): Promise<void> {
    await this.ensureRootUser(startId);
    await this.redisGraph.addVisited(jobId, startId, jobTtl);
    await this.redisGraph.addToFrontier(jobId, 1, startId, jobTtl);
    await this.redisGraph.updateStats(
      jobId,
      { level_processed: 0, visited_count: 1 },
      jobTtl,
    );

    let currentLevel = 1;
    const visitedIds: number[] = [startId];

    while (currentLevel <= maxDepth) {
      const frontier = await this.redisGraph.getFrontier(jobId, currentLevel);
      if (frontier.length === 0) {
        break;
      }

      // Обработка уровня с эмиссией событий
      await this.processLevelStream(
        jobId,
        currentLevel,
        frontier,
        rewrite,
        dbBatchSize,
        apiBatchSize,
        apiConcurrency,
        apiTimeoutMs,
        maxRetries,
        backoffBaseMs,
        jobTtl,
        accessToken,
        fields,
        nameCase,
        subject,
      );

      // Получить следующий frontier
      const nextLevel = currentLevel + 1;
      const nextFrontier: number[] = [];
      const visitedSet = new Set(visitedIds);

      const processedUsers = await this.friendshipRepository.findFriendIdsMany(
        frontier,
      );
      for (const [userId, friendIds] of processedUsers.entries()) {
        for (const friendId of friendIds) {
          if (!visitedSet.has(friendId)) {
            const isNew = await this.redisGraph.addVisited(
              jobId,
              friendId,
              jobTtl,
            );
            if (isNew) {
              nextFrontier.push(friendId);
              visitedIds.push(friendId);
            }
          }
        }
      }

      for (const candidateId of nextFrontier) {
        await this.redisGraph.addToFrontier(
          jobId,
          nextLevel,
          candidateId,
          jobTtl,
        );
      }

      if (subject) {
        subject.next({
          job_id: jobId,
          level: currentLevel,
          frontier_size: nextFrontier.length,
          visited_count: visitedIds.length,
        } as LevelCompleteEvent);
      }

      if (nextFrontier.length === 0) {
        break;
      }

      currentLevel++;
    }

    const stats = await this.redisGraph.getStats(jobId);
    const finalVisited = await this.redisGraph.getVisited(jobId);

    if (subject) {
      subject.next({
        job_id: jobId,
        visited_count: finalVisited.length,
        levels_processed: currentLevel - 1,
        stats: {
          api_calls: stats.api_calls || 0,
          api_errors: stats.api_errors || 0,
          api_retries: stats.api_retries || 0,
          db_reads: stats.db_reads || 0,
          db_writes: stats.db_writes || 0,
        },
      } as JobCompleteEvent);
      subject.complete();
    }
  }

  private async processLevelStream(
    jobId: string,
    level: number,
    frontier: number[],
    rewrite: boolean,
    dbBatchSize: number,
    apiBatchSize: number,
    apiConcurrency: number,
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
    subject?: Subject<GraphEvent>,
  ): Promise<void> {
    const batches: number[][] = [];
    for (let i = 0; i < frontier.length; i += dbBatchSize) {
      batches.push(frontier.slice(i, i + dbBatchSize));
    }

    const semaphore = new Semaphore(apiConcurrency);
    const allPromises: Promise<void>[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      await this.redisGraph.incrStats(jobId, "db_reads", 1, jobTtl);

      const statusMap = await this.userRepository.findFriendsStatusByIds(batch);
      const haveLocal: number[] = [];
      const needFetch: number[] = [];

      for (const userId of batch) {
        const status = statusMap.get(userId);
        if (!rewrite && status?.status === "ok") {
          haveLocal.push(userId);
        } else {
          needFetch.push(userId);
        }
      }

      // Эмитировать события для haveLocal
      for (const userId of haveLocal) {
        const friendIds = await this.friendshipRepository.findFriendIds(userId);
        if (subject) {
          subject.next({
            job_id: jobId,
            level,
            source_id: userId,
            batch_index: batchIndex,
            friends: friendIds,
            status: "ok",
          } as FriendBatchEvent);
        }
      }

      // Обработка needFetch с эмиссией
      for (let i = 0; i < needFetch.length; i += apiBatchSize) {
        const apiBatch = needFetch.slice(i, i + apiBatchSize);
        allPromises.push(
          (async () => {
            await semaphore.acquire();
            try {
              await this.fetchAndSaveBatchStream(
                jobId,
                level,
                batchIndex,
                apiBatch,
                apiTimeoutMs,
                maxRetries,
                backoffBaseMs,
                jobTtl,
                accessToken,
                fields,
                nameCase,
                subject,
              );
            } finally {
              semaphore.release();
            }
          })(),
        );
      }
    }

    await Promise.allSettled(allPromises);
  }

  private async fetchAndSaveBatchStream(
    jobId: string,
    level: number,
    batchIndex: number,
    userIds: number[],
    apiTimeoutMs: number,
    maxRetries: number,
    backoffBaseMs: number,
    jobTtl: number,
    accessToken: string,
    fields?: string[],
    nameCase?: string,
    subject?: Subject<GraphEvent>,
  ): Promise<void> {
    const pageSize = 5000;

    for (const userId of userIds) {
      const lockAcquired = await this.redisGraph.tryLockFetch(userId, 60);
      if (!lockAcquired) {
        continue;
      }

      try {
        let attempt = 0;
        let success = false;
        const allFriendIds: number[] = [];
        const allUsersToUpsert: Array<VkUser & Record<string, any>> = [];

        while (attempt <= maxRetries && !success) {
          try {
            // Обработка пагинации с промежуточным сохранением
            let offset = 0;
            let total = 0;
            let hasMore = true;
            const saveBatchSize = 500; // Сохраняем каждые 500 пользователей

            while (hasMore) {
              await this.redisGraph.incrStats(jobId, "api_calls", 1, jobTtl);
              if (attempt > 0 && offset === 0) {
                await this.redisGraph.incrStats(
                  jobId,
                  "api_retries",
                  1,
                  jobTtl,
                );
              }

              const response = await Promise.race([
                this.api.friendsGet({
                  user_id: userId,
                  access_token: accessToken,
                  fields: fields,
                  name_case: nameCase as
                    | "nom"
                    | "gen"
                    | "dat"
                    | "acc"
                    | "ins"
                    | "abl"
                    | undefined,
                  count: pageSize,
                  offset: offset,
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("API timeout")),
                    apiTimeoutMs,
                  ),
                ),
              ]);

              if (offset === 0) {
                total = response.count || 0;
              }

              const friendIds: number[] = [];
              const usersToUpsert: Array<VkUser & Record<string, any>> = [];

              if (Array.isArray(response.items)) {
                for (const item of response.items) {
                  if (typeof item === "number") {
                    friendIds.push(item);
                    usersToUpsert.push(
                      new VkUser(item, "", "") as VkUser & Record<string, any>,
                    );
                  } else if (item && typeof item === "object" && "id" in item) {
                    friendIds.push(item.id);
                    const user = new VkUser(
                      item.id,
                      item.first_name || "",
                      item.last_name || "",
                      (item as any).domain,
                    ) as VkUser & Record<string, any>;

                    // Сохраняем все дополнительные поля из ответа API
                    for (const key in item) {
                      if (
                        key !== "id" &&
                        key !== "first_name" &&
                        key !== "last_name" &&
                        key !== "domain" &&
                        item.hasOwnProperty(key)
                      ) {
                        const value = (item as any)[key];
                        if (value !== undefined) {
                          user[key] = value;
                        }
                      }
                    }

                    usersToUpsert.push(user);
                  }
                }
              }

              allFriendIds.push(...friendIds);
              allUsersToUpsert.push(...usersToUpsert);

              // Промежуточное сохранение для больших списков
              if (allUsersToUpsert.length >= saveBatchSize) {
                try {
                  await this.userRepository.saveMany(allUsersToUpsert);
                  await this.redisGraph.incrStats(
                    jobId,
                    "db_writes",
                    1,
                    jobTtl,
                  );
                  // Очищаем сохранённых пользователей, но оставляем friendIds
                  allUsersToUpsert.length = 0;
                } catch (saveError: any) {
                  this.logger.error(
                    `Failed to save intermediate batch for user ${userId}: ${
                      saveError?.message || saveError
                    }`,
                  );
                  // Продолжаем, попробуем сохранить в конце
                }
              }

              if (
                !response.items ||
                response.items.length < pageSize ||
                (total > 0 && offset + response.items.length >= total)
              ) {
                hasMore = false;
              } else {
                offset += response.items.length;
              }
            }

            // Сохранить оставшихся пользователей и друзей
            if (allUsersToUpsert.length > 0) {
              try {
                await this.userRepository.saveMany(allUsersToUpsert);
                await this.redisGraph.incrStats(jobId, "db_writes", 1, jobTtl);
              } catch (saveError: any) {
                this.logger.error(
                  `Failed to save final batch for user ${userId}: ${
                    saveError?.message || saveError
                  }`,
                );
                throw saveError;
              }
            }

            // Сохранить связи друзей
            if (allFriendIds.length > 0) {
              try {
                await this.friendshipRepository.replaceForUser(
                  userId,
                  allFriendIds,
                );
                await this.userRepository.updateFriendsAdded(
                  userId,
                  new Date(),
                );
                await this.redisGraph.incrStats(jobId, "db_writes", 1, jobTtl);
              } catch (saveError: any) {
                this.logger.error(
                  `Failed to save friendships for user ${userId}: ${
                    saveError?.message || saveError
                  }`,
                  saveError?.stack,
                );
                // Не бросаем ошибку, чтобы не потерять уже сохранённых пользователей
              }
            } else {
              // Даже если нет друзей, обновляем статус
              await this.userRepository.updateFriendsAdded(userId, new Date());
            }

            if (subject) {
              subject.next({
                job_id: jobId,
                level,
                source_id: userId,
                batch_index: batchIndex,
                friends: allFriendIds,
                status: "ok",
              } as FriendBatchEvent);
            }

            success = true;
          } catch (error: any) {
            attempt++;
            const isVkError = error instanceof VkApiError;
            const isTransient =
              isVkError &&
              (error.code === 6 || error.code === 9 || error.code >= 500);
            const isPermanent = isVkError && !isTransient;

            if (isPermanent || attempt > maxRetries) {
              await this.redisGraph.incrStats(jobId, "api_errors", 1, jobTtl);
              const errorCode = isVkError ? error.code : undefined;
              if (errorCode !== undefined) {
                await this.userRepository.updateFriendsAdded(
                  userId,
                  `err:${errorCode}`,
                );
              }

              if (subject) {
                subject.next({
                  job_id: jobId,
                  level,
                  source_id: userId,
                  batch_index: batchIndex,
                  friends: [],
                  status: "error",
                  error_code: errorCode?.toString(),
                } as FriendBatchEvent);
              }

              success = true;
            } else if (isTransient && attempt <= maxRetries) {
              const backoff = backoffBaseMs * Math.pow(2, attempt - 1);
              await new Promise((resolve) => setTimeout(resolve, backoff));
            } else {
              throw error;
            }
          }
        }
      } finally {
        await this.redisGraph.releaseLockFetch(userId);
      }
    }
  }
}
