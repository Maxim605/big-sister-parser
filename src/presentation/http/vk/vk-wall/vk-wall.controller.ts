import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Post,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { LoadWallGetUseCase } from "src/application/use-cases/vk-wall/load-wall-get.usecase";
import { LoadWallGetByIdUseCase } from "src/application/use-cases/vk-wall/load-wall-get-by-id.usecase";
import { VkWallJobService } from "src/infrastructure/jobs/vk-wall.job.service";
import settings from "src/settings";
import { WallfetchParamsDto } from "./dto/wall-fetch-params.dto";
import { WallGetParamsDto } from "./dto/wall-get-params.dto";
import { IVkWallApiClient } from "src/infrastructure/vk/ivk-api.client";
import { Inject } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Queue } from "bullmq";
import { TOKENS } from "src/common/tokens";
import { VkWallQueueEventsService } from "src/infrastructure/queue/vk-wall-queue-events.service";
import { WallLoadParamsDto } from "./dto/wall-load-params.dto";
import { IPostRepository } from "src/domain/repositories/ipost.repository";
import { VK_ERROR_RETRY_DELAY } from "src/constants";
import { VkApiError } from "src/infrastructure/vk/types";
import { Logger } from "@nestjs/common";

@ApiTags("vk-wall")
@Controller("vk/wall")
export class VkWallController {
  private readonly logger = new Logger(VkWallController.name);
  constructor(
    private readonly loadByOwner: LoadWallGetUseCase,
    private readonly loadByIds: LoadWallGetByIdUseCase,
    private readonly jobs: VkWallJobService,
    @Inject(TOKENS.IVkWallApiClient) private readonly api: IVkWallApiClient,
    private readonly wallQueueEvents: VkWallQueueEventsService,
    @Inject(TOKENS.IPostRepository) private readonly posts: IPostRepository,
  ) {}

