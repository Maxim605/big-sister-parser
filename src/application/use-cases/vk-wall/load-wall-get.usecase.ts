import { Inject, Injectable, Logger } from "@nestjs/common";
import settings from "src/settings";
import { IPostRepository } from "src/domain/repositories/ipost.repository";
import { TOKENS } from "src/common/tokens";
import { IVkWallApiClient } from "src/application/ports/ivk-wall-api.client";
import { VkPost, makePostKey } from "src/domain/entities/vk-post";
import { WallProcessingPool } from "src/application/services/wall-processing-pool.service";

export interface LoadWallGetParams {
  ownerId?: number;
  domain?: string;
  offset?: number;
  count?: number;
  mode?: "sync" | "async" | "stream" | "parallel";
  batchSize?: number;
  concurrency?: number;
  reset?: boolean;
  idempotencyKey?: string;
  token?: string;
}

@Injectable()
export class LoadWallGetUseCase {
  private readonly logger = new Logger(LoadWallGetUseCase.name);

  constructor(
    @Inject(TOKENS.IPostRepository) private readonly postRepo: IPostRepository,
    @Inject(TOKENS.IVkWallApiClient) private readonly vk: IVkWallApiClient,
  ) {}

  async execute(
    params: LoadWallGetParams,
    callbacks?: {
      onChunk?: (info: {
        offset: number;
        pageSize: number;
        saved: number;
        skipped: number;
        total?: number;
      }) => void;
    },
  ): Promise<{ processed: number; preview: string[] }> {
    const ownerId = params.ownerId;
    const domain = params.domain;
    if ((!ownerId && !domain) || (ownerId && domain)) {
      throw new Error("ownerId xor domain обязателен");
    }

    const cfg = settings.vkWall;
    const totalLimit = Math.min(
      Math.max(params.count ?? cfg.api.pageSizeDefault, 1),
      cfg.api.maxPageSize,
    );
    const pageSize = Math.min(
      Math.max(params.count ?? cfg.api.pageSizeDefault, 1),
      totalLimit,
    );

    const batchSize = Math.min(
      Math.max(params.batchSize ?? cfg.db.batchSizeDefault, 1),
      cfg.db.maxBatchSize,
    );

    const mode = params.mode ?? "sync";

    if (params.reset && ownerId) {
      await this.postRepo.deleteByOwner(ownerId);
    }

    let processed = 0;
    const preview: string[] = [];
    let fetchedTotal = 0;

    const handleRange = async (
      startOffset: number,
      pageSizeLocal: number,
      totalKnown?: number,
    ) => {
      for (let offset = startOffset; ; offset += pageSizeLocal) {
        const remaining = totalLimit - fetchedTotal;
        if (remaining <= 0) break;
        const requestCount = Math.min(pageSizeLocal, remaining);
        const res = await this.vk.wallFetch({
          owner_id: ownerId,
          domain,
          offset,
          count: requestCount,
          extended: 0,
          token: params.token!,
        } as any);
        const items = res?.items ?? [];
        const total = res?.count ?? totalKnown;
        if (!items.length) break;
        fetchedTotal += items.length;

        const posts: VkPost[] = items.map(
          (it: any) =>
            new VkPost({
              ownerId: it.owner_id ?? ownerId!,
              id: it.id,
              fromId: it.from_id,
              date: it.date,
              text: it.text,
              attachments: it.attachments,
              isPinned: it.is_pinned === 1,
              markedAsAds: it.marked_as_ads === 1,
              raw: it,
            }),
        );

        const keys = posts.map((p) => p._key || makePostKey(p.ownerId, p.id));
        const existing = new Set(await this.postRepo.bulkGetExistingKeys(keys));
        const unique = posts.filter((p) => !existing.has(p._key));
        const skipped = posts.length - unique.length;

        const { success } = await this.postRepo.upsertMany(unique, {
          chunkSize: batchSize,
          parallelBatchesConcurrency:
            settings.vkWall.workerPool.defaultConcurrency,
        });

        processed += success;
        for (const p of posts.slice(0, Math.max(0, 50 - preview.length))) {
          if (preview.length < 50) preview.push(p._key);
        }

        callbacks?.onChunk?.({
          offset,
          pageSize: requestCount,
          saved: success,
          skipped,
          total,
        });

        if (typeof total === "number" && offset + requestCount >= total) break;
        if (fetchedTotal >= totalLimit) break;
      }
    };

    if (mode === "parallel") {
      let total: number | undefined;
      try {
        const head = await this.vk.wallFetch({
          owner_id: ownerId,
          domain,
          offset: 0,
          count: 1,
          extended: 0,
          token: params.token!,
        } as any);
        total = head?.count;
      } catch (e) {
        this.logger.warn(`Не удалось получить total: ${String(e)}`);
      }
      const rangeEnd = total ?? (params.offset ?? 0) + pageSize * 1000; 
      const segments: Array<{ start: number; end: number; pageSize: number }> =
        [];
      const step = pageSize * 10;
      for (let s = params.offset ?? 0; s < rangeEnd; s += step) {
        segments.push({
          start: s,
          end: Math.min(s + step, rangeEnd),
          pageSize,
        });
      }
      const concurrency = Math.min(
        Math.max(
          params.concurrency ?? settings.vkWall.workerPool.defaultConcurrency,
          1,
        ),
        settings.vkWall.workerPool.maxConcurrency,
      );
      const pool = new WallProcessingPool(concurrency);
      await pool.scheduleSegments(segments, async (_start, offset, ps) => {
        await handleRange(offset, ps, total);
      });
      return { processed, preview };
    }

    await handleRange(params.offset ?? 0, pageSize);
    return { processed, preview };
  }
}
