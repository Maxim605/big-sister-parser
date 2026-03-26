import { Inject, Injectable, Logger } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { IVkGroupApiClient } from "src/application/ports/ivk-group-api.client";
import { TOKENS } from "src/common/tokens";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { IPostRepository } from "src/domain/repositories/ipost.repository";
import { VkPost } from "src/domain/entities/vk-post";

/** Событие прогресса при потоковой загрузке постов группы */
export interface GroupPostsEvent {
  type: "started" | "page" | "completed" | "error";
  page?: number;
  saved?: number;
  total?: number;
  total_saved?: number;
  error?: string;
}

/** Параметры загрузки постов группы */
export interface LoadGroupPostsParams {
  /** ID группы (положительный; owner_id будет сделан отрицательным) */
  group_id: number;
  /** Смещение для пагинации */
  offset?: number;
  /** Общее количество постов для загрузки (0 = все) */
  count?: number;
  /** Размер страницы (max 100) */
  page_size?: number;
  /** Токен доступа VK API */
  access_token: string;
  /** Перезаписать данные, если уже существуют */
  rewrite?: boolean;
}

/** Результат загрузки постов */
export interface LoadGroupPostsResult {
  total_fetched: number;
  total_saved: number;
  pages: number;
}

/**
 * Use case: получение и сохранение постов со стены сообщества ВКонтакте.
 * Поддерживает синхронный, асинхронный и потоковый (SSE) режимы.
 *
 * Для чтения из БД использует IPostRepository.findByOwner().
 * Для сохранения использует ThriftArangoService (коллекция posts).
 */
