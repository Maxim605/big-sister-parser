import { Controller, Get, Logger, Query, Post } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { API_V1, USER_TAG, VK_TAG } from "src/constants";
import { VkUsersGetParamsDto, VkUsersGetSubscriptionsParamsDto } from "./dto";
import { LoadVkUserService } from "src/domain/parser/vk/vk-user/services/cqrs/commands/load-vk-user.service";
import { LoadVkUserSubscriptionsService } from "src/domain/parser/vk/vk-user/services/cqrs/commands/load-vk-user-subscriptions.service";
import { FetchVkUserUseCase } from "src/application/use-cases/vk-user/fetch-vk-user.usecase";
import { FetchVkUserSubscriptionsUseCase } from "src/application/use-cases/vk-user/fetch-vk-user-subscriptions.usecase";
import { GetVkSubscriptionsUseCase } from "src/application/use-cases/vk-user/get-vk-subscriptions.usecase";

@ApiTags(`${VK_TAG}-${USER_TAG}`)
@Controller(`${API_V1}/${VK_TAG}`)
export class VkUserController {
  private readonly logger = new Logger(VkUserController.name);
  constructor(
    private readonly loadVkUser: LoadVkUserService,
    private readonly loadVkUserSubscriptions: LoadVkUserSubscriptionsService,
    private readonly fetchVkUser: FetchVkUserUseCase,
    private readonly fetchVkUserSubscriptions: FetchVkUserSubscriptionsUseCase,
    private readonly getVkSubscriptions: GetVkSubscriptionsUseCase,
  ) {}

  @Get("user/fetch")
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

  @Get("user/fetch/subscriptions")
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

  @Get("user/get/subscriptions")
  @ApiOperation({ summary: "Получить подписки пользователя из базы" })
  @ApiOkResponse({ description: "Список group ids" })
  @ApiQuery({ name: "user_id", type: Number, required: true })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiQuery({ name: "offset", type: Number, required: false })
  async getSubscriptions(
    @Query("user_id") user_id: number,
    @Query("count") count?: number,
    @Query("offset") offset?: number,
  ) {
    const countNum =
      count !== undefined && count !== null ? Number(count) : undefined;
    const offsetNum = Number(offset) || 0;
    const res = await this.getVkSubscriptions.execute(
      Number(user_id),
      countNum,
      offsetNum,
    );
    return res;
  }

  @Post("user/load")
  @ApiOperation({ summary: "Загрузить/обновить пользователя в users" })
  async load(@Query() params: VkUsersGetParamsDto) {
    const res = await this.loadVkUser.execute({
      user_id: params.user_id,
      access_token: (params as any).access_token,
      fields: params.fields,
      name_case: params.name_case,
    } as any);
    return { message: "Пользователь сохранён", ...res };
  }

  @Post("user/load/subscriptions")
  @ApiOperation({ summary: "Загрузить подписки пользователя (группы)" })
  async loadSubscriptions(@Query() params: VkUsersGetSubscriptionsParamsDto) {
    const res = await this.loadVkUserSubscriptions.execute({
      user_id: params.user_id,
      access_token: (params as any).access_token,
      extended: params.extended,
      offset: params.offset,
      count: params.count,
      fields: params.fields,
    } as any);
    return { message: "Подписки сохранены", ...res };
  }
}
