export const TOKENS = {
  // Domain repositories
  IUserRepository: Symbol("IUserRepository"),
  IGroupRepository: Symbol("IGroupRepository"),
  IPostRepository: Symbol("IPostRepository"),
  IFriendshipRepository: Symbol("IFriendshipRepository"),
  IApiKeyRepository: Symbol("IApiKeyRepository"),
  ISubscriptionRepository: Symbol("ISubscriptionRepository"),

  ISocialApiClient: Symbol("ISocialApiClient"),
  IVkWallApiClient: Symbol("IVkWallApiClient"),

  IKeyManager: Symbol("IKeyManager"),
  IRateLimiter: Symbol("IRateLimiter"),

  ArangoDbClient: "ARANGODB_CLIENT",
  RedisClient: Symbol("RedisClient"),
  PgPool: Symbol("PgPool"),
};
