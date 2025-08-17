export const TOKENS = {
  // Domain repositories
  IUserRepository: Symbol("IUserRepository"),
  IGroupRepository: Symbol("IGroupRepository"),
  IPostRepository: Symbol("IPostRepository"),
  IFriendshipRepository: Symbol("IFriendshipRepository"),
  IApiKeyRepository: Symbol("IApiKeyRepository"),
  ISubscriptionRepository: Symbol("ISubscriptionRepository"),

  ISocialApiClient: Symbol("ISocialApiClient"),

  IKeyManager: Symbol("IKeyManager"),

  ArangoDbClient: "ARANGODB_CLIENT",
  RedisClient: Symbol("RedisClient"),
  PgPool: Symbol("PgPool"),
};
