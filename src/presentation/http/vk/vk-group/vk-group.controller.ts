import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  MessageEvent,
  Query,
  Sse,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Observable } from "rxjs";
import { VkApiError } from "src/infrastructure/vk/types";
import { VkGroupInfoUseCase } from "src/application/use-cases/vk-group/vk-group-info.usecase";
import { VkGroupPostsUseCase } from "src/application/use-cases/vk-group/vk-group-posts.usecase";
import { VkGroupMembersUseCase } from "src/application/use-cases/vk-group/vk-group-members.usecase";
import { GROUP_FIELDS_DEFAULT } from "./dto/group-info-params.dto";
import settings from "src/settings";
import { API_V1, VK_TAG } from "src/constants";

const DEFAULT_GROUP_ID = String(settings.vkApi.defaultGroupId ?? 31480508);
const DEFAULT_FIELDS = GROUP_FIELDS_DEFAULT.join(",");
const DEFAULT_TOKEN = settings.token.vkDefault ?? "";

/**
 * Контроллер для работы с сообществами ВКонтакте.
 * Маршрут: api/v1/vk/group
 *
 * Ресурсы:
 *   /info  — информация о группе
 *   /posts — посты со стены группы
 *   /members — участники (подписчики) группы
 *
 * Для каждого ресурса доступны:
 *   GET  /fetch         — получить из VK API без сохранения
 *   GET  /get           — получить из базы данных
 *   GET  /load          — загрузить из VK API и сохранить (mode: sync|async|stream)
 *   SSE  /load/stream   — потоковый режим (Server-Sent Events)
 */
@ApiTags("vk-group")
@Controller(`${API_V1}/${VK_TAG}/group`)
export class VkGroupController {
  private readonly logger = new Logger(VkGroupController.name);

  constructor(
    private readonly groupInfoUseCase: VkGroupInfoUseCase,
    private readonly groupPostsUseCase: VkGroupPostsUseCase,
    private readonly groupMembersUseCase: VkGroupMembersUseCase,
  ) {}

  // ─── INFO ──────────────────────────────────────────────────────────────────

  @Get("info/fetch")
  @ApiOperation({
    summary: "Получить информацию о группе из VK API (без сохранения)",
    description:
      "Вызывает groups.getById и возвращает данные группы без сохранения в БД.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы или короткое имя (screen_name)",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "fields",
    type: String,
    required: false,
    description: "Дополнительные поля через запятую (без photo_50/100/200)",
    example: DEFAULT_FIELDS,
  })
  async fetchGroupInfo(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("fields") fields?: string,
  ) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    try {
      return await this.groupInfoUseCase.fetch({
        group_id,
        access_token,
        fields: this.parseFields(fields ?? DEFAULT_FIELDS),
      });
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Get("info/get")
  @ApiOperation({
    summary: "Получить информацию о группе из базы данных",
    description: "Читает документ группы из коллекции groups (ArangoDB).",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы",
    example: DEFAULT_GROUP_ID,
  })
  async getGroupInfoFromDb(@Query("group_id") group_id: string) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    const result = await this.groupInfoUseCase.getFromDb(group_id);
    if (!result) {
      throw new BadRequestException(
        `Группа ${group_id} не найдена в базе данных`,
      );
    }
    return result;
  }

  @Get("info/load")
  @ApiOperation({
    summary: "Загрузить информацию о группе из VK API и сохранить в БД",
    description:
      "Получает данные группы через groups.getById и сохраняет в коллекцию groups. " +
      "mode=sync — синхронно, mode=async — асинхронно (параллельные вызовы), " +
      "mode=stream — возвращает SSE-поток событий.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы или короткое имя (screen_name)",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "fields",
    type: String,
    required: false,
    description:
      "Дополнительные поля через запятую. Рекомендуется: members_count,type,activity,city,wall,counters",
    example: DEFAULT_FIELDS,
  })
  @ApiQuery({
    name: "rewrite",
    type: Boolean,
    required: false,
    description: "Перезаписать данные, если группа уже сохранена",
    example: false,
  })
  @ApiQuery({
    name: "mode",
    type: String,
    required: false,
    description: "Режим: sync (по умолчанию) | async | stream",
    example: "sync",
    enum: ["sync", "async", "stream"],
  })
  async loadGroupInfo(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
    @Query("mode") mode?: string,
  ): Promise<any> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const params = {
      group_id,
      access_token,
      fields: this.parseFields(fields ?? DEFAULT_FIELDS),
      rewrite: rewrite === "true" || rewrite === "1",
    };

