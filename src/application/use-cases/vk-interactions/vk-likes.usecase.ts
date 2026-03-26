import { Inject, Injectable, Logger } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { IVkInteractionsApiClient } from "src/application/ports/ivk-interactions-api.client";
import { TOKENS } from "src/common/tokens";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

export interface LikesEvent {
  type: "started" | "page" | "completed" | "error";
  post_id?: number;
  page?: number;
  saved?: number;
  total?: number;
  total_saved?: number;
  error?: string;
}

export interface LoadLikesParams {
  owner_id: number;
  post_ids: number[];
  offset?: number;
  count?: number;
  page_size?: number;
  access_token: string;
  rewrite?: boolean;
}

export interface LoadLikesResult {
  total_fetched: number;
  total_saved: number;
  posts_processed: number;
}

@Injectable()
export class VkLikesUseCase {
  private readonly logger = new Logger(VkLikesUseCase.name);
  private readonly MAX_PAGE_SIZE = 1000;

  constructor(
    @Inject(TOKENS.IVkInteractionsApiClient)
    private readonly api: IVkInteractionsApiClient,
    private readonly thrift: ThriftArangoService,
  ) {}

  async fetch(params: LoadLikesParams): Promise<{ post_id: number; count: number; items: number[] }[]> {
    const results = [];
    for (const post_id of params.post_ids) {
      const res = await this.api.likesGetList({
        type: "post",
        owner_id: params.owner_id,
        item_id: post_id,
        offset: params.offset ?? 0,
        count: Math.min(params.page_size ?? this.MAX_PAGE_SIZE, this.MAX_PAGE_SIZE),
        access_token: params.access_token,
      });
      results.push({ post_id, count: res.count, items: res.items });
    }
    return results;
  }

  async getFromDb(owner_id: number, post_id: number): Promise<any | null> {
    try {
      const result = await this.thrift.get("likes", `like_${owner_id}_${post_id}_meta`);
      return result?.fields ?? null;
    } catch {
      return null;
    }
  }

  async loadSync(params: LoadLikesParams, onProgress?: (e: LikesEvent) => void): Promise<LoadLikesResult> {
    return this.paginate(params, onProgress, false);
  }

  async loadAsync(params: LoadLikesParams, onProgress?: (e: LikesEvent) => void): Promise<LoadLikesResult> {
    return this.paginate(params, onProgress, true);
  }

  loadStream(params: LoadLikesParams): Observable<LikesEvent> {
    const subject = new Subject<LikesEvent>();
    this.executeStream(params, subject).catch((err) => {
      this.logger.error(`[Likes] Ошибка потоковой загрузки: ${err.message}`);
      subject.error(err);
    });
    return new Observable((subscriber) => subject.subscribe(subscriber));
  }

  private async paginate(
    params: LoadLikesParams,
    onProgress: ((e: LikesEvent) => void) | undefined,
    parallel: boolean,
  ): Promise<LoadLikesResult> {
    const pageSize = Math.min(params.page_size ?? this.MAX_PAGE_SIZE, this.MAX_PAGE_SIZE);
    let totalFetched = 0;
    let totalSaved = 0;

    const processPost = async (post_id: number) => {
      const firstPage = await this.api.likesGetList({
        type: "post",
        owner_id: params.owner_id,
        item_id: post_id,
        offset: params.offset ?? 0,
        count: pageSize,
        access_token: params.access_token,
      });
      const total = firstPage.count ?? 0;
      const limit = (params.count ?? 0) > 0 ? Math.min(params.count!, total) : total;

      let fetched = 0;
      let saved = 0;
      let page = 0;

      saved += await this.saveLikes(params.owner_id, post_id, firstPage.items);
      fetched += firstPage.items.length;
      page++;
      onProgress?.({ type: "page", post_id, page, saved, total, total_saved: saved });

      const offsets: number[] = [];
      for (let off = (params.offset ?? 0) + pageSize; off < (params.offset ?? 0) + limit; off += pageSize) {
        offsets.push(off);
      }

      for (const off of offsets) {
        const pageData = await this.api.likesGetList({
          type: "post",
          owner_id: params.owner_id,
          item_id: post_id,
          offset: off,
          count: pageSize,
          access_token: params.access_token,
        });
        const s = await this.saveLikes(params.owner_id, post_id, pageData.items);
        fetched += pageData.items.length;
        saved += s;
        page++;
        onProgress?.({ type: "page", post_id, page, saved: s, total, total_saved: saved });
        if (pageData.items.length === 0) break;
      }

      totalFetched += fetched;
      totalSaved += saved;
    };

    if (parallel) {
      const BATCH = 3;
      for (let i = 0; i < params.post_ids.length; i += BATCH) {
        await Promise.all(params.post_ids.slice(i, i + BATCH).map(processPost));
      }
    } else {
      for (const post_id of params.post_ids) {
        await processPost(post_id);
      }
    }

    return { total_fetched: totalFetched, total_saved: totalSaved, posts_processed: params.post_ids.length };
  }

  private async saveLikes(owner_id: number, post_id: number, userIds: number[]): Promise<number> {
    let saved = 0;
    for (const uid of userIds) {
      const result = await this.thrift.save("likes", {
        _key: `like_${owner_id}_${post_id}_${uid}`,
        _from: `posts/${owner_id}_${post_id}`,
        _to: `users/${uid}`,
        owner_id: String(owner_id),
        post_id: String(post_id),
        user_id: String(uid),
        saved_at: new Date().toISOString(),
      });
      if (result.success) saved++;
    }
    return saved;
  }

  private async executeStream(params: LoadLikesParams, subject: Subject<LikesEvent>): Promise<void> {
    subject.next({ type: "started" });
    try {
      const result = await this.loadSync(params, (e) => subject.next(e));
      subject.next({ type: "completed", total: result.total_fetched, total_saved: result.total_saved });
    } catch (err: any) {
      subject.next({ type: "error", error: err.message || String(err) });
    } finally {
      subject.complete();
    }
  }
}
