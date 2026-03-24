import { Inject, Injectable } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { ISubscriptionRepository } from "../../../domain/repositories/isubscription.repository";

@Injectable()
export class ArangoSubscriptionRepository implements ISubscriptionRepository {
  private readonly users = "users";
  private readonly groups = "groups";
  private readonly subscriptions = "subscriptions";

  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async upsertUserGroups(vkUserId: number, groupIds: number[]): Promise<void> {
    const unique = Array.from(new Set(groupIds ?? []));

    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const u = db._query(
          'FOR v IN ' + params.users + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.userKey }
        ).toArray()[0];
        if (!u) return;

        const toIds = db._query(
          'FOR gid IN @gids LET g = FIRST(FOR gg IN ' + params.groups + ' FILTER gg.id == gid LIMIT 1 RETURN gg) FILTER g != null RETURN g._id',
          { gids: params.groupIds }
        ).toArray();

        db._query(
          'FOR e IN ' + params.subscriptions + ' FILTER e._from == @from REMOVE e IN ' + params.subscriptions,
          { from: u._id }
        );

        if (toIds.length) {
          db._query(
            'FOR toId IN @toIds INSERT { _from: @from, _to: toId } IN ' + params.subscriptions,
            { toIds, from: u._id }
          );
        }
      }
    `;

    await this.db.executeTransaction(
      { read: [this.users, this.groups], write: [this.subscriptions] },
      action,
      {
        params: {
          users: this.users,
          groups: this.groups,
          subscriptions: this.subscriptions,
          userKey: String(vkUserId),
          groupIds: unique,
        },
      },
    );
  }

  async getGroupIdsByUser(
    vkUserId: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]> {
    const safeOffset = opts?.offset ?? 0;
    if (typeof opts?.limit === "number") {
      const cursor = await this.db.query(aql`
        LET u = FIRST(
          FOR v IN ${this.db.collection(this.users)}
            FILTER v._key == ${String(vkUserId)}
            LIMIT 1
            RETURN v
        )
        FILTER u != null
        FOR e IN ${this.db.collection(this.subscriptions)}
          FILTER e._from == u._id
          LIMIT ${safeOffset}, ${opts.limit}
          RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
      `);
      return await cursor.all();
    }
    const cursorAll = await this.db.query(aql`
      LET u = FIRST(
        FOR v IN ${this.db.collection(this.users)}
          FILTER v._key == ${String(vkUserId)}
          LIMIT 1
          RETURN v
      )
      FILTER u != null
      FOR e IN ${this.db.collection(this.subscriptions)}
        FILTER e._from == u._id
        RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
    `);
    return await cursorAll.all();
  }

  async resetUserGroups(vkUserId: number): Promise<void> {
    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const u = db._query(
          'FOR v IN ' + params.users + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.userKey }
        ).toArray()[0];
        if (!u) return;
        db._query(
          'FOR e IN ' + params.subscriptions + ' FILTER e._from == @from REMOVE e IN ' + params.subscriptions,
          { from: u._id }
        );
      }
    `;
    await this.db.executeTransaction(
      { read: [this.users], write: [this.subscriptions] },
      action,
      {
        params: {
          users: this.users,
          subscriptions: this.subscriptions,
          userKey: String(vkUserId),
        },
      },
    );
  }

  async addUserGroups(vkUserId: number, groupIds: number[]): Promise<void> {
    const unique = Array.from(new Set(groupIds ?? []));
    if (!unique.length) return;
    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const u = db._query(
          'FOR v IN ' + params.users + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.userKey }
        ).toArray()[0];
        if (!u) return;
        const toIds = db._query(
          'FOR gid IN @gids LET g = FIRST(FOR gg IN ' + params.groups + ' FILTER gg.id == gid LIMIT 1 RETURN gg) FILTER g != null RETURN g._id',
          { gids: params.groupIds }
        ).toArray();
        if (!toIds.length) return;
        db._query(
          'FOR toId IN @toIds INSERT { _from: @from, _to: toId } IN ' + params.subscriptions,
          { toIds, from: u._id }
        );
      }
    `;
    await this.db.executeTransaction(
      { read: [this.users, this.groups], write: [this.subscriptions] },
      action,
      {
        params: {
          users: this.users,
          groups: this.groups,
          subscriptions: this.subscriptions,
          userKey: String(vkUserId),
          groupIds: unique,
        },
      },
    );
  }

  async upsertGroupMembers(groupId: number, userIds: number[]): Promise<void> {
    const unique = Array.from(new Set(userIds ?? []));
    if (!unique.length) return;
    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const g = db._query(
          'FOR v IN ' + params.groups + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.groupKey }
        ).toArray()[0];
        if (!g) return;
        for (const uid of params.userIds) {
          const uKey = String(uid);
          let u = db._query(
            'FOR v IN ' + params.users + ' FILTER v._key == @key LIMIT 1 RETURN v',
            { key: uKey }
          ).toArray()[0];
          if (!u) {
            const inserted = db._query(
              'INSERT { _key: @key, id: @id } IN ' + params.users + ' RETURN NEW',
              { key: uKey, id: uid }
            ).toArray()[0];
            u = inserted;
          }
          const exists = db._query(
            'FOR e IN ' + params.subscriptions + ' FILTER e._from == @from AND e._to == @to LIMIT 1 RETURN 1',
            { from: g._id, to: u._id }
          ).toArray()[0];
          if (!exists) {
            db._query(
              'INSERT { _from: @from, _to: @to } IN ' + params.subscriptions,
              { from: g._id, to: u._id }
            );
          }
        }
      }
    `;
    await this.db.executeTransaction(
      { read: [this.groups, this.users], write: [this.users, this.subscriptions] },
      action,
      {
        params: {
          groups: this.groups,
          users: this.users,
          subscriptions: this.subscriptions,
          groupKey: String(groupId),
          userIds: unique,
        },
      },
    );
  }

  async getMemberIdsByGroup(
    groupId: number,
    opts?: { limit?: number; offset?: number },
  ): Promise<number[]> {
    const safeOffset = opts?.offset ?? 0;
    const groupKey = String(groupId);
    if (typeof opts?.limit === "number") {
      const cursor = await this.db.query(aql`
        LET g = FIRST(
          FOR v IN ${this.db.collection(this.groups)}
            FILTER v._key == ${groupKey}
            LIMIT 1
            RETURN v
        )
        FILTER g != null
        FOR e IN ${this.db.collection(this.subscriptions)}
          FILTER e._from == g._id
          LIMIT ${safeOffset}, ${opts.limit}
          RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
      `);
      return cursor.all();
    }
    const cursor = await this.db.query(aql`
      LET g = FIRST(
        FOR v IN ${this.db.collection(this.groups)}
          FILTER v._key == ${groupKey}
          LIMIT 1
          RETURN v
      )
      FILTER g != null
      FOR e IN ${this.db.collection(this.subscriptions)}
        FILTER e._from == g._id
        RETURN TO_NUMBER(SPLIT(e._to, '/')[1])
    `);
    return cursor.all();
  }

  async resetGroupMembers(groupId: number): Promise<void> {
    const action = `
      function (params) {
        const db = require('@arangodb').db;
        const g = db._query(
          'FOR v IN ' + params.groups + ' FILTER v._key == @key LIMIT 1 RETURN v',
          { key: params.groupKey }
        ).toArray()[0];
        if (!g) return;
        db._query(
          'FOR e IN ' + params.subscriptions + ' FILTER e._from == @from REMOVE e IN ' + params.subscriptions,
          { from: g._id }
        );
      }
    `;
    await this.db.executeTransaction(
      { read: [this.groups], write: [this.subscriptions] },
      action,
      {
        params: {
          groups: this.groups,
          subscriptions: this.subscriptions,
          groupKey: String(groupId),
        },
      },
    );
  }
}
