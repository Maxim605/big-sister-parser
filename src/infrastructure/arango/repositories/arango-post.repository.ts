import { Inject, Injectable } from '@nestjs/common';
import { aql, Database } from 'arangojs';
import { TOKENS } from '../../../common/tokens';
import { IPostRepository } from '../../../domain/repositories/ipost.repository';
import { VkPost } from '../../../domain/entities/vk-post';

@Injectable()
export class ArangoPostRepository implements IPostRepository {
  private readonly posts = 'posts';
  constructor(@Inject(TOKENS.ArangoDbClient) private readonly db: Database) {}

  async findById(id: string): Promise<VkPost | null> {
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.id == ${id}
        LIMIT 1
        RETURN d
    `);
    const doc: any = await cursor.next();
    if (!doc) return null;
    return new VkPost(doc.id, doc.ownerId ?? doc.owner_id, doc.fromId ?? doc.from_id, doc.text ?? '', doc.date);
  }

  async findManyByIds(ids: string[]): Promise<VkPost[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map((d) => new VkPost(d.id, d.ownerId ?? d.owner_id, d.fromId ?? d.from_id, d.text ?? '', d.date));
  }

  async save(post: VkPost): Promise<void> {
    await this.db.query(aql`
      UPSERT { id: ${post.id} }
      INSERT { id: ${post.id}, ownerId: ${post.ownerId}, fromId: ${post.fromId}, text: ${post.text}, date: ${post.date} }
      UPDATE { ownerId: ${post.ownerId}, fromId: ${post.fromId}, text: ${post.text}, date: ${post.date} }
      IN ${this.db.collection(this.posts)}
    `);
  }

  async deleteById(id: string): Promise<void> {
    await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.id == ${id}
        REMOVE d IN ${this.db.collection(this.posts)}
    `);
  }
}