    const resolvedMode = (mode as "sync" | "async" | "stream") ?? "sync";

    try {
      if (resolvedMode === "stream") {
        // Возвращаем Observable как SSE-поток
        const obs = this.groupInfoUseCase.loadStream(params);
        return new Observable<MessageEvent>((subscriber) => {
          obs.subscribe({
            next: (event) => subscriber.next({ data: event } as MessageEvent),
            error: (err) => {
              this.logger.error(`[info/load stream] ${err.message}`, err.stack);
              subscriber.error(err);
            },
            complete: () => subscriber.complete(),
          });
        });
      }

      // sync и async — оба возвращают результат синхронно (для info всего 1 запрос)
      return await this.groupInfoUseCase.loadSync(params);
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Sse("info/load/stream")
  @ApiOperation({
    summary: "Загрузить информацию о группе (SSE-поток)",
    description:
      "Открывает Server-Sent Events поток для отслеживания прогресса загрузки информации о группе.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "fields",
    type: String,
    required: false,
    example: DEFAULT_FIELDS,
  })
  @ApiQuery({
    name: "rewrite",
    type: Boolean,
    required: false,
    example: false,
  })
  streamGroupInfo(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const obs = this.groupInfoUseCase.loadStream({
      group_id,
      access_token,
      fields: this.parseFields(fields ?? DEFAULT_FIELDS),
      rewrite: rewrite === "true" || rewrite === "1",
    });

    return new Observable<MessageEvent>((subscriber) => {
      obs.subscribe({
        next: (event) => subscriber.next({ data: event } as MessageEvent),
        error: (err) => {
          this.logger.error(`[info/load/stream] ${err.message}`, err.stack);
          subscriber.next({
            data: { type: "error", error: err.message },
          } as MessageEvent);
          subscriber.complete();
        },
        complete: () => subscriber.complete(),
      });
    });
  }

  // ─── POSTS ─────────────────────────────────────────────────────────────────

  @Get("posts/fetch")
  @ApiOperation({
    summary: "Получить посты группы из VK API (без сохранения)",
    description: "Вызывает wall.get и возвращает посты без сохранения в БД.",
  })
  @ApiQuery({
    name: "group_id",
    type: Number,
    required: true,
    description: "ID группы (положительный; для wall.get будет отрицательным)",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    required: false,
    description: "Смещение",
    example: 0,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "Количество постов (макс. 100)",
    example: 10,
  })
  async fetchGroupPosts(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
  ) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    try {
      return await this.groupPostsUseCase.fetch({
        group_id: Number(group_id),
        access_token,
        offset: offset !== undefined ? Number(offset) : 0,
        count: count !== undefined ? Number(count) : undefined,
      });
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Get("posts/get")
  @ApiOperation({
    summary: "Получить посты группы из базы данных",
    description: "Читает посты из коллекции posts (ArangoDB) по owner_id.",
  })
  @ApiQuery({
    name: "group_id",
    type: Number,
    required: true,
    description: "ID группы",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    required: false,
    description: "Смещение",
    example: 0,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "Количество записей",
    example: 100,
  })
  async getGroupPostsFromDb(
    @Query("group_id") group_id: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
  ) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    return this.groupPostsUseCase.getFromDb(
      Number(group_id),
      offset !== undefined ? Number(offset) : 0,
      count !== undefined ? Number(count) : 100,
    );
  }

  @Get("posts/load")
  @ApiOperation({
    summary: "Загрузить посты группы из VK API и сохранить в БД",
    description:
      "Постранично загружает посты через wall.get и сохраняет в коллекцию posts. " +
      "mode=sync — последовательно, mode=async — параллельно (батчи по 3 страницы), " +
      "mode=stream — SSE-поток событий.",
  })
  @ApiQuery({
    name: "group_id",
    type: Number,
    required: true,
    description: "ID группы ",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    required: false,
    description: "Начальное смещение",
    example: 0,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "Общее количество постов (0 = все доступные)",
    example: 200,
  })
  @ApiQuery({
    name: "page_size",
    type: Number,
    required: false,
    description: "Размер страницы (макс. 100)",
    example: 100,
  })
  @ApiQuery({
    name: "rewrite",
    type: Boolean,
    required: false,
    description: "Перезаписать посты, если уже сохранены",
    example: false,
  })
  @ApiQuery({
    name: "mode",
    type: String,
    required: false,
    description: "Режим: sync | async | stream",
    example: "sync",
    enum: ["sync", "async", "stream"],
  })
  async loadGroupPosts(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("rewrite") rewrite?: string,
    @Query("mode") mode?: string,
  ): Promise<any> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const params = {
      group_id: Number(group_id),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      rewrite: rewrite === "true" || rewrite === "1",
    };

    const resolvedMode = (mode as "sync" | "async" | "stream") ?? "sync";

    try {
      if (resolvedMode === "stream") {
        const obs = this.groupPostsUseCase.loadStream(params);
        return new Observable<MessageEvent>((subscriber) => {
          obs.subscribe({
            next: (event) => subscriber.next({ data: event } as MessageEvent),
            error: (err) => {
              this.logger.error(
                `[posts/load stream] ${err.message}`,
                err.stack,
              );
              subscriber.error(err);
            },
            complete: () => subscriber.complete(),
          });
        });
      }

      if (resolvedMode === "async") {
        return await this.groupPostsUseCase.loadAsync(params);
      }

      return await this.groupPostsUseCase.loadSync(params);
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Sse("posts/load/stream")
  @ApiOperation({
    summary: "Загрузить посты группы (SSE-поток)",
    description:
      "Открывает Server-Sent Events поток. Каждая страница постов генерирует событие прогресса.",
  })
  @ApiQuery({
    name: "group_id",
    type: Number,
    required: true,
    example: DEFAULT_GROUP_ID,
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
    description: "0 = все посты",
    example: 0,
  })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 100 })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  streamGroupPosts(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const obs = this.groupPostsUseCase.loadStream({
      group_id: Number(group_id),
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      rewrite: rewrite === "true" || rewrite === "1",
    });

    return new Observable<MessageEvent>((subscriber) => {
      obs.subscribe({
        next: (event) => subscriber.next({ data: event } as MessageEvent),
        error: (err) => {
          this.logger.error(`[posts/load/stream] ${err.message}`, err.stack);
          subscriber.next({
            data: { type: "error", error: err.message },
          } as MessageEvent);
          subscriber.complete();
        },
        complete: () => subscriber.complete(),
      });
    });
  }