@Injectable()
export class VkGroupPostsUseCase {
  private readonly logger = new Logger(VkGroupPostsUseCase.name);
  /** Максимальный размер страницы VK API wall.get */
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @Inject(TOKENS.IVkGroupApiClient)
    private readonly api: IVkGroupApiClient,
    @Inject(TOKENS.IPostRepository)
    private readonly postRepository: IPostRepository,
    private readonly thrift: ThriftArangoService,
  ) {}

  /**
   * Получить посты из VK API без сохранения (одна страница).
   */
  async fetch(
    params: LoadGroupPostsParams,
  ): Promise<{ count: number; items: any[] }> {
    const ownerId = -Math.abs(params.group_id);
    const pageSize = Math.min(
      params.page_size ?? this.MAX_PAGE_SIZE,
      this.MAX_PAGE_SIZE,
    );
    return this.api.wallGet({
      owner_id: ownerId,
      offset: params.offset ?? 0,
      count: pageSize,
      access_token: params.access_token,
    });
  }

  /**
   * Получить посты группы из базы данных через IPostRepository.
   */
  async getFromDb(groupId: number, offset = 0, count = 100): Promise<VkPost[]> {
    const ownerId = -Math.abs(groupId);
    return this.postRepository.findByOwner(ownerId, { offset, count });
  }

  /**
   * Синхронная загрузка: постранично получить посты из VK API и сохранить в ArangoDB.
   * Режим sync — страницы обрабатываются последовательно.
   */
  async loadSync(
    params: LoadGroupPostsParams,
    onProgress?: (event: GroupPostsEvent) => void,
  ): Promise<LoadGroupPostsResult> {
    return this.paginate(params, onProgress, false);
  }

  /**
   * Асинхронная загрузка: страницы обрабатываются параллельно (до 3 одновременно).
   */
  async loadAsync(
    params: LoadGroupPostsParams,
    onProgress?: (event: GroupPostsEvent) => void,
  ): Promise<LoadGroupPostsResult> {
    return this.paginate(params, onProgress, true);
  }

  /**
   * Потоковая загрузка: возвращает Observable с событиями прогресса.
   */
  loadStream(params: LoadGroupPostsParams): Observable<GroupPostsEvent> {
    const subject = new Subject<GroupPostsEvent>();

    this.executeStream(params, subject).catch((err) => {
      this.logger.error(
        `[GroupPosts] Ошибка потоковой загрузки: ${err.message}`,
      );
      subject.error(err);
    });

    return new Observable((subscriber) => {
      subject.subscribe(subscriber);
    });
  }

  /** Внутренний метод: постраничная загрузка и сохранение */
  private async paginate(
    params: LoadGroupPostsParams,
    onProgress: ((event: GroupPostsEvent) => void) | undefined,
    parallel: boolean,
  ): Promise<LoadGroupPostsResult> {
    const ownerId = -Math.abs(params.group_id);
    const pageSize = Math.min(
      params.page_size ?? this.MAX_PAGE_SIZE,
      this.MAX_PAGE_SIZE,
    );
    const startOffset = params.offset ?? 0;
    const maxCount = params.count ?? 0; // 0 = все

    // Получаем первую страницу, чтобы узнать total
    const firstPage = await this.api.wallGet({
      owner_id: ownerId,
      offset: startOffset,
      count: pageSize,
      access_token: params.access_token,
    });

    const totalAvailable = firstPage.count ?? 0;
    const limit =
      maxCount > 0 ? Math.min(maxCount, totalAvailable) : totalAvailable;

    this.logger.log(
      `[GroupPosts] Группа ${params.group_id}: всего постов=${totalAvailable}, будет загружено=${limit}`,
    );

    let totalFetched = 0;
    let totalSaved = 0;
    let page = 0;

    // Сохраняем первую страницу
    const savedFirst = await this.savePosts(firstPage.items, ownerId);
    totalFetched += firstPage.items.length;
    totalSaved += savedFirst;
    page++;

    if (onProgress) {
      onProgress({
        type: "page",
        page,
        saved: savedFirst,
        total: totalAvailable,
        total_saved: totalSaved,
      });
    }

    // Вычисляем оставшиеся страницы
    const offsets: number[] = [];
    for (
      let off = startOffset + pageSize;
      off < startOffset + limit;
      off += pageSize
    ) {
      offsets.push(off);
    }

    if (parallel) {
      // Параллельная обработка страниц (батчами по 3)
      const BATCH = 3;
      for (let i = 0; i < offsets.length; i += BATCH) {
        const batch = offsets.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((off) =>
            this.api.wallGet({
              owner_id: ownerId,
              offset: off,
              count: pageSize,
              access_token: params.access_token,
            }),
          ),
        );
        for (const pageData of results) {
          const saved = await this.savePosts(pageData.items, ownerId);
          totalFetched += pageData.items.length;
          totalSaved += saved;
          page++;
          if (onProgress) {
            onProgress({
              type: "page",
              page,
              saved,
              total: totalAvailable,
              total_saved: totalSaved,
            });
          }
        }
      }
    } else {
      // Последовательная обработка страниц
      for (const off of offsets) {
        const pageData = await this.api.wallGet({
          owner_id: ownerId,
          offset: off,
          count: pageSize,
          access_token: params.access_token,
        });
        const saved = await this.savePosts(pageData.items, ownerId);
        totalFetched += pageData.items.length;
        totalSaved += saved;
        page++;
        if (onProgress) {
          onProgress({
            type: "page",
            page,
            saved,
            total: totalAvailable,
            total_saved: totalSaved,
          });
        }
        if (pageData.items.length === 0) break;
      }
    }

    return {
      total_fetched: totalFetched,
      total_saved: totalSaved,
      pages: page,
    };
  }

  /**
   * Сохранить массив постов в коллекцию posts через thrift.
   * Thrift преобразует все поля в строки перед отправкой в ArangoDB.
   */
  private async savePosts(items: any[], ownerId: number): Promise<number> {
    let saved = 0;
    for (const post of items) {
      if (!post || !post.id) continue;
      const result = await this.thrift.save("posts", {
        _key: `${ownerId}_${post.id}`,
        id: String(post.id),
        owner_id: String(ownerId),
        from_id: post.from_id != null ? String(post.from_id) : "",
        text: post.text ?? "",
        date: post.date != null ? String(post.date) : "",
        likes: post.likes ? JSON.stringify(post.likes) : "",
        reposts: post.reposts ? JSON.stringify(post.reposts) : "",
        views: post.views ? JSON.stringify(post.views) : "",
        post_type: post.post_type ?? "",
        attachments: post.attachments ? JSON.stringify(post.attachments) : "",
        saved_at: new Date().toISOString(),
      });
      if (result.success) saved++;
    }
    return saved;
  }

  private async executeStream(
    params: LoadGroupPostsParams,
    subject: Subject<GroupPostsEvent>,
  ): Promise<void> {
    subject.next({ type: "started" });
    try {
      const result = await this.loadSync(params, (event) => {
        subject.next(event);
      });
      subject.next({
        type: "completed",
        total: result.total_fetched,
        total_saved: result.total_saved,
      });
    } catch (err: any) {
      subject.next({ type: "error", error: err.message || String(err) });
    } finally {
      subject.complete();
    }
  }
}
