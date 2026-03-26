import { Inject, Injectable, Logger } from "@nestjs/common";
import { IVkGroupApiClient } from "src/application/ports/ivk-group-api.client";
import { TOKENS } from "src/common/tokens";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";
import { IVkInteractionsApiClient } from "src/application/ports/ivk-interactions-api.client";

export interface LoadUserPostsResult {
  total_fetched: number;
  total_saved: number;
  likes_saved: number;
  comments_saved: number;
  pages: number;
}

export interface LoadUserPostsParams {
  user_id: number;
  access_token: string;
  /** unix timestamp начала периода */
  date_from?: number;
  /** unix timestamp конца периода */
  date_to?: number;
  /** смещение (для count/offset режима) */
  offset?: number;
  /** кол-во постов (0 = все; для count/offset режима) */
  count?: number;
  page_size?: number;
  /** загружать лайки */
  with_likes?: boolean;
  /** загружать комментарии */
  with_comments?: boolean;
  rewrite?: boolean;
}

@Injectable()
export class VkUserPostsUseCase {
  private readonly logger = new Logger(VkUserPostsUseCase.name);
  private readonly PAGE_SIZE = 100;
  private readonly DELAY_MS = 340;

  constructor(
    @Inject(TOKENS.IVkGroupApiClient)
    private readonly wallApi: IVkGroupApiClient,
    @Inject(TOKENS.IVkInteractionsApiClient)
    private readonly interactionsApi: IVkInteractionsApiClient,
    private readonly thrift: ThriftArangoService,
  ) {}

  async loadByPeriod(
    params: LoadUserPostsParams,
  ): Promise<LoadUserPostsResult> {
    const dateFrom = params.date_from ?? 0;
    const dateTo = params.date_to ?? Math.floor(Date.now() / 1000);
    const pageSize = Math.min(
      params.page_size ?? this.PAGE_SIZE,
      this.PAGE_SIZE,
    );

    const allPosts: any[] = [];
    let offset = 0;

    while (true) {
      await this.delay();
      const page = await this.wallApi.wallGet({
        owner_id: params.user_id,
        offset,
        count: pageSize,
        access_token: params.access_token,
      });

      const items: any[] = page.items ?? [];
      if (!items.length) break;

      const inRange = items.filter(
        (p) => p.date >= dateFrom && p.date <= dateTo,
      );
      allPosts.push(...inRange);

      // Если последний пост старше dateFrom — дальше нет смысла
      if (items[items.length - 1].date < dateFrom) break;
      if (items.length < pageSize) break;
      offset += pageSize;
    }

    return this.savePostsWithInteractions(params, allPosts);
  }

  async loadByCountOffset(
    params: LoadUserPostsParams,
  ): Promise<LoadUserPostsResult> {
    const pageSize = Math.min(
      params.page_size ?? this.PAGE_SIZE,
      this.PAGE_SIZE,
    );
    const totalWanted = params.count ?? 0;
    const startOffset = params.offset ?? 0;

    const allPosts: any[] = [];
    let offset = startOffset;
    let fetched = 0;

    while (true) {
      await this.delay();
      const page = await this.wallApi.wallGet({
        owner_id: params.user_id,
        offset,
        count: pageSize,
        access_token: params.access_token,
      });

      const items: any[] = page.items ?? [];
      if (!items.length) break;

      allPosts.push(...items);
      fetched += items.length;
      offset += pageSize;

      if (items.length < pageSize) break;
      if (totalWanted > 0 && fetched >= totalWanted) break;
    }

    const posts = totalWanted > 0 ? allPosts.slice(0, totalWanted) : allPosts;
    return this.savePostsWithInteractions(params, posts);
  }

