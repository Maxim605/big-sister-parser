import { Inject, Injectable, Logger } from "@nestjs/common";
import { aql, Database } from "arangojs";
import { TOKENS } from "../../../common/tokens";
import { IPostRepository } from "../../../domain/repositories/ipost.repository";
import { VkPost, makePostKey } from "../../../domain/entities/vk-post";
import settings from "../../../settings";

@Injectable()
export class ArangoPostRepository implements IPostRepository {
  private readonly posts = "posts";
  private readonly logger = new Logger(ArangoPostRepository.name);

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
    return new VkPost({
      id: doc.id,
      ownerId: doc.ownerId ?? doc.owner_id,
      fromId: doc.fromId ?? doc.from_id,
      text: doc.text ?? "",
      date: doc.date,
      attachments: doc.attachments,
      raw: doc.raw,
    });
  }

  async findManyByIds(ids: string[]): Promise<VkPost[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map(
      (d) =>
        new VkPost({
          id: d.id,
          ownerId: d.ownerId ?? d.owner_id,
          fromId: d.fromId ?? d.from_id,
          text: d.text ?? "",
          date: d.date,
          attachments: d.attachments,
          raw: d.raw,
        }),
    );
  }

  async save(post: VkPost): Promise<void> {
    await this.db.query(aql`
      UPSERT { _key: ${post._key} }
      INSERT { _key: ${post._key}, id: ${post.id}, ownerId: ${
        post.ownerId
      }, fromId: ${post.fromId}, text: ${post.text}, date: ${
        post.date
      }, attachments: ${post.attachments}, raw: ${
        post.raw
      }, createdAt: DATE_NOW() }
      UPDATE { text: ${post.text}, attachments: ${
        post.attachments
      }, updatedAt: DATE_NOW(), raw: ${post.raw} }
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

  async findByKeys(keys: string[]): Promise<VkPost[]> {
    if (!keys?.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d._key IN ${keys}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map(
      (d) =>
        new VkPost({
          id: d.id,
          ownerId: d.ownerId ?? d.owner_id,
          fromId: d.fromId ?? d.from_id,
          text: d.text ?? "",
          date: d.date,
          attachments: d.attachments,
          raw: d.raw,
        }),
    );
  }

  async bulkGetExistingKeys(keys: string[]): Promise<string[]> {
    if (!keys?.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d._key IN ${keys}
        RETURN d._key
    `);
    return await cursor.all();
  }

  async deleteByOwner(ownerId: number): Promise<void> {
    await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.ownerId == ${ownerId} || d.owner_id == ${ownerId}
        REMOVE d IN ${this.db.collection(this.posts)}
    `);
  }

  async upsertMany(
    posts: VkPost[],
    options?: { chunkSize?: number; parallelBatchesConcurrency?: number },
  ): Promise<{
    success: number;
    failed: Array<{ index: number; error: any }>;
  }> {
    if (!posts?.length) return { success: 0, failed: [] };

    const chunkSize = Math.max(
      1,
      Math.min(
        options?.chunkSize ??
          (settings as any)?.vkWall?.db?.batchSizeDefault ??
          500,
        (settings as any)?.vkWall?.db?.maxBatchSize ?? 2000,
      ),
    );
    const parallel = Math.max(
      1,
      Math.min(
        options?.parallelBatchesConcurrency ??
          (settings as any)?.vkWall?.workerPool?.defaultConcurrency ??
          4,
        (settings as any)?.vkWall?.workerPool?.maxConcurrency ?? 32,
      ),
    );

    const withKeys = posts.map((p) =>
      p._key ? p : Object.assign(p, { _key: makePostKey(p.ownerId, p.id) }),
    );

    const chunks: VkPost[][] = [];
    for (let i = 0; i < withKeys.length; i += chunkSize) {
      chunks.push(withKeys.slice(i, i + chunkSize));
    }

    const failed: Array<{ index: number; error: any }> = [];
    let success = 0;

    let idx = 0;
    const runBatch = async (chunk: VkPost[], globalOffset: number) => {
      const payload = chunk.map((p) => ({ ...p }));
      const query = `
        FOR p IN @payload
          UPSERT { _key: p._key }
          INSERT MERGE(p, { createdAt: DATE_NOW() })
          UPDATE MERGE({ text: p.text, attachments: p.attachments, updatedAt: DATE_NOW(), raw: p.raw }, UNSET(OLD, "_rev"))
        INTO ${this.posts}
        RETURN NEW._key
      `;

      const t0 = Date.now();
      try {
        const cursor = await this.db.query(query, { payload });
        const keys = await cursor.all();
        success += keys.length;
      } catch (e: any) {
        this.logger.error(
          `DB upsert batch failed size=${
            payload.length
          } offset=${globalOffset}: ${e?.message || e}`,
        );
        for (let j = 0; j < payload.length; j++) {
          failed.push({ index: globalOffset + j, error: e });
        }
      }
    };

    const workers: Promise<void>[] = [];
    while (idx < chunks.length) {
      while (workers.length < parallel && idx < chunks.length) {
        const startIndex = idx * chunkSize;
        workers.push(runBatch(chunks[idx], startIndex));
        idx++;
      }
      await Promise.race(workers).catch(() => void 0);
      for (let i = workers.length - 1; i >= 0; i--) {
        if (workers[i].finally) {}
      }
      await Promise.allSettled(workers.splice(0));
    }

    return { success, failed };
  }

  async findByOwner(
    ownerId: number,
    opts?: { offset?: number; count?: number },
  ): Promise<VkPost[]> {
    const offset = Math.max(0, Number(opts?.offset ?? 0));
    const count = Math.max(1, Number(opts?.count ?? 200));
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.posts)}
        FILTER d.ownerId == ${ownerId} || d.owner_id == ${ownerId}
        SORT d.date DESC
        LIMIT ${offset}, ${count}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map(
      (d) =>
        new VkPost({
          id: d.id,
          ownerId: d.ownerId ?? d.owner_id,
          fromId: d.fromId ?? d.from_id,
          text: d.text ?? "",
          date: d.date,
          attachments: d.attachments,
          raw: d.raw,
        }),
    );
  }
}
