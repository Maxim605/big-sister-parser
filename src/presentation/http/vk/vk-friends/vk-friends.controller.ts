import { Controller, Get, Logger, Query, Post } from "@nestjs/common";
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
import { VkFriendsResponse } from "src/domain/parser/vk/interfaces";
import { LoadVkFriendsUseCase } from "src/application/use-cases/vk-friends/load-vk-friends.usecase";

@ApiTags(`${VK_TAG}-${FRIENDS_TAG}`)
@Controller(`${API_V1}/${VK_TAG}/${FRIENDS_TAG}`)
export class VkFriendsController {
  private readonly logger = new Logger(VkFriendsController.name);
  constructor(
    private readonly loadVkFriends: LoadVkFriendsUseCase,
    private readonly fetchVkFriends: FetchVkFriendsUseCase,
    private readonly getVkFriends: GetVkFriendsUseCase,
  ) {}

  @Get("fetch")
  @ApiOperation({ summary: "Получить друзей из VK API (без сохранения)" })
  @ApiOkResponse({ type: () => VkFriendsGetResponseDto })
  async fetch(@Query() query: VkFriendsGetParamsDto) {
    const res = await this.fetchVkFriends.execute({
      user_id: query.user_id,
      access_token: (query as any).access_token,
      count: query.count,
      offset: query.offset,
      fields: query.fields,
      order: query.order,
      name_case: query.name_case,
    });
    return { count: res.count, items: res.items } as VkFriendsGetResponseDto;
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
  @ApiOperation({ summary: "Загрузить друзей из VK и сохранить" })
  async load(@Query() params: VkFriendsGetParamsDto) {
    const res = await this.loadVkFriends.execute(params as any);
    return { message: "Друзья успешно загружены и сохранены", ...res };
  }
}
