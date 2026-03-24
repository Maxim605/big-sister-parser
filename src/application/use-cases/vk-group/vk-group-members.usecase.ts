import { Inject, Injectable, Logger } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { IVkGroupApiClient } from "src/application/ports/ivk-group-api.client";
import { ISubscriptionRepository } from "src/domain/repositories/isubscription.repository";
import { TOKENS } from "src/common/tokens";

export interface GroupMembersEvent {
  type: "started" | "page" | "completed" | "error";
  page?: number;
  saved?: number;
  total?: number;
  total_saved?: number;
  error?: string;
}

export interface LoadGroupMembersParams {
  group_id: string | number;
  offset?: number;
  count?: number;
  page_size?: number;
  fields?: string[];
  access_token: string;
  rewrite?: boolean;
}

export interface LoadGroupMembersResult {
  total_count: number;
  total_fetched: number;
  total_saved: number;
  pages: number;
}

@Injectable()
export class VkGroupMembersUseCase {
  private readonly logger = new Logger(VkGroupMembersUseCase.name);
  private readonly MAX_PAGE_SIZE = 1000;

  constructor(
    @Inject(TOKENS.IVkGroupApiClient)
    private readonly api: IVkGroupApiClient,
    @Inject(TOKENS.ISubscriptionRepository)
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async fetch(params: LoadGroupMembersParams): Promise<{ count: number; items: any[] }> {
    const pageSize = Math.min(params.page_size ?? this.MAX_PAGE_SIZE, this.MAX_PAGE_SIZE);
    return this.api.groupsGetMembers({
      group_id: params.group_id,
      offset: params.offset ?? 0,
      count: pageSize,
      fields: params.fields,
      access_token: params.access_token,
    });
  }

  async getFromDb(
    groupId: string | number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]> {
    return this.subscriptionRepo.getMemberIdsByGroup(Number(groupId), opts);
  }

  async loadSync(
    params: LoadGroupMembersParams,
    onProgress?: (event: GroupMembersEvent) => void,
  ): Promise<LoadGroupMembersResult> {
    return this.paginate(params, onProgress, false);
  }

  async loadAsync(
    params: LoadGroupMembersParams,
    onProgress?: (event: GroupMembersEvent) => void,
  ): Promise<LoadGroupMembersResult> {
    return this.paginate(params, onProgress, true);
  }

  loadStream(params: LoadGroupMembersParams): Observable<GroupMembersEvent> {
    const subject = new Subject<GroupMembersEvent>();
    this.executeStream(params, subject).catch((err) => {
      this.logger.error(`[GroupMembers] Ошибка потоковой загрузки: ${err.message}`);
      subject.error(err);
    });
    return new Observable((subscriber) => subject.subscribe(subscriber));
  }

  private async paginate(
    params: LoadGroupMembersParams,
    onProgress: ((event: GroupMembersEvent) => void) | undefined,
    parallel: boolean,
  ): Promise<LoadGroupMembersResult> {
    const groupId = Number(params.group_id);
    const pageSize = Math.min(params.page_size ?? this.MAX_PAGE_SIZE, this.MAX_PAGE_SIZE);
    const startOffset = params.offset ?? 0;
    const maxCount = params.count ?? 0;

    if (params.rewrite) {
      await this.subscriptionRepo.resetGroupMembers(groupId);
    }

    const firstPage = await this.api.groupsGetMembers({
      group_id: params.group_id,
      offset: startOffset,
      count: pageSize,
      fields: params.fields,
      access_token: params.access_token,
    });

    const totalCount = firstPage.count ?? 0;
    const limit = maxCount > 0 ? Math.min(maxCount, totalCount) : totalCount;

    this.logger.log(
      `[GroupMembers] Группа ${params.group_id}: всего=${totalCount}, будет загружено=${limit}`,
    );

    let totalFetched = 0;
    let totalSaved = 0;
    let page = 0;

    const firstIds = this.extractIds(firstPage.items);
    await this.subscriptionRepo.upsertGroupMembers(groupId, firstIds);
    totalFetched += firstPage.items.length;
    totalSaved += firstIds.length;
    page++;
    onProgress?.({ type: "page", page, saved: firstIds.length, total: totalCount, total_saved: totalSaved });

    const offsets: number[] = [];
    for (let off = startOffset + pageSize; off < startOffset + limit; off += pageSize) {
      offsets.push(off);
    }

    if (parallel) {
      const BATCH = 3;
      for (let i = 0; i < offsets.length; i += BATCH) {
        const results = await Promise.all(
          offsets.slice(i, i + BATCH).map((off) =>
            this.api.groupsGetMembers({
              group_id: params.group_id,
              offset: off,
              count: pageSize,
              fields: params.fields,
              access_token: params.access_token,
            }),
          ),
        );
        for (const pageData of results) {
          const ids = this.extractIds(pageData.items);
          await this.subscriptionRepo.upsertGroupMembers(groupId, ids);
          totalFetched += pageData.items.length;
          totalSaved += ids.length;
          page++;
          onProgress?.({ type: "page", page, saved: ids.length, total: totalCount, total_saved: totalSaved });
        }
      }
    } else {
      for (const off of offsets) {
        const pageData = await this.api.groupsGetMembers({
          group_id: params.group_id,
          offset: off,
          count: pageSize,
          fields: params.fields,
          access_token: params.access_token,
        });
        const ids = this.extractIds(pageData.items);
        await this.subscriptionRepo.upsertGroupMembers(groupId, ids);
        totalFetched += pageData.items.length;
        totalSaved += ids.length;
        page++;
        onProgress?.({ type: "page", page, saved: ids.length, total: totalCount, total_saved: totalSaved });
        if (pageData.items.length === 0) break;
      }
    }

    return { total_count: totalCount, total_fetched: totalFetched, total_saved: totalSaved, pages: page };
  }

  private extractIds(items: Array<number | Record<string, any>>): number[] {
    return items.map((item) => (typeof item === "number" ? item : (item as any).id));
  }

  private async executeStream(
    params: LoadGroupMembersParams,
    subject: Subject<GroupMembersEvent>,
  ): Promise<void> {
    subject.next({ type: "started" });
    try {
      const result = await this.loadSync(params, (event) => subject.next(event));
      subject.next({ type: "completed", total: result.total_count, total_saved: result.total_saved });
    } catch (err: any) {
      subject.next({ type: "error", error: err.message || String(err) });
    } finally {
      subject.complete();
    }
  }
}
