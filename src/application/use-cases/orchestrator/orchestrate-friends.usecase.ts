import { Injectable, Inject, Logger } from "@nestjs/common";
import { FetchVkFriendsUseCase } from "../vk-friends/fetch-vk-friends.usecase";
import { GetVkFriendsUseCase } from "../vk-friends/get-vk-friends.usecase";
import { LoadVkFriendsUseCase } from "../vk-friends/load-vk-friends.usecase";
import { VkFriendsGetParams, VkApiError } from "src/infrastructure/vk/types";
import { TOKENS } from "src/common/tokens";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import settings from "src/settings";

class Semaphore {
  private queue: Array<() => void> = [];
  private counter: number;
  constructor(private readonly limit: number) {
    this.counter = limit;
  }
  async acquire(): Promise<void> {
    if (this.counter > 0) {
      this.counter--;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }
  release() {
    this.counter++;
    if (this.counter > this.limit) this.counter = this.limit;
    const r = this.queue.shift();
    if (r) {
      this.counter--;
      r();
    }
  }
}

export interface OrchestrateFriendsParams {
  userIds: number[];
  batchSize?: number;
  concurrency?: number;
  mode: "fetch" | "load" | "get";
  params?: Partial<VkFriendsGetParams>;
  onProgress?: (info: {
    processed: number;
    total: number;
    currentUserId?: number;
    success?: boolean;
    error?: string;
  }) => void | Promise<void>;
}

export interface UserFriendsResult {
  userId: number;
  success: boolean;
  error?: string;
  data?: any;
}

export interface OrchestrateFriendsResult {
  processed: number;
  failed: number;
  results: UserFriendsResult[];
}

@Injectable()
export class OrchestrateFriendsUseCase {
  private readonly logger = new Logger(OrchestrateFriendsUseCase.name);

  constructor(
    private readonly fetchUseCase: FetchVkFriendsUseCase,
    private readonly getUseCase: GetVkFriendsUseCase,
    private readonly loadUseCase: LoadVkFriendsUseCase,
    @Inject(TOKENS.IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    params: OrchestrateFriendsParams,
  ): Promise<OrchestrateFriendsResult> {
    const {
      userIds,
      batchSize,
      concurrency,
      mode,
      params: friendParams,
      onProgress,
    } = params;

    const effectiveBatchSize = Math.min(
      Math.max(
        batchSize ?? settings.orchestrator.friends.batch.defaultBatchSize,
        1,
      ),
      settings.orchestrator.friends.batch.maxBatchSize,
    );

    const effectiveConcurrency = Math.min(
      Math.max(
        concurrency ??
          settings.orchestrator.friends.concurrency.defaultConcurrency,
        1,
      ),
      settings.orchestrator.friends.concurrency.maxConcurrency,
    );

    const results: UserFriendsResult[] = [];
    let processed = 0;
    let failed = 0;

    const batches: number[][] = [];
    for (let i = 0; i < userIds.length; i += effectiveBatchSize) {
      batches.push(userIds.slice(i, i + effectiveBatchSize));
    }

    const semaphore = new Semaphore(effectiveConcurrency);

    for (const batch of batches) {
      const batchPromises = batch.map((userId) =>
        (async () => {
          await semaphore.acquire();
          try {
            let data: any;
            let success = true;
            let error: string | undefined;

            try {
              switch (mode) {
                case "fetch":
                  data = await this.fetchUseCase.execute({
                    user_id: userId,
                    ...friendParams,
                  } as VkFriendsGetParams);
                  break;
                case "load":
                  data = await this.loadUseCase.execute({
                    user_id: userId,
                    ...friendParams,
                  } as VkFriendsGetParams);
                  break;
                case "get":
                  data = await this.getUseCase.execute(
                    userId,
                    friendParams?.count,
                    friendParams?.offset,
                  );
                  break;
              }

              if (mode !== "get") {
                try {
                  await this.userRepository.updateFriendsAdded(
                    userId,
                    new Date(),
                  );
                } catch (updateErr: any) {
                  this.logger.warn(
                    `Failed to update friends_added for user ${userId}: ${
                      updateErr?.message || updateErr
                    }`,
                  );
                }
              }

              const result: UserFriendsResult = {
                userId,
                success: true,
                data,
              };
              results.push(result);
              processed++;

              if (onProgress) {
                await onProgress({
                  processed,
                  total: userIds.length,
                  currentUserId: userId,
                  success: true,
                });
              }
            } catch (e: any) {
              success = false;
              error = e?.message || String(e);
              failed++;
              this.logger.error(
                `Failed to process user ${userId} (mode: ${mode}): ${error}`,
              );

              if (mode !== "get") {
                try {
                  const errorCode =
                    e instanceof VkApiError ? e.code : undefined;
                  if (errorCode !== undefined) {
                    await this.userRepository.updateFriendsAdded(
                      userId,
                      `err:${errorCode}`,
                    );
                  }
                } catch (updateErr: any) {
                  this.logger.warn(
                    `Failed to update friends_added (error code) for user ${userId}: ${
                      updateErr?.message || updateErr
                    }`,
                  );
                }
              }

              const result: UserFriendsResult = {
                userId,
                success: false,
                error,
              };
              results.push(result);

              if (onProgress) {
                await onProgress({
                  processed,
                  total: userIds.length,
                  currentUserId: userId,
                  success: false,
                  error,
                });
              }
            }
          } finally {
            semaphore.release();
          }
        })(),
      );

      await Promise.allSettled(batchPromises);
    }

    return { processed, failed, results };
  }
}
