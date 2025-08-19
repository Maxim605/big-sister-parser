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
}
