import { Injectable, Inject, Logger } from "@nestjs/common";
import { FetchVkFriendsUseCase } from "../vk-friends/fetch-vk-friends.usecase";
import { GetVkFriendsUseCase } from "../vk-friends/get-vk-friends.usecase";
import { LoadVkFriendsUseCase } from "../vk-friends/load-vk-friends.usecase";
import { VkFriendsGetParams, VkApiError } from "src/infrastructure/vk/types";
import { TOKENS } from "src/common/tokens";
import { IUserRepository } from "src/domain/repositories/iuser.repository";
import settings from "src/settings";
import { Semaphore } from "./semaphore";
import {
  OrchestrateFriendsParams,
  OrchestrateFriendsResult,
  UserFriendsResult,
  OrchestrateFriendsProgressCallback,
} from "./dto";

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
      rewrite,
      onProgress,
    } = params;

    const effectiveBatchSize = this.calculateEffectiveBatchSize(batchSize);
    const effectiveConcurrency =
      this.calculateEffectiveConcurrency(concurrency);

    const batches = this.createBatches(userIds, effectiveBatchSize);

    const results: UserFriendsResult[] = [];
    const globalCounters = { processed: 0, failed: 0 };

    const semaphore = new Semaphore(effectiveConcurrency);

    for (const batch of batches) {
      const batchResults = await this.processBatch(
        batch,
        mode,
        friendParams,
        semaphore,
        userIds.length,
        globalCounters,
        rewrite,
        (info) => {
          if (onProgress) {
            onProgress(info);
          }
        },
      );

      results.push(...batchResults.results);
      globalCounters.processed += batchResults.processed;
      globalCounters.failed += batchResults.failed;
    }

    return {
      processed: globalCounters.processed,
      failed: globalCounters.failed,
      results,
    };
  }

  private calculateEffectiveBatchSize(batchSize?: number): number {
    return Math.min(
      Math.max(
        batchSize ?? settings.orchestrator.friends.batch.defaultBatchSize,
        1,
      ),
      settings.orchestrator.friends.batch.maxBatchSize,
    );
  }

  private calculateEffectiveConcurrency(concurrency?: number): number {
    return Math.min(
      Math.max(
        concurrency ??
          settings.orchestrator.friends.concurrency.defaultConcurrency,
        1,
      ),
      settings.orchestrator.friends.concurrency.maxConcurrency,
    );
  }

  private createBatches(userIds: number[], batchSize: number): number[][] {
    const batches: number[][] = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    batch: number[],
    mode: "fetch" | "load" | "get",
    friendParams: Partial<VkFriendsGetParams> | undefined,
    semaphore: Semaphore,
    totalUsers: number,
    globalCounters: { processed: number; failed: number },
    rewrite?: boolean,
    onProgress?: OrchestrateFriendsProgressCallback,
  ): Promise<{
    results: UserFriendsResult[];
    processed: number;
    failed: number;
  }> {
    const results: UserFriendsResult[] = [];
    let processed = 0;
    let failed = 0;

    const batchCounters = { processed: 0, failed: 0 };

    const batchPromises = batch.map((userId) =>
      (async () => {
        await semaphore.acquire();
        try {
          const result = await this.processUser(
            userId,
            mode,
            friendParams,
            totalUsers,
            rewrite,
            (info) => {
              if (onProgress) {
                onProgress({
                  ...info,
                  processed:
                    globalCounters.processed +
                    globalCounters.failed +
                    batchCounters.processed +
                    batchCounters.failed,
                });
              }
            },
          );
          results.push(result);
          if (result.success) {
            processed++;
            batchCounters.processed++;
          } else {
            failed++;
            batchCounters.failed++;
          }
        } finally {
          semaphore.release();
        }
      })(),
    );

    await Promise.allSettled(batchPromises);

    return { results, processed, failed };
  }

  private async processUser(
    userId: number,
    mode: "fetch" | "load" | "get",
    friendParams: Partial<VkFriendsGetParams> | undefined,
    totalUsers: number,
    rewrite?: boolean,
    onProgress?: OrchestrateFriendsProgressCallback,
  ): Promise<UserFriendsResult> {
    try {
      const data = await this.executeUserOperation(
        userId,
        mode,
        friendParams,
        rewrite,
      );

      if (mode === "load" && (data as any)?.alreadySaved) {
        const result: UserFriendsResult = {
          userId,
          success: true,
          data: {
            alreadySaved: true,
            message: "Friends already saved",
          },
        };

        if (onProgress) {
          await onProgress({
            processed: 0,
            total: totalUsers,
            currentUserId: userId,
            success: true,
          });
        }

        return result;
      }

      if (mode !== "get") {
        await this.updateFriendsAddedOnSuccess(userId);
      }

      const result: UserFriendsResult = {
        userId,
        success: true,
        data,
      };

      if (onProgress) {
        await onProgress({
          processed: 0, // будет пересчитано в execute
          total: totalUsers,
          currentUserId: userId,
          success: true,
        });
      }

      return result;
    } catch (e: any) {
      const error = e?.message || String(e);
      this.logger.error(
        `Failed to process user ${userId} (mode: ${mode}): ${error}`,
      );

      if (mode !== "get") {
        await this.updateFriendsAddedOnError(userId, e);
      }

      const result: UserFriendsResult = {
        userId,
        success: false,
        error,
      };

      if (onProgress) {
        await onProgress({
          processed: 0, // будет пересчитано в execute
          total: totalUsers,
          currentUserId: userId,
          success: false,
          error,
        });
      }

      return result;
    }
  }

  private async executeUserOperation(
    userId: number,
    mode: "fetch" | "load" | "get",
    friendParams: Partial<VkFriendsGetParams> | undefined,
    rewrite?: boolean,
  ): Promise<any> {
    switch (mode) {
      case "fetch":
        return await this.fetchUseCase.execute({
          user_id: userId,
          ...friendParams,
        } as VkFriendsGetParams);
      case "load":
        return await this.loadUseCase.execute({
          user_id: userId,
          ...friendParams,
          rewrite,
        } as VkFriendsGetParams & { rewrite?: boolean });
      case "get":
        return await this.getUseCase.execute(
          userId,
          friendParams?.count,
          friendParams?.offset,
        );
    }
  }

  private async updateFriendsAddedOnSuccess(userId: number): Promise<void> {
    try {
      await this.userRepository.updateFriendsAdded(userId, new Date());
    } catch (updateErr: any) {
      this.logger.warn(
        `Failed to update friends_added for user ${userId}: ${
          updateErr?.message || updateErr
        }`,
      );
    }
  }

  private async updateFriendsAddedOnError(
    userId: number,
    error: any,
  ): Promise<void> {
    try {
      const errorCode = error instanceof VkApiError ? error.code : undefined;
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
}
