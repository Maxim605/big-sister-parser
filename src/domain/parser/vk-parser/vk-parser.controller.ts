import { Controller, Get, Logger, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_V1, PARSER_TAG, VK_PARSER_TAG } from "src/constants";
import { VkApiService } from "./services/vk-api.service";
import { FriendsGetResponse } from "./interfaces";
import { FriendsGetParamsDto, FriendsGetResponseDto } from "./dto";
import {
  InternalServiceErrorApiResponse,
  NotFoundErrorApiResponse,
} from "src/common/decorators/api";

@ApiTags(PARSER_TAG)
@Controller(`${API_V1}/${VK_PARSER_TAG}`)
export class VkParserController {
  private readonly logger = new Logger(VkParserController.name);

  constructor(private readonly vkApiService: VkApiService) {}

  @Get("friends")
  @ApiOperation({
    summary: "Получение списка друзей пользователя VK",
    description:
      "Метод VK API friends.get возвращает список друзей по заданным параметрам",
  })
  @ApiOkResponse({
    description: "Список друзей и их количество",
    type: () => FriendsGetResponseDto,
  })
  @InternalServiceErrorApiResponse("Ошибка при запросе сервисов VK")
  @NotFoundErrorApiResponse("Пользователь VK не найден")
  public async getFriends(
    @Query() query: FriendsGetParamsDto,
  ): Promise<FriendsGetResponse> {
    try {
      const result = this.vkApiService.friendsGet(query);
      return result;
    } catch (error) {
      this.logger.error("Ошибка при получении списка друзей VK", error);
      throw error;
    }
  }
}
