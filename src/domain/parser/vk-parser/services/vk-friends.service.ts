import { Injectable, Logger } from "@nestjs/common";
import { VkFriendsGetParams } from "../interfaces";
import { LoadVkFriendsService, GetVkFriendsService } from "./cqrs";
import { VkFriendsGetResponseDto } from "../dto/vk-friends-get-response.dto";
import { VkApiService } from "./vk-get-friends.service";

@Injectable()
export class VkFriendsService {
  private readonly logger = new Logger(VkFriendsService.name);

  constructor(
    private readonly loadVkFriends: LoadVkFriendsService,
    private readonly getVkFriends: GetVkFriendsService,
    private readonly vkApiService: VkApiService,
  ) {}

  /**
   * Загружает друзей пользователя из VK API и сохраняет в Arango
   */
  public async loadFriends(params: VkFriendsGetParams): Promise<void> {
    await this.loadVkFriends.execute(params);
  }

  /**
   * Получает друзей из Arango базы данных
   */
  public async getFriends(
    user_id: number,
    limit?: number,
    offset?: number,
  ): Promise<VkFriendsGetResponseDto> {
    return await this.getVkFriends.execute(user_id, limit, offset);
  }

  /**
   * Получает друзей напрямую из VK API (без сохранения в базу)
   */
  public async fetchFriendsFromVkApi(
    user_id: number,
    token: string,
    count?: number,
    offset?: number,
    fields?: string[],
    name_case?: string,
  ): Promise<VkFriendsGetResponseDto> {
    const allowedCases = ["nom", "gen", "dat", "acc", "ins", "abl"] as const;
    type NameCase = (typeof allowedCases)[number];
    const safeNameCase = allowedCases.includes(name_case as NameCase)
      ? (name_case as NameCase)
      : undefined;
    const params: VkFriendsGetParams = {
      user_id,
      count,
      offset,
      token,
      fields,
      name_case: safeNameCase,
    };
    const vkResponse = await this.vkApiService.friendsGet(params);
    return {
      count: vkResponse.count,
      items: vkResponse.items,
    };
  }

  /**
   * Полная операция: загрузка + получение друзей
   */
  public async loadAndGetFriends(
    params: VkFriendsGetParams,
    limit?: number,
    offset?: number,
  ): Promise<VkFriendsGetResponseDto> {
    await this.loadFriends(params);
    return await this.getFriends(params.user_id, limit, offset);
  }
}
