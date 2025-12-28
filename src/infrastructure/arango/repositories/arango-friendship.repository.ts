import { Inject, Injectable, Logger } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { IFriendshipRepository } from "../../../domain/repositories/ifriendship.repository";

@Injectable()
export class ArangoFriendshipRepository implements IFriendshipRepository {
  private readonly logger = new Logger(ArangoFriendshipRepository.name);
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

  async replaceForUser(userId: number, friendIds: number[]): Promise<void> {
    const uniqueIds = Array.from(new Set(friendIds ?? []));

    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const u = db._query(
          'FOR v IN ' + params.users + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.userId }
        ).toArray()[0];
        if (!u) {
          return { error: 'User not found', userId: params.userId };
        }

        const removed = db._query(
          'FOR e IN ' + params.friendships + ' FILTER e._from == @from REMOVE e IN ' + params.friendships + ' RETURN OLD',
          { from: u._id }
        ).toArray();

        const friendNodes = db._query(
          'FOR fid IN @ids LET f = DOCUMENT(@users, TO_STRING(fid)) FILTER f != null RETURN f._id',
          { ids: params.friendIds, users: params.users }
        ).toArray();

        let createdExisting = 0;
        if (friendNodes.length > 0) {
          const inserted = db._query(
            'FOR toId IN @toIds INSERT { _from: @from, _to: toId } IN ' + params.friendships + ' RETURN NEW',
            { toIds: friendNodes, from: u._id }
          ).toArray();
          createdExisting = inserted.length;
        }
        
        const existingIds = new Set(friendNodes.map(n => parseInt(n.split('/')[1])));
        const missingIds = params.friendIds.filter(fid => !existingIds.has(fid));
        let createdMissing = 0;
        let missingError = null;
        if (missingIds.length > 0) {
          const edges = [];
          for (const fid of missingIds) {
            const friendId = CONCAT(params.users, '/', TO_STRING(fid));
            edges.push({ _from: u._id, _to: friendId });
          }
          try {
            const inserted = db._query(
              'FOR e IN @edges INSERT e IN ' + params.friendships + ' RETURN NEW',
              { edges: edges }
            ).toArray();
            createdMissing = inserted.length;
          } catch (e) {
            missingError = String(e);
          }
        }
        
        const actualCount = db._query(
          'FOR e IN ' + params.friendships + ' FILTER e._from == @from RETURN 1',
          { from: u._id }
        ).toArray().length;
        
        return {
          removed: removed.length,
          createdExisting: createdExisting,
          createdMissing: createdMissing,
          totalCreated: createdExisting + createdMissing,
          actualCount: actualCount,
          missingCount: missingIds.length,
          existingCount: friendNodes.length,
          missingError: missingError
        };
      }
    `;

    try {
      await this.db.executeTransaction(
        {
          read: [this.users],
          write: [this.friendships],
        },
        action,
        {
          params: {
            users: this.users,
            friendships: this.friendships,
            userId: String(userId),
            friendIds: uniqueIds,
          },
        },
      );
    } catch (error: any) {
      this.logger.error(
        `replaceForUser failed for userId=${userId}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
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

  async findFriendIdsMany(userIds: number[]): Promise<Map<number, number[]>> {
    if (!userIds.length) return new Map();
    const cursor = await this.db.query(aql`
      FOR u IN ${this.db.collection(this.users)}
        FILTER u.id IN ${userIds}
        LET friendIds = (
          FOR e IN ${this.db.collection(this.friendships)}
            FILTER e._from == u._id
            RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
        )
        RETURN { userId: u.id, friendIds }
    `);
    const docs: any[] = await cursor.all();
    const result = new Map<number, number[]>();

    for (const doc of docs) {
      result.set(doc.userId, doc.friendIds || []);
    }

    // Добавляем пустые списки для отсутствующих пользователей
    for (const userId of userIds) {
      if (!result.has(userId)) {
        result.set(userId, []);
      }
    }

    return result;
  }
}