  // ─── MEMBERS ───────────────────────────────────────────────────────────────

  @Get("members/fetch")
  @ApiOperation({
    summary: "Получить участников группы из VK API (без сохранения)",
    description:
      "Вызывает groups.getMembers и возвращает одну страницу участников.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы или короткое имя",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    required: false,
    description: "Смещение",
    example: 0,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "Количество участников (макс. 1000)",
    example: 100,
  })
  @ApiQuery({
    name: "fields",
    type: String,
    required: false,
    description: "Дополнительные поля профиля через запятую",
    example: "",
  })
  async fetchGroupMembers(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("fields") fields?: string,
  ) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");
    try {
      return await this.groupMembersUseCase.fetch({
        group_id,
        access_token,
        offset: offset !== undefined ? Number(offset) : 0,
        count: count !== undefined ? Number(count) : 100,
        fields: this.parseFields(fields ?? ""),
      });
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Get("members/get")
  @ApiOperation({
    summary: "Получить участников группы из базы данных",
    description: "Читает страницы участников из коллекции groups (ArangoDB).",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы",
    example: DEFAULT_GROUP_ID,
  })
  async getGroupMembersFromDb(@Query("group_id") group_id: string) {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    const result = await this.groupMembersUseCase.getFromDb(group_id);
    if (!result) {
      throw new BadRequestException(
        `Участники группы ${group_id} не найдены в базе данных`,
      );
    }
    return result;
  }

  @Get("members/load")
  @ApiOperation({
    summary: "Загрузить участников группы из VK API и сохранить в БД",
    description:
      "Постранично загружает участников через groups.getMembers и сохраняет в коллекцию groups. " +
      "mode=sync — последовательно, mode=async — параллельно (батчи по 3 страницы), " +
      "mode=stream — SSE-поток событий.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    description: "ID группы ",
    example: DEFAULT_GROUP_ID,
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "Токен доступа VK API",
    example: DEFAULT_TOKEN,
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    required: false,
    description: "Начальное смещение",
    example: 0,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    required: false,
    description: "Общее количество участников для загрузки (0 = все)",
    example: 0,
  })
  @ApiQuery({
    name: "page_size",
    type: Number,
    required: false,
    description: "Размер страницы (макс. 1000)",
    example: 1000,
  })
  @ApiQuery({
    name: "fields",
    type: String,
    required: false,
    description: "Дополнительные поля профиля участников",
    example: "",
  })
  @ApiQuery({
    name: "rewrite",
    type: Boolean,
    required: false,
    description: "Перезаписать данные, если уже сохранены",
    example: false,
  })
  @ApiQuery({
    name: "mode",
    type: String,
    required: false,
    description: "Режим: sync | async | stream",
    example: "sync",
    enum: ["sync", "async", "stream"],
  })
  async loadGroupMembers(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
    @Query("mode") mode?: string,
  ): Promise<any> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const params = {
      group_id,
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
        const obs = this.groupMembersUseCase.loadStream(params);
        return new Observable<MessageEvent>((subscriber) => {
          obs.subscribe({
            next: (event) => subscriber.next({ data: event } as MessageEvent),
            error: (err) => {
              this.logger.error(
                `[members/load stream] ${err.message}`,
                err.stack,
              );
              subscriber.error(err);
            },
            complete: () => subscriber.complete(),
          });
        });
      }

      if (resolvedMode === "async") {
        return await this.groupMembersUseCase.loadAsync(params);
      }

      return await this.groupMembersUseCase.loadSync(params);
    } catch (e: any) {
      this.handleVkError(e);
    }
  }

  @Sse("members/load/stream")
  @ApiOperation({
    summary: "Загрузить участников группы (SSE-поток)",
    description:
      "Открывает Server-Sent Events поток. Каждая страница участников генерирует событие прогресса.",
  })
  @ApiQuery({
    name: "group_id",
    type: String,
    required: true,
    example: DEFAULT_GROUP_ID,
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
    description: "0 = все участники",
    example: 0,
  })
  @ApiQuery({ name: "page_size", type: Number, required: false, example: 1000 })
  @ApiQuery({ name: "fields", type: String, required: false, example: "" })
  @ApiQuery({ name: "rewrite", type: Boolean, required: false, example: false })
  streamGroupMembers(
    @Query("group_id") group_id: string,
    @Query("access_token") access_token: string,
    @Query("offset") offset?: string,
    @Query("count") count?: string,
    @Query("page_size") page_size?: string,
    @Query("fields") fields?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    if (!group_id) throw new BadRequestException("group_id обязателен");
    if (!access_token) throw new BadRequestException("access_token обязателен");

    const obs = this.groupMembersUseCase.loadStream({
      group_id,
      access_token,
      offset: offset !== undefined ? Number(offset) : 0,
      count: count !== undefined ? Number(count) : 0,
      page_size: page_size !== undefined ? Number(page_size) : undefined,
      fields: this.parseFields(fields ?? ""),
      rewrite: rewrite === "true" || rewrite === "1",
    });

    return new Observable<MessageEvent>((subscriber) => {
      obs.subscribe({
        next: (event) => subscriber.next({ data: event } as MessageEvent),
        error: (err) => {
          this.logger.error(`[members/load/stream] ${err.message}`, err.stack);
          subscriber.next({
            data: { type: "error", error: err.message },
          } as MessageEvent);
          subscriber.complete();
        },
        complete: () => subscriber.complete(),
      });
    });
  }

  // ─── Вспомогательные методы ────────────────────────────────────────────────

  /**
   * Разобрать строку полей через запятую в массив.
   * Пустые строки игнорируются.
   */
  private parseFields(fields: string): string[] | undefined {
    if (!fields || !fields.trim()) return undefined;
    return fields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  /**
   * Обработать ошибку VK API — выбросить BadRequestException с кодом и сообщением.
   */
  private handleVkError(e: any): never {
    if (e instanceof VkApiError) {
      throw new BadRequestException({
        error_code: e.code,
        error_msg: e.msg,
      });
    }
    throw e;
  }
}
