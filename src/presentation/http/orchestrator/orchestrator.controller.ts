import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Logger,
  BadRequestException,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { Observable } from "rxjs";
import { API_V1, VK_TAG, GRAPH_TAG, FRIENDS_TAG, BFS_TAG } from "src/constants";
import { OrchestrateFriendsUseCase } from "src/application/use-cases/orchestrator/orchestrate-friends.usecase";
import {
  OrchestrateFriendsRequestDto,
  OrchestrateFriendsResponseDto,
  LoadFriendsGraphRequestDto,
  LoadFriendsGraphResponseDto,
} from "./dto";
import { VkApiError } from "src/infrastructure/vk/types";
import { VkFriendsJobService } from "src/infrastructure/jobs/vk-friends.job.service";
import { LoadFriendsGraphUseCase } from "src/application/use-cases/orchestrator/load-friends-graph.usecase";
import { LoadFriendsGraphParamsMapper } from "src/application/use-cases/orchestrator/mappers/load-friends-graph-params.mapper";
import settings from "src/settings";

interface OrchestrateStreamEvent {
  type: "progress" | "completed" | "error";
  processed?: number;
  total?: number;
  currentUserId?: number;
  success?: boolean;
  error?: string;
  result?: OrchestrateFriendsResponseDto;
}