  @Get("load")
  @ApiOperation({ summary: "Сохранить посты в базу по owner id/domain (sync)" })
  @ApiQuery({ name: "owner_id", required: false, type: Number })
  @ApiQuery({ name: "domain", required: false, type: String })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @ApiQuery({ name: "access_token", required: true, type: String })
  async load(@Query() dto: WallLoadParamsDto) {
    await new Promise((r) => setTimeout(r, VK_ERROR_RETRY_DELAY));
    if (!dto.owner_id && !dto.domain)
      throw new BadRequestException("owner_id xor domain is required");
    if (!dto.access_token)
      throw new BadRequestException("access_token is required");
    if (dto.owner_id && dto.domain)
      throw new BadRequestException(
        "Specify either owner_id or domain, not both",
      );
    const count = Math.min(
      Math.max(dto.count, 1),
      settings.vkWall.api.maxPageSize,
    );
    try {
      const result = await this.loadByOwner.execute({
        ownerId: dto.owner_id,
        domain: dto.domain,
        offset: dto.offset,
        count,
        mode: "sync",
        token: dto.access_token,
      } as any);
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

  @Post("load/async")
  @ApiOperation({
    summary: "Сохранить посты в базу (async) поставить в очередь",
  })
  @ApiQuery({ name: "owner_id", required: false, type: Number })
  @ApiQuery({ name: "domain", required: false, type: String })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @ApiQuery({ name: "access_token", required: true, type: String })
  async loadAsync(@Query() dto: WallLoadParamsDto) {
    await new Promise((r) => setTimeout(r, VK_ERROR_RETRY_DELAY));
    if (!dto.owner_id && !dto.domain)
      throw new BadRequestException("owner_id xor domain is required");
    if (!dto.access_token)
      throw new BadRequestException("access_token is required");
    if (dto.owner_id && dto.domain)
      throw new BadRequestException(
        "Specify either owner_id or domain, not both",
      );
    const count = Math.min(
      Math.max(dto.count, 1),
      settings.vkWall.api.maxPageSize,
    );
    const jobId = await this.jobs.enqueueParseByOwner({
      ownerId: dto.owner_id,
      domain: dto.domain,
      offset: dto.offset,
      count,
      mode: "async",
      token: dto.access_token,
    } as any);
    return { jobId };
  }

  @Get("load/status")
  @ApiOperation({ summary: "Получить статус задачи" })
  @ApiQuery({ name: "jobId", type: String, required: true })
  async loadStatus(@Query("jobId") jobId: string) {
    return this.status(jobId);
  }

  @Sse("load/stream")
  @ApiOperation({ summary: "Стрим прогресса сохранения постов (SSE)" })
  @ApiQuery({ name: "owner_id", required: true, type: Number })
  @ApiQuery({ name: "domain", required: false, type: String })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @ApiQuery({ name: "access_token", required: true, type: String })
  streamLoad(@Query() dto: WallLoadParamsDto): Observable<MessageEvent> {
    const count = Math.min(
      Math.max(dto.count, 1),
      settings.vkWall.api.maxPageSize,
    );

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        await new Promise((r) => setTimeout(r, VK_ERROR_RETRY_DELAY));
        if (!dto.owner_id && !dto.domain)
          throw new BadRequestException("owner_id xor domain is required");
        if (!dto.access_token)
          throw new BadRequestException("access_token is required");
        if (dto.owner_id && dto.domain)
          throw new BadRequestException(
            "Specify either owner_id or domain, not both",
          );
        const job = await this.wallQueueEvents.addLoadOwnerJob(
          {
            ownerId: dto.owner_id,
            domain: dto.domain,
            offset: dto.offset,
            count,
            mode: "async",
            token: dto.access_token,
          },
          {
            attempts: 2,
            backoff: {
              type: "exponential",
              delay: settings.vkWall.queue.backoffMs,
            },
          },
        );
        subscriber.next({
          data: {
            type: "started",
            jobId: job.id,
            owner_id: dto.owner_id,
            domain: dto.domain,
          },
        });
        const sub = this.wallQueueEvents
          .stream(String(job.id))
          .pipe(map((evt) => ({ data: evt }) as MessageEvent))
          .subscribe({
            next: (ev) => {
              subscriber.next(ev);
            },
            error: (err) => {
              subscriber.error(err);
            },
            complete: () => {
              subscriber.complete();
            },
          });
        return () => sub.unsubscribe();
      })().catch((e) => {
        subscriber.error(e);
      });
    });
  }

  @Get("status")
  @ApiOperation({ summary: "Получить статус задачи" })
  @ApiQuery({ name: "jobId", type: String, required: true })
  async status(@Query("jobId") jobId: string) {
    const state = await this.jobs.getJobState(jobId);
    if (!state) return { jobId, state: "not_found" };
    return state;
  }

  @Get("fetch")
  @ApiOperation({ summary: "VK wall.get (без сохранения), прямой вызов API" })
  @ApiQuery({ name: "owner_id", required: false, type: Number })
  @ApiQuery({ name: "domain", required: false, type: String })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @ApiQuery({ name: "access_token", required: true, type: String })
  async fetch(@Query() dto: WallfetchParamsDto) {
    if (!dto.owner_id && !dto.domain)
      throw new BadRequestException("owner_id xor domain is required");
    if (!dto.access_token)
      throw new BadRequestException("access_token is required");
    if (dto.owner_id && dto.domain)
      throw new BadRequestException(
        "Specify either owner_id or domain, not both",
      );
    const count = Math.min(
      Math.max(dto.count, 1),
      settings.vkWall.api.maxPageSize,
    );
    const res = await this.api.wallFetch({
      owner_id: dto.owner_id,
      domain: dto.domain,
      offset: dto.offset,
      count,
      token: (dto as any).access_token,
      extended: 0,
    } as any);
    return res as any;
  }

  @Get("get")
  @ApiOperation({ summary: "Получение постов из базы" })
  @ApiQuery({ name: "owner_id", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  async getFromApi(@Query() dto: WallGetParamsDto) {
    const hasPaging =
      typeof dto.offset === "number" || typeof dto.count === "number";
    const pageSize = Math.min(
      Math.max(dto.count, 1),
      settings.vkWall.api.maxPageSize,
    );

    if (hasPaging) {
      const items = await this.posts.findByOwner(dto.owner_id!, {
        offset: dto.offset,
        count: pageSize,
      });
      return { items } as any;
    }

    const all: any[] = [];
    let offset = 0;
    for (;;) {
      const batch = await this.posts.findByOwner(dto.owner_id!, {
        offset,
        count: pageSize,
      });
      if (!batch.length) break;
      all.push(...batch);
      offset += batch.length;
      if (batch.length < pageSize) break;
    }
    return { items: all } as any;
  }
}
