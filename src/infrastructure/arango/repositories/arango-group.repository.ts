import { Inject, Injectable } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { IGroupRepository } from "../../../domain/repositories/igroup.repository";
import { VkGroup } from "../../../domain/entities/vk-group";

@Injectable()
export class ArangoGroupRepository implements IGroupRepository {
  private readonly groups = "groups";
  private readonly subscriptions = "subscriptions";
  private readonly users = "users";
  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async findById(id: number): Promise<VkGroup | null> {
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.groups)}
        FILTER d.id == ${id}
        LIMIT 1
        RETURN d
    `);
    const doc: any = await cursor.next();
    if (!doc) return null;
    return new VkGroup(doc.id, doc.name, doc.screen_name);
  }

  async findManyByIds(ids: number[]): Promise<VkGroup[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.groups)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map((d) => new VkGroup(d.id, d.name, d.screen_name));
  }

  async save(group: VkGroup): Promise<void> {
    await this.db.query(aql`
      UPSERT { id: ${group.id} }
      INSERT { id: ${group.id}, name: ${group.name}, screen_name: ${
        group.screen_name
      } }
      UPDATE { name: ${group.name}, screen_name: ${group.screen_name} }
      IN ${this.db.collection(this.groups)}
    `);
  }

  async saveMany(groups: VkGroup[]): Promise<void> {
    if (!groups?.length) return;
    const payload = groups.map((g) => ({
      id: g.id,
      name: g.name,
      screen_name: g.screen_name,
    }));
    await this.db.query(aql`
      FOR g IN ${payload}
        UPSERT { id: g.id }
          INSERT { id: g.id, name: g.name, screen_name: g.screen_name }
          UPDATE { name: g.name, screen_name: g.screen_name }
          IN ${this.db.collection(this.groups)}
    `);
  }

  async deleteById(id: number): Promise<void> {
    await this.db.query(aql`
      FOR d IN ${this.db.collection(this.groups)}
        FILTER d.id == ${id}
        REMOVE d IN ${this.db.collection(this.groups)}
    `);
  }

  async countSubscriptionsForUser(userId: number): Promise<number> {
    const cursor = await this.db.query(aql`
      LET u = FIRST(
        FOR v IN ${this.db.collection(this.users)}
          FILTER v._key == ${String(userId)}
          LIMIT 1
          RETURN v
      )
      FILTER u != null
      RETURN LENGTH(
        FOR e IN ${this.db.collection(this.subscriptions)}
          FILTER e._from == u._id
          RETURN 1
      )
    `);
    const [total] = await cursor.all();
    return total || 0;
  }

  async findSubscriptionGroupIds(
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
        FOR e IN ${this.db.collection(this.subscriptions)}
          FILTER e._from == u._id
          LIMIT ${safeOffset}, ${limit}
          LET g = DOCUMENT(e._to)
          FILTER g != null
          RETURN TO_NUMBER(g.id)
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
      FOR e IN ${this.db.collection(this.subscriptions)}
        FILTER e._from == u._id
        LET g = DOCUMENT(e._to)
        FILTER g != null
        RETURN TO_NUMBER(g.id)
    `);
    return await cursorAll.all();
  }
}
