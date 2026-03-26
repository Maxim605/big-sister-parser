import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  MessageEvent,
  Query,
  Sse,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { VkApiError } from "src/infrastructure/vk/types";
import { VkLikesUseCase } from "src/application/use-cases/vk-interactions/vk-likes.usecase";
import { VkCommentsUseCase } from "src/application/use-cases/vk-interactions/vk-comments.usecase";
import settings from "src/settings";
import { API_V1, VK_TAG } from "src/constants";

const DEFAULT_OWNER_ID = String(-(settings.vkApi.defaultGroupId ?? 31480508));
const DEFAULT_POST_ID = String(settings.vkApi.defaultPostId ?? 1);
const DEFAULT_TOKEN = settings.token.vkDefault ?? "";

@ApiTags("vk-interactions")
@Controller(`${API_V1}/${VK_TAG}/interactions`)
export class VkInteractionsController {
  private readonly logger = new Logger(VkInteractionsController.name);

  constructor(
    private readonly likesUseCase: VkLikesUseCase,
    private readonly commentsUseCase: VkCommentsUseCase,
  ) {}

  // ─── LIKES ─────────────────────────────────────────────────────────────────

  @Get("likes/fetch")
  @ApiOperation({ summary: "Получить лайки поста из VK API (без сохранения)" })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    description: "ID постов через запятую",
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 1000 })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  async fetchLikes(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("page_size") page_size?: string,
  ) {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    try {
      return await this.likesUseCase.fetch({
        owner_id: Number(owner_id),
        post_ids: this.parseIds(post_ids),
        offset: offset !== undefined ? Number(offset) : 0,
        page_size: page_size !== undefined ? Number(page_size) : undefined,
        access_token,
      });
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Get("likes/get")
  @ApiOperation({ summary: "Получить лайки поста из базы данных" })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_id",
    type: Number,
    required: true,
    example: DEFAULT_POST_ID,
  })
  async getLikesFromDb(
    @Query("owner_id") owner_id: string,
    @Query("post_id") post_id: string,
  ) {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_id) throw new BadRequestException("post_id обязателен");
    const result = await this.likesUseCase.getFromDb(
      Number(owner_id),
      Number(post_id),
    );
    if (!result)
      throw new BadRequestException(
        `Лайки для поста ${post_id} не найдены в базе данных`,
      );
    return result;
  }

  @Get("likes/load")
  @ApiOperation({
    summary: "Загрузить лайки постов из VK API и сохранить в БД",
  })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    description: "ID постов через запятую",
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "0 = все",
    example: 0,
  })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 1000 })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  @ApiQuery({
    name: "mode",
    type: String,
    required: false,
    enum: ["sync", "async", "stream"],
    example: "sync",
  })
  async loadLikes(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("rewrite") rewrite?: string,
    @Query("mode") mode?: string,
  ): Promise<any> {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    const params = {
      owner_id: Number(owner_id),
      post_ids: this.parseIds(post_ids),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      rewrite: rewrite === "true" || rewrite === "1",
    };
    const resolvedMode = (mode as "sync" | "async" | "stream") ?? "sync";
    try {
      if (resolvedMode === "stream") {
        const obs = this.likesUseCase.loadStream(params);
        return new Observable<MessageEvent>((sub) => {
          obs.subscribe({
            next: (e) => sub.next({ data: e } as MessageEvent),
            error: (e) => sub.error(e),
            complete: () => sub.complete(),
          });
        });
      }
      if (resolvedMode === "async")
        return await this.likesUseCase.loadAsync(params);
      return await this.likesUseCase.loadSync(params);
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Sse("likes/load/stream")
  @ApiOperation({ summary: "Загрузить лайки постов (SSE-поток)" })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "count", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 1000 })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  streamLikes(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    const obs = this.likesUseCase.loadStream({
      owner_id: Number(owner_id),
      post_ids: this.parseIds(post_ids),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      rewrite: rewrite === "true" || rewrite === "1",
    });
    return new Observable<MessageEvent>((sub) => {
      obs.subscribe({
        next: (e) => sub.next({ data: e } as MessageEvent),
        error: (err) => {
          sub.next({
            data: { type: "error", error: err.message },
          } as MessageEvent);
          sub.complete();
        },
        complete: () => sub.complete(),
      });
    });
  }

  // ─── COMMENTS ──────────────────────────────────────────────────────────────

  @Get("comments/fetch")
  @ApiOperation({
    summary: "Получить комментарии поста из VK API (без сохранения)",
  })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    description: "ID постов через запятую",
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 100 })
  @ApiQuery({ name: "fields", type: String, required: false, example: "" })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  async fetchComments(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("page_size") page_size?: string,
    @Query("fields") fields?: string,
  ) {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    try {
      return await this.commentsUseCase.fetch({
        owner_id: Number(owner_id),
        post_ids: this.parseIds(post_ids),
        offset: offset !== undefined ? Number(offset) : 0,
        page_size: page_size !== undefined ? Number(page_size) : undefined,
        fields: this.parseFields(fields ?? ""),
        access_token,
      });
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Get("comments/get")
  @ApiOperation({ summary: "Получить комментарии поста из базы данных" })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_id",
    type: Number,
    required: true,
    example: DEFAULT_POST_ID,
  })
  async getCommentsFromDb(
    @Query("owner_id") owner_id: string,
    @Query("post_id") post_id: string,
  ) {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_id) throw new BadRequestException("post_id обязателен");
    const result = await this.commentsUseCase.getFromDb(
      Number(owner_id),
      Number(post_id),
    );
    if (!result)
      throw new BadRequestException(
        `Комментарии для поста ${post_id} не найдены в базе данных`,
      );
    return result;
  }

  @Get("comments/load")
  @ApiOperation({
    summary: "Загрузить комментарии постов из VK API и сохранить в БД",
  })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    description: "ID постов через запятую",
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "0 = все",
    example: 0,
  })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 100 })
  @ApiQuery({ name: "fields", type: String, required: false, example: "" })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  @ApiQuery({
    name: "mode",
    type: String,
    required: false,
    enum: ["sync", "async", "stream"],
    example: "sync",
  })
  async loadComments(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
    @Query("mode") mode?: string,
  ): Promise<any> {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    const params = {
      owner_id: Number(owner_id),
      post_ids: this.parseIds(post_ids),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      fields: this.parseFields(fields ?? ""),
      rewrite: rewrite === "true" || rewrite === "1",
    };
    const resolvedMode = (mode as "sync" | "async" | "stream") ?? "sync";
    try {
      if (resolvedMode === "stream") {
        const obs = this.commentsUseCase.loadStream(params);
        return new Observable<MessageEvent>((sub) => {
          obs.subscribe({
            next: (e) => sub.next({ data: e } as MessageEvent),
            error: (e) => sub.error(e),
            complete: () => sub.complete(),
          });
        });
      }
      if (resolvedMode === "async")
        return await this.commentsUseCase.loadAsync(params);
      return await this.commentsUseCase.loadSync(params);
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Sse("comments/load/stream")
  @ApiOperation({ summary: "Загрузить комментарии постов (SSE-поток)" })
  @ApiQuery({
    name: "owner_id",
    type: Number,
    required: true,
    example: DEFAULT_OWNER_ID,
  })
  @ApiQuery({
    name: "post_ids",
    type: String,
    required: true,
    example: DEFAULT_POST_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({ name: "offset", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "count", type: Number, required: false, example: 0 })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 100 })
  @ApiQuery({ name: "fields", type: String, required: false, example: "" })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  streamComments(
    @Query("owner_id") owner_id: string,
    @Query("post_ids") post_ids: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    if (!owner_id) throw new BadRequestException("owner_id обязателен");
    if (!post_ids) throw new BadRequestException("post_ids обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    const obs = this.commentsUseCase.loadStream({
      owner_id: Number(owner_id),
      post_ids: this.parseIds(post_ids),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      fields: this.parseFields(fields ?? ""),
      rewrite: rewrite === "true" || rewrite === "1",
    });
    return new Observable<MessageEvent>((sub) => {
      obs.subscribe({
        next: (e) => sub.next({ data: e } as MessageEvent),
        error: (err) => {
          sub.next({
            data: { type: "error", error: err.message },
          } as MessageEvent);
          sub.complete();
        },
        complete: () => sub.complete(),
      });
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private parseIds(raw: string): number[] {
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  }

  private parseFields(raw: string): string[] | undefined {
    if (!raw?.trim()) return undefined;
    return raw
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  private handleVkError(e: any): never {
    if (e instanceof VkApiError) {
      throw new BadRequestException({ error_code: e.code, error_msg: e.msg });
    }
    throw e;
  }
}
