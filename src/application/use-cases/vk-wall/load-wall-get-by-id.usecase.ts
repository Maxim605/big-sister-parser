import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkWallApiClient } from "src/application/ports/ivk-wall-api.client";
import { IPostRepository } from "src/domain/repositories/ipost.repository";
import { VkPost } from "src/domain/entities/vk-post";
import settings from "src/settings";
import { TOKENS } from "src/common/tokens";
import { IMetricsService } from "src/application/ports/imetrics.service";

@Injectable()
export class LoadWallGetByIdUseCase {
  private readonly logger = new Logger(LoadWallGetByIdUseCase.name);
  constructor(
    @Inject(TOKENS.IVkWallApiClient)
    private readonly vkClient: IVkWallApiClient,
    @Inject(TOKENS.IPostRepository) private readonly postRepo: IPostRepository,
    @Inject(TOKENS.IMetricsService) private readonly metrics: IMetricsService,
  ) {}

  async execute(params: {
    posts: string[]; // ["owner_post", ...]
    apiChunkSize?: number;
    dbBatchSize?: number;
    mode?: "sync" | "async";
    retries?: number;
    onChunk?: (info: { processed: number; lastIds: string[] }) => void;
  }): Promise<{ processed: number; failedChunks?: any[] }> {
    const apiChunkSize =
      params.apiChunkSize ?? settings.vkWall.byId.apiBatchSizeDefault;
    const dbBatchSize =
      params.dbBatchSize ?? settings.vkWall.db.batchSizeDefault;
    const retries = params.retries ?? 2;
    let processed = 0;
    const failedChunks: any[] = [];

    const chunks: string[][] = [];
    for (let i = 0; i < params.posts.length; i += apiChunkSize) {
      chunks.push(params.posts.slice(i, i + apiChunkSize));
    }

    for (const [index, chunk] of chunks.entries()) {
      let attempt = 0;
      let success = false;
      while (attempt <= retries && !success) {
        attempt++;
        try {
          try {
            await this.metrics.incr("metrics:vk_api_calls_total");
          } catch {}

          const res = await this.vkClient.wallGetById({ posts: chunk });
          const items = res.items ?? [];

          const postsToUpsert: VkPost[] = items.map((it: any) => {
            const ownerId = Number(it.owner_id ?? it.from_id ?? 0);
            const id = Number(it.id ?? it.post_id ?? 0);
            const key = `${Math.abs(ownerId)}_${id}`;
            const post: Partial<VkPost> = {
              _key: key,
              ownerId,
              id,
              fromId: it.from_id,
              date: it.date,
              text: it.text,
              attachments: it.attachments,
              raw: it,
            };
            return post as VkPost;
          });

          const result = await this.postRepo.upsertMany(postsToUpsert, {
            chunkSize: dbBatchSize,
          });
          try {
            await this.metrics.incr(
              "metrics:posts_parsed_total",
              postsToUpsert.length,
            );
            await this.metrics.incr(
              "metrics:db_batches_total",
              Math.ceil(postsToUpsert.length / dbBatchSize),
            );
          } catch {}

          processed += postsToUpsert.length;
          success = true;
          params.onChunk?.({ processed, lastIds: chunk.slice(0, 50) });
        } catch (e: any) {
          if (attempt > retries) {
            failedChunks.push({ index, chunk, error: String(e?.message || e) });
            try {
              await this.metrics.incr("metrics:failed_batches_total");
            } catch {}
          } else {
            const backoff =
              Math.pow(2, attempt) * 500 + Math.floor(Math.random() * 200);
            await new Promise((r) => setTimeout(r, backoff));
          }
        }
      }
    }

    return { processed, failedChunks };
  }
}
