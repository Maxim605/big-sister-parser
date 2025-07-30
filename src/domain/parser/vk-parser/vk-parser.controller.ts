import { Controller, Get, Logger, Query, Post, Body } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_V1, PARSER_TAG, VK_PARSER_TAG } from "src/constants";
import { VkFriendsService } from "./services/vk-friends.service";
import { VkFriendsGetParamsDto, VkFriendsGetResponseDto } from "./dto";
import {
  InternalServiceErrorApiResponse,
  NotFoundErrorApiResponse,
} from "src/common/decorators/api";
import { TestSaveService } from "./services/cqrs/commands";

@ApiTags(PARSER_TAG)
@Controller(`${API_V1}/${VK_PARSER_TAG}`)
export class VkParserController {
  private readonly logger = new Logger(VkParserController.name);

  constructor(
    private readonly vkFriendsService: VkFriendsService,
    private readonly testSaveService: TestSaveService,
  ) {}

  @Post("save")
  async save() {
    return await this.testSaveService.saveTestDocument();
  }

  @Get("friends/fetch")
  @ApiOperation({
    summary: "Получение списка друзей пользователя VK из VK API",
    description:
      "Получает друзей напрямую из VK API, не сохраняя их в базу данных",
  })
  @ApiOkResponse({
    description: "Список друзей, полученный из VK API",
    type: () => VkFriendsGetResponseDto,
  })
  @InternalServiceErrorApiResponse("Ошибка при получении данных из VK API")
  @NotFoundErrorApiResponse("Друзья не найдены во VK API")
  public async fetchFriends(
    @Query() query: VkFriendsGetParamsDto,
  ): Promise<VkFriendsGetResponseDto> {
    try {
      const result = await this.vkFriendsService.fetchFriendsFromVkApi(
        query.user_id,
        query.token,
        query.count,
        query.offset,
        query.fields,
        query.name_case,
      );
      return result;
    } catch (error) {
      this.logger.error("Ошибка при получении друзей VK из VK API", error);
      throw error;
    }
  }

  @Get("friends/get")
  @ApiOperation({
    summary: "Получение списка друзей пользователя VK из базы данных",
    description: "Получает сохраненных друзей из Arango базы данных",
  })
  @ApiOkResponse({
    description: "Список друзей и их количество",
    type: () => VkFriendsGetResponseDto,
  })
  @InternalServiceErrorApiResponse("Ошибка при получении данных из базы")
  @NotFoundErrorApiResponse("Друзья не найдены в базе")
  public async getFriendsFromDb(
    @Query("user_id") user_id: number,
  ): Promise<VkFriendsGetResponseDto> {
    try {
      const result = await this.vkFriendsService.getFriends(user_id);
      return result;
    } catch (error) {
      this.logger.error("Ошибка при получении списка друзей VK из базы", error);
      throw error;
    }
  }

  @Post("friends/load")
  @ApiOperation({
    summary: "Загрузка друзей пользователя VK из API и сохранение в базу",
    description:
      "Загружает друзей из VK API и сохраняет их в Arango базу данных",
  })
  @ApiOkResponse({
    description: "Друзья успешно загружены и сохранены",
  })
  @InternalServiceErrorApiResponse("Ошибка при загрузке друзей из VK API")
  public async loadFriends(
    @Body() params: VkFriendsGetParamsDto,
  ): Promise<{ message: string }> {
    try {
      await this.vkFriendsService.loadFriends(params);
      return { message: "Друзья успешно загружены и сохранены" };
    } catch (error) {
      this.logger.error("Ошибка при загрузке друзей VK", error);
      throw error;
    }
  }
}
