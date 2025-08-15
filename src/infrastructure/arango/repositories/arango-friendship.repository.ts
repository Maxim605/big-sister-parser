import { Inject, Injectable } from '@nestjs/common';
import { aql, Database } from 'arangojs';
import { TOKENS } from '../../../common/tokens';
import { IFriendshipRepository } from '../../../domain/repositories/ifriendship.repository';

@Injectable()
export class ArangoFriendshipRepository implements IFriendshipRepository {
  private readonly users = 'users';
  private readonly friendships = 'friendships';

  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async deleteAllForUser(userId: number): Promise<void> {
    await this.db.query(aql`
      LET u = FIRST(FOR v IN ${this.db.collection(this.users)} FILTER v.id == ${userId} LIMIT 1 RETURN v)
      FILTER u != null
      FOR e IN ${this.db.collection(this.friendships)}
        FILTER e._from == u._id
        REMOVE e IN ${this.db.collection(this.friendships)}
    `);
  }

  async saveEdges(userId: number, friendIds: number[]): Promise<void> {
    if (!friendIds?.length) return;
    await this.db.query(aql`
      LET u = FIRST(FOR v IN ${this.db.collection(this.users)} FILTER v.id == ${userId} LIMIT 1 RETURN v)
      FILTER u != null
      FOR fid IN ${friendIds}
        LET f = FIRST(FOR v IN ${this.db.collection(this.users)} FILTER v.id == fid LIMIT 1 RETURN v)
        FILTER f != null
        UPSERT { _from: u._id, _to: f._id }
          INSERT { _from: u._id, _to: f._id }
          UPDATE { }
          IN ${this.db.collection(this.friendships)}
    `);
  }
}
