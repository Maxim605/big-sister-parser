import { Inject, Injectable } from '@nestjs/common';
import { aql, Database } from 'arangojs';
import { TOKENS } from '../../../common/tokens';
import { IUserRepository } from '../../../domain/repositories/iuser.repository';
import { VkUser } from '../../../domain/entities/vk-user';

@Injectable()
export class ArangoUserRepository implements IUserRepository {
  private readonly users = 'users';
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
    return new VkUser(doc.id, doc.firstName ?? doc.first_name, doc.lastName ?? doc.last_name, doc.domain);
  }

  async findManyByIds(ids: number[]): Promise<VkUser[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map((d) => new VkUser(d.id, d.firstName ?? d.first_name, d.lastName ?? d.last_name, d.domain));
  }

  async save(user: VkUser): Promise<void> {
    await this.db.query(aql`
      UPSERT { id: ${user.id} }
      INSERT { id: ${user.id}, firstName: ${user.firstName}, lastName: ${user.lastName}, domain: ${user.domain ?? null} }
      UPDATE { firstName: ${user.firstName}, lastName: ${user.lastName}, domain: ${user.domain ?? null} }
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
