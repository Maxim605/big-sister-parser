import {
  Controller,
  Get,
  Logger,
  Query,
  Post,
  Sse,
  MessageEvent,
  BadRequestException,
  Res,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { API_V1, FRIENDS_TAG, VK_TAG } from "src/constants";
import { VkFriendsGetParamsDto, VkFriendsGetResponseDto } from "./dto";
import { FetchVkFriendsUseCase } from "src/application/use-cases/vk-friends/fetch-vk-friends.usecase";
import { GetVkFriendsUseCase } from "src/application/use-cases/vk-friends/get-vk-friends.usecase";
import { VkFriendsResponse } from "src/infrastructure/vk/types";
import { LoadVkFriendsUseCase } from "src/application/use-cases/vk-friends/load-vk-friends.usecase";
import { VkFriendsJobService } from "src/infrastructure/jobs/vk-friends.job.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { VkFriendsQueueEventsService } from "src/infrastructure/queue/vk-friends-queue-events.service";
import { FriendsStreamEvent } from "src/application/use-cases/vk-friends/dto/friends-stream.events";
import { VkApiError } from "src/infrastructure/vk/types";
import { Response } from "express";

@ApiTags(`${VK_TAG}-${FRIENDS_TAG}`)
@Controller(`${API_V1}/${VK_TAG}/${FRIENDS_TAG}`)
export class VkFriendsController {
  private readonly logger = new Logger(VkFriendsController.name);
  constructor(
    private readonly loadVkFriends: LoadVkFriendsUseCase,
    private readonly jobs: VkFriendsJobService,
    private readonly fetchVkFriends: FetchVkFriendsUseCase,
    private readonly getVkFriends: GetVkFriendsUseCase,
    private readonly queueSvc: VkFriendsQueueEventsService,
  ) {}

  @Get("fetch")
  @ApiOperation({ summary: "Получить друзей из VK API (без сохранения)" })
  @ApiOkResponse({ type: () => VkFriendsGetResponseDto })
  async fetch(@Query() query: VkFriendsGetParamsDto, @Res() res: Response) {
    try {
      const data = await this.fetchVkFriends.execute({
        user_id: query.user_id,
        access_token: (query as any).access_token,
        count: query.count,
        offset: query.offset,
        fields: query.fields,
        order: query.order,
        name_case: query.name_case,
      });
      return res.json({
        count: data.count,
        items: data.items,
      } as VkFriendsGetResponseDto);
    } catch (e: any) {
      if (e instanceof VkApiError) {
        return res.status(400).json({ error_code: e.code, error_msg: e.msg });
      }
      throw e;
    }
  }

  @Get("get")
  @ApiOperation({ summary: "Получить друзей из базы (как VK friends.get)" })
  @ApiOkResponse({ type: () => VkFriendsGetResponseDto })
  @ApiQuery({ name: "user_id", type: Number, required: true })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  async getFromDb(
    @Query("user_id") user_id: number,
    @Query("count") count?: number,
    @Query("offset") offset?: number,
  ): Promise<VkFriendsResponse> {
    const countNum =
      count !== undefined && count !== null ? Number(count) : undefined;
    const offsetNum = Number(offset) || 0;
    const res = await this.getVkFriends.execute(
      Number(user_id),
      countNum,
      offsetNum,
    );
    return res;
  }

  @Post("load")
  @ApiOperation({
    summary: "Синхронно загрузить друзей из VK и сохранить в БД",
  })
  @ApiOkResponse({
    description: "Результат загрузки",
    schema: { example: { processed: 123, failed: 0 } },
  })
  async loadSync(@Query() params: VkFriendsGetParamsDto) {
    try {
      const result = await this.loadVkFriends.execute(params as any);
      return result;
    } catch (e: any) {
      if (e instanceof VkApiError) {
        // Map VK error to 400 with code and message
        throw new BadRequestException({
          error_code: e.code,
          error_msg: e.msg,
        });
      }
      throw e;
    }
  }

  @Post("load/async")
  @ApiOperation({ summary: "Поставить задачу загрузки друзей из VK в очередь" })
  async load(@Query() params: VkFriendsGetParamsDto) {
    const jobId = await this.jobs.addLoadJob(params as any);
    return { jobId };
  }

  @Get("load/status")
  @ApiOperation({ summary: "Статус задачи загрузки друзей" })
  @ApiQuery({ name: "jobId", type: String, required: true })
  async status(@Query("jobId") jobId: string) {
    const state = await this.jobs.getJobState(jobId);
    if (!state) return { jobId, state: "not_found" };
    return state;
  }

  @Sse("load/stream")
  @ApiOperation({
    summary: "Стрим прогресса загрузки друзей (SSE)",
    description:
      "Открывает поток событий (Server-Sent Events) для отслеживания прогресса загрузки друзей пользователя. Формат событий: FriendsStreamEvent.",
  })
  @ApiQuery({
    name: "user_id",
    type: Number,
    required: true,
    description: "ID пользователя VK",
  })
  @ApiQuery({
    name: "access_token",
    type: String,
    required: true,
    description: "VK access_token",
  })
  @ApiQuery({ name: "order", type: String, required: false })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  @ApiQuery({ name: "fields", type: [String], required: false })
  @ApiQuery({ name: "name_case", type: String, required: false })
  stream(@Query() params: VkFriendsGetParamsDto): Observable<MessageEvent> {
    const id = Number(params.user_id);
    const access_token = params.access_token;
    const order = params.order;
    const count = params.count;
    const offset = params.offset;
    const fields = params.fields;
    const name_case = params.name_case;

    if (!id || Number.isNaN(id))
      throw new BadRequestException("user_id is required");
    if (!access_token)
      throw new BadRequestException("access_token is required");

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        const job = await this.queueSvc.addJob(
          id,
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
          {
            access_token,
            order,
            count,
            offset,
            fields,
            name_case,
          },
        );
        subscriber.next({
          data: {
            type: "started",
            jobId: job.id,
            userId: id,
            access_token: access_token,
            order: order,
            count: count,
            offset: offset,
            fields: fields,
            name_case: name_case,
          } as FriendsStreamEvent,
        });
        const sub = this.queueSvc
          .stream(job.id as string)
          .pipe(map((evt) => ({ data: evt }) as MessageEvent))
          .subscribe({
            next: (ev) => subscriber.next(ev),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        return () => sub.unsubscribe();
      })().catch((e) => subscriber.error(e));
    });
  }
}
