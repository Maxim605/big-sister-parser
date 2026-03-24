import {
  VkGroupDetail,
  VkGroupsGetByIdParams,
  VkGroupsGetMembersParams,
  VkGroupsMembersResponse,
} from "src/infrastructure/vk/types";

/** Порт для взаимодействия с VK API по методам сообществ */
export interface IVkGroupApiClient {
  /** Получить информацию о группе (groups.getById) */
  groupsGetById(params: VkGroupsGetByIdParams): Promise<VkGroupDetail[]>;

  /** Получить список участников группы (groups.getMembers) */
  groupsGetMembers(
    params: VkGroupsGetMembersParams,
  ): Promise<VkGroupsMembersResponse>;

  /** Получить посты со стены группы (wall.get) */
  wallGet(params: {
    owner_id: number;
    offset?: number;
    count?: number;
    access_token: string;
  }): Promise<{ count: number; items: any[] }>;
}
