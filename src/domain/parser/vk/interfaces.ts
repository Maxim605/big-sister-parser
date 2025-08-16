export interface VkFriendsGetParams {
  user_id: number;
  order?: "name" | "hints";
  list_id?: number | number[];
  count?: number;
  offset?: number;
  fields?: string[];
  name_case?: "nom" | "gen" | "dat" | "acc" | "ins" | "abl";
  token?: string;
  access_token?: string;
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
  access_token?: string;
}

export interface VkUsersGetResponse {
  count?: number;
  items?: VkUserInfo[];
  response?: VkUserInfo[];
}

export interface VkUsersGetSubscriptionsParams {
  user_id: number;
  token?: string;
  access_token?: string;
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