  private async savePostsWithInteractions(
    params: LoadUserPostsParams,
    posts: any[],
  ): Promise<LoadUserPostsResult> {
    let totalSaved = 0;
    let likesSaved = 0;
    let commentsSaved = 0;

    for (const post of posts) {
      if (!post?.id) continue;

      // Сохраняем пост через Thrift (как в VkGroupPostsUseCase)
      const result = await this.thrift.save("posts", {
        _key: `${params.user_id}_${post.id}`,
        id: String(post.id),
        owner_id: String(params.user_id),
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
      if (result.success) {
        totalSaved++;
        // write-ребро: автор → пост
        const fromId = post.from_id ?? params.user_id;
        const createdAt = post.date
          ? new Date(post.date * 1000).toISOString()
          : "";
        await this.thrift.save("interactions", {
          _key: `write_${fromId}_${params.user_id}_${post.id}`,
          _from: `users/${fromId}`,
          _to: `posts/${params.user_id}_${post.id}`,
          type: "write",
          created_at: createdAt,
        });
      }

      // Лайки
      if (params.with_likes !== false) {
        const likes = await this.fetchAllLikes(
          params.user_id,
          post.id,
          params.access_token,
        );
        if (likes.length) {
          await this.saveLikes(params.user_id, post.id, likes);
          likesSaved += likes.length;
        }
      }

      // Комментарии
      if (params.with_comments !== false) {
        const comments = await this.fetchAllComments(
          params.user_id,
          post.id,
          params.access_token,
        );
        if (comments.length) {
          await this.saveComments(params.user_id, post.id, comments);
          commentsSaved += comments.length;
        }
      }
    }

    return {
      total_fetched: posts.length,
      total_saved: totalSaved,
      likes_saved: likesSaved,
      comments_saved: commentsSaved,
      pages: Math.ceil(posts.length / this.PAGE_SIZE),
    };
  }

  private async fetchAllLikes(
    ownerId: number,
    postId: number,
    token: string,
  ): Promise<number[]> {
    const all: number[] = [];
    let offset = 0;
    while (true) {
      await this.delay();
      let res: any;
      try {
        res = await this.interactionsApi.likesGetList({
          type: "post",
          owner_id: ownerId,
          item_id: postId,
          offset,
          count: 1000,
          access_token: token,
        });
      } catch (e: any) {
        if (e?.error_code === 6 || e?.error_code === 9) {
          this.logger.warn(
            `[FLOOD] likes owner=${ownerId} post=${postId}, retry`,
          );
          await this.delay(2000);
          continue;
        }
        break;
      }
      all.push(...(res.items ?? []));
      if ((res.items ?? []).length < 1000) break;
      offset += 1000;
    }
    return all;
  }

  private async fetchAllComments(
    ownerId: number,
    postId: number,
    token: string,
  ): Promise<any[]> {
    const all: any[] = [];
    let offset = 0;
    while (true) {
      await this.delay();
      let res: any;
      try {
        res = await this.interactionsApi.wallGetComments({
          owner_id: ownerId,
          post_id: postId,
          offset,
          count: 100,
          access_token: token,
        });
      } catch (e: any) {
        if (e?.error_code === 6 || e?.error_code === 9) {
          this.logger.warn(
            `[FLOOD] comments owner=${ownerId} post=${postId}, retry`,
          );
          await this.delay(2000);
          continue;
        }
        break;
      }
      all.push(...(res.items ?? []));
      if ((res.items ?? []).length < 100) break;
      offset += 100;
    }
    return all;
  }

  private async saveLikes(
    ownerId: number,
    postId: number,
    userIds: number[],
  ): Promise<void> {
    const postKey = `${ownerId}_${postId}`;
    for (const userId of userIds) {
      const key = `like_${userId}_${ownerId}_${postId}`;
      await this.thrift.save("interactions", {
        _key: key,
        _from: `users/${userId}`,
        _to: `posts/${postKey}`,
        type: "like",
        created_at: "",
      });
    }
  }

  private async saveComments(
    ownerId: number,
    postId: number,
    items: any[],
  ): Promise<void> {
    const postKey = `${ownerId}_${postId}`;
    for (const item of items) {
      if (!item?.id) continue;
      const rawFromId = item.from_id ?? item.owner_id ?? 0;
      const isGroup = rawFromId < 0;
      const fromId = Math.abs(rawFromId);
      const commentId = String(item.id);
      const createdAt = item.date
        ? new Date(item.date * 1000).toISOString()
        : "";
      const fromRef = isGroup ? `groups/${fromId}` : `users/${fromId}`;

      // Текст комментария → comment
      await this.thrift.save("comment", {
        _key: `${ownerId}_${postId}_${commentId}`,
        owner_id: String(ownerId),
        post_id: String(postId),
        comment_id: commentId,
        from_id: String(fromId),
        is_group: isGroup ? "true" : "false",
        text: item.text ?? "",
        date: item.date != null ? String(item.date) : "",
        created_at: createdAt,
      });

      // Ребро → interactions
      await this.thrift.save("interactions", {
        _key: `comment_${fromId}_${ownerId}_${postId}_${commentId}`,
        _from: fromRef,
        _to: `posts/${postKey}`,
        type: "comment",
        comment_id: commentId,
        created_at: createdAt,
      });
    }
  }

  private delay(ms = this.DELAY_MS): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
