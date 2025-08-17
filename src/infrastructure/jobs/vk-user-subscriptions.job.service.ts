import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, JobsOptions, Job } from "bullmq";
import Redis from "ioredis";
import { TOKENS } from "src/common/tokens";
import { LoadVkUserSubscriptionsUseCase } from "src/application/use-cases/vk-user/load-vk-user-subscriptions.usecase";
import { VkUsersGetSubscriptionsParams } from "src/infrastructure/vk/types";

export const VK_USER_SUBSCRIPTIONS_QUEUE = "vk-user-subscriptions-load";

@Injectable()
export class VkUserSubscriptionsJobService implements OnModuleDestroy {
  private readonly logger = new Logger(VkUserSubscriptionsJobService.name);
  private queue: Queue;
  private worker?: Worker;

  constructor(
    @Inject(TOKENS.RedisClient) private readonly redis: Redis,
    private readonly loadUseCase: LoadVkUserSubscriptionsUseCase,
  ) {
    this.queue = new Queue(VK_USER_SUBSCRIPTIONS_QUEUE, {
      connection: this.redis as any,
    });

    this.worker = new Worker(
      VK_USER_SUBSCRIPTIONS_QUEUE,
      async (job: Job<{ params: VkUsersGetSubscriptionsParams }>) => {
        this.logger.log(
          `Processing subscriptions job ${job.id} for user ${job.data.params.user_id}`,
        );
        try {
          await job.updateProgress({
            message: "started",
            processed: 0,
            failed: 0,
          });
          const res = await this.loadUseCase.execute(job.data.params);
          await job.updateProgress({
            message: "completed",
            processed: res.processedGroups,
            failed: 0,
          });
          return res;
        } catch (e: any) {
          this.logger.error(`Job ${job.id} failed: ${e?.message || e}`);
          throw e;
        }
      },
      { connection: this.redis as any, concurrency: 1 },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Subscriptions job ${job.id} completed`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Subscriptions job ${job?.id} failed: ${err?.message}`);
    });
  }

  async addLoadJob(params: VkUsersGetSubscriptionsParams, opts?: JobsOptions) {
    const job = await this.queue.add(
      "load",
      { params },
      { attempts: 1, removeOnComplete: 50, removeOnFail: 100, ...opts },
    );
    return job.id;
  }

  async getJob(jobId: string | number) {
    return this.queue.getJob(jobId as any);
  }

  async getJobState(jobId: string | number) {
    const job = await this.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    const progress = job.progress as number | object | undefined;
    const returnvalue = job.returnvalue as any;
    return {
      id: job.id,
      state,
      progress,
      returnvalue,
      name: job.name,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }
}
