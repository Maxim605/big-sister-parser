import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, JobsOptions, Job } from "bullmq";
import Redis from "ioredis";
import * as crypto from "crypto";
import { TOKENS } from "src/common/tokens";
import { LoadWallByOwnerCommand } from "src/application/commands/vk-wall/load-wall-by-owner.command";
import { LoadWallByIdsCommand } from "src/application/commands/vk-wall/load-wall-by-ids.command";
import settings from "src/settings";
import { IVkWallApiClient } from "src/application/ports/ivk-wall-api.client";

export const VK_WALL_QUEUE = "vk-wall-load";

@Injectable()
export class VkWallJobService implements OnModuleDestroy {
  private readonly logger = new Logger(VkWallJobService.name);
  private queue: Queue;
  private worker?: Worker;

  private statusKey(jobId: string | number) {
    return `vk:wall:job:status:${jobId}`;
  }
  private idemKey(hash: string) {
    return `vk:wall:job:${hash}`;
  }

  constructor(
    @Inject(TOKENS.RedisClient) private readonly redis: Redis,
    private readonly loadByOwner: LoadWallByOwnerCommand,
    private readonly loadByIds: LoadWallByIdsCommand,
    @Inject(TOKENS.IVkWallApiClient) private readonly api: IVkWallApiClient,
  ) {
    const attempts = settings.vkWall.queue.attempts;
    const backoff = settings.vkWall.queue.backoffMs;
    const concurrency = settings.vkWall.queue.concurrency;

    this.queue = new Queue(VK_WALL_QUEUE, {
      connection: this.redis as any,
      defaultJobOptions: {
        attempts,
        backoff: { type: "exponential", delay: backoff },
        removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    });

    this.worker = new Worker(
      VK_WALL_QUEUE,
      async (job: Job<{ type: "owner" | "ids" | "get"; payload: any }>) => {
        const startedAt = Date.now();
        await this.redis.set(
          this.statusKey(job.id!),
          JSON.stringify({
            state: "running",
            startedAt,
            progress: 0,
            name: job.name,
          }),
          "EX",
          7 * 24 * 3600,
        );
        try {
          if (job.data.type === "owner") {
            const res = await this.loadByOwner.execute(job.data.payload, {
              onChunk: async ({ offset, pageSize, saved, skipped, total }) => {
                await job.updateProgress({ offset, saved, skipped, total });
                await this.redis.set(
                  this.statusKey(job.id!),
                  JSON.stringify({
                    state: "running",
                    startedAt,
                    progress: { offset, saved, skipped, total },
                  }),
                  "EX",
                  7 * 24 * 3600,
                );
              },
            });
            await this.redis.set(
              this.statusKey(job.id!),
              JSON.stringify({
                state: "completed",
                startedAt,
                finishedAt: Date.now(),
                result: res,
              }),
              "EX",
              7 * 24 * 3600,
            );
            return res;
          } else if (job.data.type === "ids") {
            const res = await this.loadByIds.execute(job.data.payload);
            await this.redis.set(
              this.statusKey(job.id!),
              JSON.stringify({
                state: "completed",
                startedAt,
                finishedAt: Date.now(),
                result: res,
              }),
              "EX",
              7 * 24 * 3600,
            );
            return res;
          } else {
            const res = await this.api.wallFetch(job.data.payload);
            await job.updateProgress({
              received: Array.isArray(res?.items) ? res.items.length : 0,
              total: res?.count,
            });
            await this.redis.set(
              this.statusKey(job.id!),
              JSON.stringify({
                state: "completed",
                startedAt,
                finishedAt: Date.now(),
                result: res,
              }),
              "EX",
              7 * 24 * 3600,
            );
            return res;
          }
        } catch (e: any) {
          await this.redis.set(
            this.statusKey(job.id!),
            JSON.stringify({
              state: "failed",
              startedAt,
              finishedAt: Date.now(),
              error: String(e?.message || e),
            }),
            "EX",
            7 * 24 * 3600,
          );
          throw e;
        }
      },
      {
        connection: this.redis as any,
        concurrency,
      },
    );
    this.worker.on("failed", (job, err) =>
      this.logger.warn(
        `Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      ),
    );
  }

  private computeIdemHash(payload: any) {
    const base = payload?.idempotencyKey
      ? String(payload.idempotencyKey)
      : JSON.stringify(payload);
    return crypto.createHash("sha256").update(base).digest("hex");
  }

  async enqueueParseByOwner(payload: any, opts?: JobsOptions) {
    const hash = this.computeIdemHash(payload);
    const idemKey = this.idemKey(hash);
    const exists = await this.redis.get(idemKey);
    if (exists) {
      return exists;
    }
    const job = await this.queue.add(
      "load-owner",
      { type: "owner", payload },
      { removeOnComplete: 100, removeOnFail: 200, ...(opts || {}) },
    );
    await this.redis.set(idemKey, String(job.id), "EX", 7 * 24 * 3600, "NX");
    return job.id;
  }

  async enqueueParseByIds(payload: any, opts?: JobsOptions) {
    const hash = this.computeIdemHash(payload);
    const idemKey = this.idemKey(hash);
    const exists = await this.redis.get(idemKey);
    if (exists) return exists;
    const job = await this.queue.add(
      "load-ids",
      { type: "ids", payload },
      { removeOnComplete: 100, removeOnFail: 200, ...(opts || {}) },
    );
    await this.redis.set(idemKey, String(job.id), "EX", 7 * 24 * 3600, "NX");
    return job.id;
  }

  async enqueueGet(payload: any, opts?: JobsOptions) {
    const hash = this.computeIdemHash({ type: "get", payload });
    const idemKey = this.idemKey(hash);
    const exists = await this.redis.get(idemKey);
    if (exists) return exists;
    const job = await this.queue.add(
      "get",
      { type: "get", payload },
      { removeOnComplete: 100, removeOnFail: 200, ...(opts || {}) },
    );
    await this.redis.set(idemKey, String(job.id), "EX", 7 * 24 * 3600, "NX");
    return job.id;
  }

  async getJob(jobId: string | number) {
    return this.queue.getJob(jobId as any);
  }

  async getJobState(jobId: string | number) {
    const job = await this.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    const progress = job.progress as any;
    const rv = job.returnvalue as any;
    const statusJson = await this.redis.get(this.statusKey(jobId));
    let status: any = null;
    try {
      status = statusJson ? JSON.parse(statusJson) : null;
    } catch {}
    return {
      id: job.id,
      state,
      progress,
      returnvalue: rv,
      name: job.name,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      status,
    };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }
}
