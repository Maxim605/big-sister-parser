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
    const defaultAttempts = Number(process.env.VK_SUBS_ATTEMPTS || 5);
    const defaultBackoff = Number(process.env.VK_SUBS_BACKOFF_MS || 2000);
    const concurrency = Number(process.env.VK_SUBS_WORKER_CONCURRENCY || 1);

    this.queue = new Queue(VK_USER_SUBSCRIPTIONS_QUEUE, {
      connection: this.redis as any,
      defaultJobOptions: {
        attempts: defaultAttempts,
        backoff: { type: "exponential", delay: defaultBackoff },
        removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    });

    this.worker = new Worker(
      VK_USER_SUBSCRIPTIONS_QUEUE,
      async (job: Job<{ params: VkUsersGetSubscriptionsParams }>) => {
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
      {
        connection: this.redis as any,
        concurrency,
        settings: {
          repeatStrategy: (attemptsMade: number) => {
            const base =
              defaultBackoff * Math.pow(2, Math.max(0, attemptsMade - 1));
            const jitter = Math.floor(Math.random() * (base * 0.2));
            return base + jitter;
          },
        },
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Subscriptions job ${job.id} completed`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.warn(
        `Subscriptions job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
  }

  async addLoadJob(params: VkUsersGetSubscriptionsParams, opts?: JobsOptions) {
    const job = await this.queue.add(
      "load",
      { params },
      {
        removeOnComplete: 50,
        removeOnFail: 100,
        ...(opts || {}),
      },
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
