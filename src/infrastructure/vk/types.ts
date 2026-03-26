export interface VkFriendsGetParams {
  user_id: number;
  order?: "name" | "hints";
  list_id?: number | number[];
  count?: number;
  offset?: number;
  fields?: string[];
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";
  token?: string;
  access_token: string;
}

export interface VkFriendsGetResponse {
  count: number;
  items: Array<number | VkFriend>;
}

export interface VkFriend {
  id: number;
  first_name: string;
  last_name: string;
  deactivated?: string;
  hidden?: number;
  bdate?: string;
  sex?: number;
  city?: { id: number; title: string };
  country?: { id: number; title: string };
  online?: number;
  last_seen?: { time: number; platform: number };
  photo_50?: string;
  photo_100?: string;
  photo_200_orig?: string;
  is_closed?: boolean;
  can_access_closed?: boolean;
}

export interface VkUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  [key: string]: any;
}

export interface VkUsersGetParams {
  user_id: number;
  fields?: string[];
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";
  token?: string;
  access_token: string;
}

export interface VkUsersGetResponse {
  count?: number;
  items?: VkUserInfo[];
  response?: VkUserInfo[];
}

export interface VkUsersGetSubscriptionsParams {
  user_id: number;
  token?: string;
  access_token: string;
  extended?: boolean;
  offset?: number;
  count?: number;
  fields?: string[];
}

export interface VkGroupInfo {
  id: number;
  name: string;
  screen_name: string;
  [key: string]: any;
}

export interface VkUsersGetSubscriptionsResponse {
  groups: {
    count: number;
    items: Array<number | VkGroupInfo>;
  };
}

export interface VkFriendsResponse {
  count: number;
  items: Array<number>;
}

export class VkApiError extends Error {
  constructor(
    public code: number,
    public msg: string,
  ) {
    super(`VK API error ${code}: ${msg}`);
    this.name = "VkApiError";
  }
}

// ─── VK Group (Сообщество) ────────────────────────────────────────────────────

/** Параметры запроса информации о группе (groups.getById) */
export interface VkGroupsGetByIdParams {
  /** ID или короткое имя группы */
  group_id: string | number;
  /** Список полей для запроса */
  fields?: string[];
  /** Токен доступа */
  access_token: string;
}

/** Объект группы ВКонтакте (поля зависят от запрошенных fields) */
export interface VkGroupDetail {
  id: number;
  name: string;
  screen_name: string;
  is_closed?: number;
  type?: string;
  activity?: string;
  members_count?: number;
  city?: { id: number; title: string };
  country?: { id: number; title: string };
  wall?: number;
  counters?: Record<string, number>;
  description?: string;
  status?: string;
  verified?: number;
  [key: string]: any;
}

/** Параметры запроса участников группы (groups.getMembers) */
export interface VkGroupsGetMembersParams {
  /** ID или короткое имя группы */
  group_id: string | number;
  /** Смещение */
  offset?: number;
  /** Количество участников (макс. 1000) */
  count?: number;
  /** Дополнительные поля профиля */
  fields?: string[];
  /** Фильтр: friends / unsure / managers */
  filter?: string;
  /** Токен доступа */
  access_token: string;
}

/** Ответ на запрос участников группы */
export interface VkGroupsMembersResponse {
  count: number;
  items: Array<number | Record<string, any>>;
}

// ─── VK Interactions (Лайки и комментарии) ───────────────────────────────────

export interface VkLikesGetListParams {
  type: "post" | "comment" | "photo" | "video";
  owner_id: number;
  item_id: number;
  offset?: number;
  count?: number;
  access_token: string;
}

export interface VkLikesGetListResponse {
  count: number;
  items: number[];
}

export interface VkWallGetCommentsParams {
  owner_id: number;
  post_id: number;
  offset?: number;
  count?: number;
  fields?: string[];
  access_token: string;
}

export interface VkWallGetCommentsResponse {
  count: number;
  items: Array<Record<string, any>>;
  profiles?: Array<Record<string, any>>;
  groups?: Array<Record<string, any>>;
}