@ApiTags(`${VK_TAG}-${GRAPH_TAG}-${FRIENDS_TAG}`)
@Controller(`${API_V1}/${VK_TAG}/${GRAPH_TAG}/${FRIENDS_TAG}/${BFS_TAG}`)
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(
    private readonly orchestrateUseCase: OrchestrateFriendsUseCase,
    private readonly friendsJobService: VkFriendsJobService,
    private readonly loadFriendsGraphUseCase: LoadFriendsGraphUseCase,
    private readonly paramsMapper: LoadFriendsGraphParamsMapper,
  ) {}

  @Post("fetch")
  @ApiOperation({
    summary: "Синхронный сбор друзей из VK API для списка пользователей",
    description:
      "Получает друзей из VK API для каждого пользователя из списка без сохранения в БД",
  })
  @ApiOkResponse({ type: OrchestrateFriendsResponseDto })
  @ApiBody({ type: OrchestrateFriendsRequestDto })
  async fetchSync(@Body() body: OrchestrateFriendsRequestDto) {
    if (!body.access_token) {
      throw new BadRequestException("access_token is required");
    }
    try {
      const result = await this.orchestrateUseCase.execute({
        userIds: body.user_ids,
        batchSize: body.batch_size,
        concurrency: body.concurrency,
        mode: "fetch",
        params: {
          count: body.count,
          offset: body.offset,
          fields: body.fields,
          name_case: body.name_case,
          access_token: body.access_token,
        },
      });

      return {
        processed: result.processed,
        failed: result.failed,
        results: result.results.map((r) => ({
          user_id: r.userId,
          success: r.success,
          error: r.error,
          data: r.data,
        })),
      } as OrchestrateFriendsResponseDto;
    } catch (e: any) {
      if (e instanceof VkApiError) {
        throw new BadRequestException({
          error_code: e.code,
          error_msg: e.msg,
        });
      }
      throw e;
    }
  }

  @Post("load")
  @ApiOperation({
    summary: "Синхронный сбор и сохранение друзей для списка пользователей",
    description:
      "Получает друзей из VK API для каждого пользователя из списка и сохраняет в БД",
  })
  @ApiOkResponse({ type: OrchestrateFriendsResponseDto })
  @ApiBody({ type: OrchestrateFriendsRequestDto })
  async loadSync(@Body() body: OrchestrateFriendsRequestDto) {
    if (!body.access_token) {
      throw new BadRequestException("access_token is required");
    }
    try {
      const result = await this.orchestrateUseCase.execute({
        userIds: body.user_ids,
        batchSize: body.batch_size,
        concurrency: body.concurrency,
        mode: "load",
        params: {
          count: body.count,
          offset: body.offset,
          fields: body.fields,
          name_case: body.name_case,
          access_token: body.access_token,
        },
        rewrite: body.rewrite,
      });

      return {
        processed: result.processed,
        failed: result.failed,
        results: result.results.map((r) => ({
          user_id: r.userId,
          success: r.success,
          error: r.error,
          data: r.data,
        })),
      } as OrchestrateFriendsResponseDto;
    } catch (e: any) {
      if (e instanceof VkApiError) {
        throw new BadRequestException({
          error_code: e.code,
          error_msg: e.msg,
        });
      }
      throw e;
    }
  }

  @Post("load/async")
  @ApiOperation({
    summary: "Асинхронный сбор и сохранение друзей для списка пользователей",
    description:
      "Ставит задачи в очередь для получения и сохранения друзей каждого пользователя из списка",
  })
  @ApiOkResponse({
    description: "ID задач в очереди",
    schema: {
      example: { jobIds: ["job1", "job2"] },
    },
  })
  @ApiBody({ type: OrchestrateFriendsRequestDto })
  async loadAsync(@Body() body: OrchestrateFriendsRequestDto) {
    if (!body.access_token) {
      throw new BadRequestException("access_token is required");
    }
    const jobIds: string[] = [];

    for (const userId of body.user_ids) {
      try {
        const jobId = await this.friendsJobService.addLoadJob({
          user_id: userId,
          access_token: body.access_token,
          count: body.count,
          offset: body.offset,
          fields: body.fields,
          name_case: body.name_case,
          order: undefined,
        });
        jobIds.push(jobId);
      } catch (e: any) {
        this.logger.error(
          `Failed to add job for user ${userId}: ${e?.message || e}`,
        );
      }
    }

    return { jobIds };
  }

  @Get("get")
  @ApiOperation({
    summary: "Получение друзей из БД для списка пользователей",
    description:
      "Получает друзей из базы данных для каждого пользователя из списка",
  })
  @ApiOkResponse({ type: OrchestrateFriendsResponseDto })
  @ApiQuery({
    name: "user_ids",
    type: String,
    required: true,
    description: "Список ID пользователей через запятую",
    example: `${settings.vkApi.defaultStartId},123456789`,
  })
  @ApiQuery({ name: "batch_size", type: Number, required: false })
  @ApiQuery({ name: "concurrency", type: Number, required: false })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  async getFromDb(
    @Query("user_ids") user_ids: string,
    @Query("batch_size") batch_size?: number,
    @Query("concurrency") concurrency?: number,
    @Query("count") count?: number,
    @Query("offset") offset?: number,
  ) {
    const userIds = user_ids
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (userIds.length === 0) {
      throw new BadRequestException(
        "user_ids must contain at least one valid ID",
      );
    }

    try {
      const result = await this.orchestrateUseCase.execute({
        userIds,
        batchSize: batch_size ? Number(batch_size) : undefined,
        concurrency: concurrency ? Number(concurrency) : undefined,
        mode: "get",
        params: {
          count: count ? Number(count) : undefined,
          offset: offset ? Number(offset) : undefined,
        },
      });

      return {
        processed: result.processed,
        failed: result.failed,
        results: result.results.map((r) => ({
          user_id: r.userId,
          success: r.success,
          error: r.error,
          data: r.data,
        })),
      } as OrchestrateFriendsResponseDto;
    } catch (e: any) {
      throw e;
    }
  }

  @Sse("load/stream")
  @ApiOperation({
    summary: "Поточный сбор и сохранение друзей для списка пользователей (SSE)",
    description:
      "Открывает поток событий (Server-Sent Events) для отслеживания прогресса загрузки друзей списка пользователей",
  })
  @ApiQuery({
    name: "user_ids",
    type: String,
    required: true,
    description: "Список ID пользователей через запятую",
    example: `${settings.vkApi.defaultStartId},123456789`,
  })
  @ApiQuery({ name: "batch_size", type: Number, required: false })
  @ApiQuery({ name: "concurrency", type: Number, required: false })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "VK API access_token",
  })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  @ApiQuery({ name: "fields", type: [String], required: false })
  @ApiQuery({ name: "name_case", type: String, required: false })
  @ApiQuery({
    name: "rewrite",
    type: Boolean,
    required: false,
    description: "Перезаписать данные даже если они уже сохранены",
  })
  stream(
    @Query("user_ids") user_ids: string,
    @Query("batch_size") batch_size?: string,
    @Query("concurrency") concurrency?: string,
    @Query("access_token") access_token?: string,
    @Query("count") count?: string,
    @Query("offset") offset?: string,
    @Query("fields") fields?: string | string[],
    @Query("name_case") name_case?: string,
    @Query("rewrite") rewrite?: string,
  ): Observable<MessageEvent> {
    const userIds = user_ids
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (userIds.length === 0) {
      throw new BadRequestException(
        "user_ids must contain at least one valid ID",
      );
    }

    if (!access_token) {
      throw new BadRequestException("access_token is required");
    }

    const fieldsArray =
      typeof fields === "string"
        ? fields.split(",").map((f) => f.trim())
        : Array.isArray(fields)
        ? fields
        : undefined;

    const rewriteBool = rewrite === "true" || rewrite === "1";

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const result = await this.orchestrateUseCase.execute({
            userIds,
            batchSize: batch_size ? Number(batch_size) : undefined,
            concurrency: concurrency ? Number(concurrency) : undefined,
            mode: "load",
            params: {
              access_token: access_token,
              count: count ? Number(count) : undefined,
              offset: offset ? Number(offset) : undefined,
              fields: fieldsArray,
              name_case: name_case as any,
            },
            rewrite: rewriteBool,
            onProgress: async (info) => {
              subscriber.next({
                data: {
                  type: "progress",
                  processed: info.processed,
                  total: info.total,
                  currentUserId: info.currentUserId,
                  success: info.success,
                  error: info.error,
                } as OrchestrateStreamEvent,
              } as MessageEvent);
            },
          });

          subscriber.next({
            data: {
              type: "completed",
              result: {
                processed: result.processed,
                failed: result.failed,
                results: result.results.map((r) => ({
                  user_id: r.userId,
                  success: r.success,
                  error: r.error,
                  data: r.data,
                })),
              },
            } as OrchestrateStreamEvent,
          } as MessageEvent);

          subscriber.complete();
        } catch (e: any) {
          subscriber.next({
            data: {
              type: "error",
              error: e?.message || String(e),
            } as OrchestrateStreamEvent,
          } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  @Get("load")
  @ApiOperation({
    summary: "Обход дружеской сети по уровням (BFS)",
    description:
      "Обходит граф друзей начиная с start_id до указанной глубины. Поддерживает три режима: sync (синхронный), async (асинхронный), stream (поточный SSE).",
  })
  @ApiOkResponse({
    description:
      "Результат обхода графа (для sync/async режимов) или SSE поток (для stream режима)",
    type: LoadFriendsGraphResponseDto,
  })
  async loadGraph(@Query() dto: LoadFriendsGraphRequestDto) {
    try {
      const params = this.paramsMapper.toUseCaseParams(dto);
      const result = await this.loadFriendsGraphUseCase.execute(params);

      if (dto.mode === "stream" && result instanceof Observable) {
        return new Observable<MessageEvent>((subscriber) => {
          result.subscribe({
            next: (event) => {
              subscriber.next({
                data: event,
              } as MessageEvent);
            },
            error: (err) => {
              this.logger.error(`Stream error: ${err.message}`, err.stack);
              subscriber.error(err);
            },
            complete: () => {
              subscriber.complete();
            },
          });
        });
      }

      return result;
    } catch (e: any) {
      if (e instanceof VkApiError) {
        throw new BadRequestException({
          error_code: e.code,
          error_msg: e.msg,
        });
      }
      throw e;
    }
  }

  @Sse("load/graph/stream")
  @ApiOperation({
    summary: "Обход дружеской сети по уровням (stream режим через SSE)",
    description:
      "Открывает SSE поток для отслеживания прогресса обхода графа друзей в реальном времени",
  })
  streamGraph(
    @Query() dto: LoadFriendsGraphRequestDto,
  ): Observable<MessageEvent> {
    const params = this.paramsMapper.toUseCaseParams({
      ...dto,
      mode: "stream",
    });

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const result = await this.loadFriendsGraphUseCase.execute(params);
          if (result instanceof Observable) {
            result.subscribe({
              next: (event) => {
                subscriber.next({
                  data: event,
                } as MessageEvent);
              },
              error: (err) => {
                this.logger.error(`Stream error: ${err.message}`, err.stack);
                subscriber.next({
                  data: {
                    type: "error",
                    error: err.message || String(err),
                  },
                } as MessageEvent);
                subscriber.complete();
              },
              complete: () => {
                subscriber.complete();
              },
            });
          } else {
            subscriber.next({
              data: result,
            } as MessageEvent);
            subscriber.complete();
          }
        } catch (e: any) {
          this.logger.error(`Stream execution failed: ${e.message}`, e.stack);
          subscriber.next({
            data: {
              type: "error",
              error: e?.message || String(e),
            },
          } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }
}
