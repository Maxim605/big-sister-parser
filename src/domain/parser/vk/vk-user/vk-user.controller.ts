import { Controller, Get, Logger, Query, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { API_V1, VK_TAG } from "src/constants";
import { VkUsersGetParamsDto, VkUsersGetSubscriptionsParamsDto } from "./dto";
import { LoadVkUserService } from "./services/cqrs/commands/load-vk-user.service";
import { LoadVkUserSubscriptionsService } from "./services/cqrs/commands/load-vk-user-subscriptions.service";
import { GetVkUserService } from "./services/cqrs/queries/get-vk-user.service";
import { FetchVkUserService } from "./services/cqrs/queries/fetch-vk-user.service";
import { FetchVkUserSubscriptionsService } from "./services/cqrs/queries/fetch-vk-user-subscriptions.service";
import { GetVkSubscriptionsService } from "./services/cqrs/queries/get-vk-subscriptions.service";

@ApiTags(VK_TAG)
@Controller(`${API_V1}/${VK_TAG}`)
export class VkUserController {
  private readonly logger = new Logger(VkUserController.name);
  constructor(
    private readonly loadVkUser: LoadVkUserService,
    private readonly loadVkUserSubscriptions: LoadVkUserSubscriptionsService,
    private readonly getVkUser: GetVkUserService,
    private readonly fetchVkUser: FetchVkUserService,
    private readonly fetchVkUserSubscriptions: FetchVkUserSubscriptionsService,
    private readonly getVkSubscriptions: GetVkSubscriptionsService,
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
    const countNum = count !== undefined && count !== null ? Number(count) : undefined;
    const offsetNum = Number(offset) || 0;
    const res = await this.getVkSubscriptions.execute(Number(user_id), countNum, offsetNum);
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
