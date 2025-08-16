import { Inject, Injectable } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { IFriendshipRepository } from "../../../domain/repositories/ifriendship.repository";

@Injectable()
export class ArangoFriendshipRepository implements IFriendshipRepository {
  private readonly users = "users";
  private readonly friendships = "friendships";

  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async deleteAllForUser(userId: number): Promise<void> {
    await this.db.query(aql`
      LET u = FIRST(FOR v IN ${this.db.collection(
        this.users,
      )} FILTER v._key == ${String(userId)} LIMIT 1 RETURN v)
      FILTER u != null
      FOR e IN ${this.db.collection(this.friendships)}
        FILTER e._from == u._id
        REMOVE e IN ${this.db.collection(this.friendships)}
    `);
  }

  async saveEdges(userId: number, friendIds: number[]): Promise<void> {
    if (!friendIds?.length) return;
    await this.db.query(aql`
      LET u = FIRST(FOR v IN ${this.db.collection(
        this.users,
      )} FILTER v._key == ${String(userId)} LIMIT 1 RETURN v)
      FILTER u != null
      FOR fid IN ${friendIds}
        LET f = FIRST(FOR v IN ${this.db.collection(
          this.users,
        )} FILTER v._key == TO_STRING(fid) LIMIT 1 RETURN v)
        FILTER f != null
        UPSERT { _from: u._id, _to: f._id }
          INSERT { _from: u._id, _to: f._id }
          UPDATE { }
          IN ${this.db.collection(this.friendships)}
    `);
  }

  async countForUser(userId: number): Promise<number> {
    const cursor = await this.db.query(aql`
      LET u = FIRST(
        FOR v IN ${this.db.collection(this.users)}
          FILTER v._key == ${String(userId)}
          LIMIT 1
          RETURN v
      )
      FILTER u != null
      RETURN LENGTH(
        FOR e IN ${this.db.collection(this.friendships)}
          FILTER e._from == u._id
          RETURN 1
      )
    `);
    const [total] = await cursor.all();
    return total || 0;
  }

  async findFriendIds(
    userId: number,
    limit?: number,
    offset?: number,
  ): Promise<number[]> {
    const safeOffset = typeof offset === "number" ? offset : 0;
    if (typeof limit === "number") {
      const cursor = await this.db.query(aql`
        LET u = FIRST(
          FOR v IN ${this.db.collection(this.users)}
            FILTER v._key == ${String(userId)}
            LIMIT 1
            RETURN v
        )
        FILTER u != null
        FOR e IN ${this.db.collection(this.friendships)}
          FILTER e._from == u._id
          LIMIT ${safeOffset}, ${limit}
          RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
      `);
      return await cursor.all();
    }
    const cursorAll = await this.db.query(aql`
      LET u = FIRST(
        FOR v IN ${this.db.collection(this.users)}
          FILTER v._key == ${String(userId)}
          LIMIT 1
          RETURN v
      )
      FILTER u != null
      FOR e IN ${this.db.collection(this.friendships)}
        FILTER e._from == u._id
        RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
    `);
    return await cursorAll.all();
  }
}
