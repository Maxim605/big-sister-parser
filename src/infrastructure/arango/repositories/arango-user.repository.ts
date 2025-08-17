import { Inject, Injectable } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { IUserRepository } from "../../../domain/repositories/iuser.repository";
import { VkUser } from "../../../domain/entities/vk-user";

@Injectable()
export class ArangoUserRepository implements IUserRepository {
  private readonly users = "users";
  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async findById(id: number): Promise<VkUser | null> {
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id == ${id}
        LIMIT 1
        RETURN d
    `);
    const doc: any = await cursor.next();
    if (!doc) return null;
    return new VkUser(doc.id, doc.first_name, doc.last_name, doc.domain);
  }

  async findManyByIds(ids: number[]): Promise<VkUser[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map(
      (d) => new VkUser(d.id, d.first_name, d.last_name, d.domain),
    );
  }

  async save(user: VkUser): Promise<void> {
    await this.db.query(aql`
      UPSERT { _key: ${String(user.id)} }
      INSERT { _key: ${String(user.id)}, id: ${user.id}, first_name: ${
        user.first_name
      }, last_name: ${user.last_name}, domain: ${user.domain ?? null} }
      UPDATE { id: ${user.id}, first_name: ${user.first_name}, last_name: ${
        user.last_name
      }, domain: ${user.domain ?? null} }
      IN ${this.db.collection(this.users)}
    `);
  }

  async saveMany(users: VkUser[]): Promise<void> {
    if (!users?.length) return;
    const payload = users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      domain: u.domain ?? null,
    }));
    await this.db.query(aql`
      FOR u IN ${payload}
        UPSERT { _key: TO_STRING(u.id) }
          INSERT { _key: TO_STRING(u.id), id: u.id, first_name: u.first_name, last_name: u.last_name, domain: u.domain }
          UPDATE { id: u.id, first_name: u.first_name, last_name: u.last_name, domain: u.domain }
          IN ${this.db.collection(this.users)}
    `);
  }

  async deleteById(id: number): Promise<void> {
    await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id == ${id}
        REMOVE d IN ${this.db.collection(this.users)}
    `);
  }
}
