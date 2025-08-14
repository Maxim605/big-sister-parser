import { Controller, Get, Logger, Query, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_V1, VK_TAG } from "src/constants";
import { VkFriendsService } from "./services/vk-friends.service";
import { VkFriendsGetParamsDto, VkFriendsGetResponseDto } from "./dto";
import { FetchVkFriendsService } from "./services/cqrs/queries/fetch-vk-friends.service";

@ApiTags(VK_TAG)
@Controller(`${API_V1}/${VK_TAG}`)
export class VkFriendsController {
  private readonly logger = new Logger(VkFriendsController.name);
  constructor(
    private readonly vkFriendsService: VkFriendsService,
    private readonly fetchVkFriends: FetchVkFriendsService,
  ) {}

  @Get("friends/fetch")
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

  @Post("friends/load")
  @ApiOperation({ summary: "Загрузить друзей из VK и сохранить" })
  async load(@Query() params: VkFriendsGetParamsDto) {
    const res = await this.vkFriendsService.loadFriends(params as any);
    return { message: "Друзья успешно загружены и сохранены", ...res };
  }
}
