export const TOKENS = {
  // Domain repositories
  IUserRepository: Symbol('IUserRepository'),
  IGroupRepository: Symbol('IGroupRepository'),
  IPostRepository: Symbol('IPostRepository'),
  IFriendshipRepository: Symbol('IFriendshipRepository'),
  IApiKeyRepository: Symbol('IApiKeyRepository'),

  // External ports
  ISocialApiClient: Symbol('ISocialApiClient'),

  // Application services
  IKeyManager: Symbol('IKeyManager'),

  // Infrastructure
  ArangoDbClient: 'ARANGODB_CLIENT',
  RedisClient: Symbol('RedisClient'),
  PgPool: Symbol('PgPool'),
};
