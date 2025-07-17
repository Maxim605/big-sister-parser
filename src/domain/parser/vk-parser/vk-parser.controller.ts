import { Controller, Get, Logger, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_V1, PARSER_TAG, VK_PARSER_TAG } from "src/constants";
import { VkApiService } from "./services/vk-api.service";
import { FriendsGetParams, FriendsGetResponse } from "./interfaces";
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
    type: () => VkParserController,
  })
  @InternalServiceErrorApiResponse("Ошибка при запросе сервисов VK")
  @NotFoundErrorApiResponse("Пользователь VK не найден")
  public async getFriends(
    @Query("token") token: string,
    @Query("user_id") user_id: number,
    @Query() params: Omit<FriendsGetParams, "token" | "user_id">,
  ): Promise<FriendsGetResponse> {
    const mergedParams: FriendsGetParams = { ...params, user_id, token };
    this.logger.log(
      `Вызов VK friends.get с параметрами: ${JSON.stringify(mergedParams)}`,
    );

    try {
      const result = await this.vkApiService.friendsGet(mergedParams);
      return result;
    } catch (error) {
      this.logger.error("Ошибка при получении списка друзей VK", error);
      throw error;
    }
  }
}
