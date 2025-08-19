import {
  Controller,
  Get,
  Logger,
  Query,
  Post,
  HttpException,
  HttpStatus,
  Sse,
  MessageEvent,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { API_V1, USER_TAG, VK_ERROR_RETRY_DELAY, VK_TAG } from "src/constants";
import {
  VkUsersGetParamsDto,
  VkUsersGetSubscriptionsParamsDto,
  VkUsersGetSubscriptionsDbParamsDto,
} from "./dto";
import { FetchVkUserService } from "src/domain/parser/vk/vk-user/services/cqrs/queries/fetch-vk-user.service";
import { FetchVkUserSubscriptionsService } from "src/domain/parser/vk/vk-user/services/cqrs/queries/fetch-vk-user-subscriptions.service";
import { GetVkSubscriptionsService } from "src/domain/parser/vk/vk-user/services/cqrs/queries/get-vk-subscriptions.service";
import { LoadVkUserSubscriptionsService } from "src/domain/parser/vk/vk-user/services/cqrs/commands/load-vk-user-subscriptions.service";
import { VkUserSubscriptionsJobService } from "src/infrastructure/jobs/vk-user-subscriptions.job.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { VkUserSubscriptionsQueueEventsService } from "src/infrastructure/queue/vk-user-subscriptions-queue-events.service";

@ApiTags(`${VK_TAG}-${USER_TAG}`)
@Controller(`${API_V1}/${VK_TAG}`)
export class VkUserController {
  private readonly logger = new Logger(VkUserController.name);
  constructor(
    private readonly fetchVkUser: FetchVkUserService,
    private readonly fetchVkUserSubscriptions: FetchVkUserSubscriptionsService,
    private readonly getVkSubscriptions: GetVkSubscriptionsService,
    private readonly loadSubscriptionsUseCase: LoadVkUserSubscriptionsService,
    private readonly subsJobs: VkUserSubscriptionsJobService,
    private readonly subsQueueSvc: VkUserSubscriptionsQueueEventsService,
  ) {}

  @Get(`${USER_TAG}/fetch`)
  @ApiOperation({ summary: "Получить информацию о пользователе из VK API" })
  @ApiOkResponse({ description: "Ответ VK" })
  async fetch(@Query() params: VkUsersGetParamsDto) {
    const res = await this.fetchVkUser.execute({
      user_id: params.user_id,
      access_token: (params as any).access_token,
      fields: params.fields,
      name_case: params.name_case,
    } as any);
    return res;
  }

  @Get(`${USER_TAG}/subscriptions/fetch`)
  @ApiOperation({ summary: "Получить подписки пользователя из VK API" })
  @ApiOkResponse({ description: "Ответ VK" })
  async fetchSubscriptions(@Query() params: VkUsersGetSubscriptionsParamsDto) {
    const res = await this.fetchVkUserSubscriptions.execute({
      user_id: params.user_id,
      access_token: (params as any).access_token,
      extended: params.extended,
      offset: params.offset,
      count: params.count,
      fields: params.fields,
    } as any);
    return res;
  }

  @Get(`${USER_TAG}/subscriptions/get`)
  @ApiOperation({ summary: "Получить подписки пользователя из базы" })
  @ApiOkResponse({ description: "Список group ids" })
  async getSubscriptions(@Query() params: VkUsersGetSubscriptionsDbParamsDto) {
    const countNum =
      params.count !== undefined && params.count !== null
        ? Number(params.count)
        : undefined;
    const offsetNum = Number(params.offset) || 0;
    const res = await this.getVkSubscriptions.execute(
      Number(params.user_id),
      countNum,
      offsetNum,
    );
    return res;
  }

  @Post(`${USER_TAG}/load`)
  @ApiOperation({ summary: "Загрузить/обновить пользователя в users" })
  async load() {
    throw new HttpException(
      "user/load endpoint is temporarily disabled during migration to application use-cases",
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Post(`${USER_TAG}/subscriptions/load`)
  @ApiOperation({
    summary: "Синхронно загрузить подписки пользователя (группы)",
  })
  @ApiOkResponse({
    description: "Результат загрузки",
    schema: { example: { processedGroups: 42, groupIds: [1, 2, 3] } },
  })
  async loadSubscriptions(@Query() params: VkUsersGetSubscriptionsParamsDto) {
    try {
      const res = await this.loadSubscriptionsUseCase.execute(params as any);
      return res;
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || "Failed to load subscriptions",
      );
    }
  }

  @Post(`${USER_TAG}/subscriptions/load/async`)
  @ApiOperation({
    summary: "Поставить задачу загрузки подписок пользователя в очередь",
  })
  async loadSubscriptionsAsync(
    @Query() params: VkUsersGetSubscriptionsParamsDto,
  ) {
    const jobId = await this.subsJobs.addLoadJob(params as any);
    return { jobId };
  }

  @Sse(`${USER_TAG}/subscriptions/load/stream`)
  @ApiOperation({
    summary: "Стрим прогресса загрузки подписок (SSE)",
    description:
      "Открывает поток событий (Server-Sent Events) для отслеживания прогресса загрузки подписок пользователя.",
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
  @ApiQuery({ name: "extended", type: Boolean, required: false })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  @ApiQuery({ name: "fields", type: [String], required: false })
  streamLoadSubscriptions(
    @Query() params: VkUsersGetSubscriptionsParamsDto,
  ): Observable<MessageEvent> {
    const id = Number(params.user_id);
    const access_token = params.access_token;
    const extended = params.extended;
    const count = params.count;
    const offset = params.offset;
    const fields = params.fields;

    if (!id || Number.isNaN(id))
      throw new BadRequestException("user_id is required");
    if (!access_token)
      throw new BadRequestException("access_token is required");

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        const job = await this.subsQueueSvc.addJob(
          id,
          {
            attempts: 3,
            backoff: { type: "exponential", delay: VK_ERROR_RETRY_DELAY },
          },
          {
            access_token,
            extended,
            count,
            offset,
            fields,
          },
        );
        subscriber.next({
          data: {
            type: "started",
            jobId: job.id,
            userId: id,
            access_token,
            extended,
            count,
            offset,
            fields,
          },
        });
        const sub = this.subsQueueSvc
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
