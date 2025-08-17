import {
  VkFriendsGetParams,
  VkFriendsGetResponse,
  VkUsersGetParams,
  VkUsersGetResponse,
  VkUsersGetSubscriptionsParams,
  VkUsersGetSubscriptionsResponse,
} from "src/infrastructure/vk/types";

export interface IVkApiClient {
  friendsGet(params: VkFriendsGetParams): Promise<VkFriendsGetResponse>;
  usersGet(params: VkUsersGetParams): Promise<VkUsersGetResponse>;
  usersGetSubscriptions(
    params: VkUsersGetSubscriptionsParams,
  ): Promise<VkUsersGetSubscriptionsResponse>;
}
