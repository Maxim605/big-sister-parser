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

  IMetricsService: Symbol("IMetricsService"),
  IJobStatusRepository: Symbol("IJobStatusRepository"),
  IQueueClient: Symbol("IQueueClient"),
  IDomainEventBus: Symbol("IDomainEventBus"),

  ArangoDbClient: "ARANGODB_CLIENT",
  RedisClient: Symbol("RedisClient"),
  PgPool: Symbol("PgPool"),
};
