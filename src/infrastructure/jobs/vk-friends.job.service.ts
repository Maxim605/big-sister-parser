import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, JobsOptions, Job } from "bullmq";
import Redis from "ioredis";
import { TOKENS } from "src/common/tokens";
import { LoadVkFriendsUseCase } from "src/application/use-cases/vk-friends/load-vk-friends.usecase";
import { VkFriendsGetParams } from "src/domain/parser/vk/interfaces";

export const VK_FRIENDS_QUEUE = "vk-friends-load";

@Injectable()
export class VkFriendsJobService implements OnModuleDestroy {
  private readonly logger = new Logger(VkFriendsJobService.name);
  private queue: Queue;
  private worker?: Worker;

  constructor(
    @Inject(TOKENS.RedisClient) private readonly redis: Redis,
    private readonly loadUseCase: LoadVkFriendsUseCase,
  ) {
    this.queue = new Queue(VK_FRIENDS_QUEUE, { connection: this.redis as any });

    this.worker = new Worker(
      VK_FRIENDS_QUEUE,
      async (job: Job<{ params: VkFriendsGetParams }>) => {
        this.logger.log(
          `Processing job ${job.id} for user ${job.data.params.user_id}`,
        );
        try {
          await job.updateProgress(0);
          const res = await this.loadUseCase.execute(job.data.params);
          await job.updateProgress(100);
          return res;
        } catch (e: any) {
          this.logger.error(`Job ${job.id} failed: ${e?.message || e}`);
          throw e;
        }
      },
      { connection: this.redis as any, concurrency: 1 },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Job ${job.id} completed`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Job ${job?.id} failed: ${err?.message}`);
    });
  }

  async addLoadJob(params: VkFriendsGetParams, opts?: JobsOptions) {
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
