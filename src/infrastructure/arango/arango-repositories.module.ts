import { Module } from "@nestjs/common";
import { ArangoUserRepository } from "./repositories/arango-user.repository";
import { ArangoGroupRepository } from "./repositories/arango-group.repository";
import { ArangoPostRepository } from "./repositories/arango-post.repository";
import { ArangoFriendshipRepository } from "./repositories/arango-friendship.repository";
import { ArangoSubscriptionRepository } from "./repositories/arango-subscription.repository";
import { TOKENS } from "../../common/tokens";
import { ArangoModule } from "../../arango/arango.module";

@Module({
  imports: [ArangoModule.forRoot()],
  providers: [
    { provide: TOKENS.IUserRepository, useClass: ArangoUserRepository },
    { provide: TOKENS.IGroupRepository, useClass: ArangoGroupRepository },
    { provide: TOKENS.IPostRepository, useClass: ArangoPostRepository },
    {
      provide: TOKENS.IFriendshipRepository,
      useClass: ArangoFriendshipRepository,
    },
    {
      provide: TOKENS.ISubscriptionRepository,
      useClass: ArangoSubscriptionRepository,
    },
  ],
  exports: [
    TOKENS.IUserRepository,
    TOKENS.IGroupRepository,
    TOKENS.IPostRepository,
    TOKENS.IFriendshipRepository,
    TOKENS.ISubscriptionRepository,
  ],
})
export class ArangoRepositoriesModule {}
