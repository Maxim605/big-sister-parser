import "reflect-metadata";
import { Database } from "arangojs";
import settings from "../settings";

/**
 * Рефакторинг коллекций взаимодействий:
 * - Удаляет старую edge-коллекцию `likes`
 * - Создаёт edge-коллекцию `interactions` с полями:
 *     _from: "users/A", _to: "posts/P"
 *     type: "like" | "comment" | "write"
 *     created_at: ISO string
 *     comment_id?: string
 * - Создаёт document-коллекцию `comment` для текстов комментариев
 * - Мигрирует данные из post_likes → interactions (type=like)
 * - Мигрирует данные из post_comments и comments → interactions (type=comment) + comment
 * - Добавляет write-рёбра из posts (from_id → post) → interactions (type=write)
 */
export class RefactorInteractions1774548747 {
  private db: Database;
  public readonly id = "1774548747";
  public readonly name = "RefactorInteractions";
  public readonly timestamp = 1774548747;

  constructor() {
    this.db = new Database({
      url: settings.arango.url,
      databaseName: settings.arango.database,
      auth: {
        username: settings.arango.username,
        password: settings.arango.password,
      },
    });
  }

  async up(): Promise<void> {
    console.log("🔄 Running RefactorInteractions up...");

    // 1. Создаём новые коллекции
    await this.ensureEdgeCollection("interactions");
    await this.ensureDocumentCollection("comment");

    // 2. Лайки: post_likes → interactions (один батчевый AQL)
    if (await this.db.collection("post_likes").exists()) {
      console.log("📦 Migrating post_likes → interactions...");
      const r = await this.db.query(`
          LET cnt = LENGTH(
            FOR doc IN post_likes
              FOR userId IN (IS_ARRAY(doc.items) ? doc.items : JSON_PARSE(doc.items))
                LET k = CONCAT("like_", userId, "_", doc.owner_id, "_", doc.post_id)
                UPSERT { _key: k }
                INSERT {
                  _key: k,
                  _from: CONCAT("users/", userId),
                  _to: CONCAT("posts/", doc.owner_id, "_", doc.post_id),
                  type: "like",
                  created_at: null
                }
                UPDATE {}
                IN interactions
                RETURN 1
          )
          RETURN cnt
        `);
      console.log(`  ✅ Migrated ${await r.next()} likes`);
    }

    // 3. Комментарии: post_comments → comment + interactions (батч)
    if (await this.db.collection("post_comments").exists()) {
      console.log("📦 Migrating post_comments → comment + interactions...");
      const r = await this.db.query(`
          LET cnt = LENGTH(
            FOR doc IN post_comments
              FOR item IN (IS_ARRAY(doc.items) ? doc.items : JSON_PARSE(doc.items))
                FILTER item.id != null
                LET fromId    = TO_STRING(item.from_id != null ? item.from_id : item.owner_id)
                LET commentId = TO_STRING(item.id)
                LET createdAt = item.date != null ? DATE_ISO8601(item.date * 1000) : null
                LET ck = CONCAT(doc.owner_id, "_", doc.post_id, "_", commentId)
                UPSERT { _key: ck }
                INSERT { _key: ck, owner_id: doc.owner_id, post_id: doc.post_id,
                         comment_id: commentId, from_id: fromId,
                         text: item.text != null ? item.text : "",
                         date: item.date, created_at: createdAt }
                UPDATE { text: item.text != null ? item.text : "" }
                IN comment
                LET ek = CONCAT("comment_", fromId, "_", doc.owner_id, "_", doc.post_id, "_", commentId)
                UPSERT { _key: ek }
                INSERT {
                  _key: ek,
                  _from: CONCAT("users/", fromId),
                  _to: CONCAT("posts/", doc.owner_id, "_", doc.post_id),
                  type: "comment",
                  comment_id: commentId,
                  created_at: createdAt
                }
                UPDATE {}
                IN interactions
                RETURN 1
          )
          RETURN cnt
        `);
      console.log(
        `  ✅ Migrated ${await r.next()} comments from post_comments`,
      );
    }

    // 4. Комментарии: edge-коллекция comments → comment + interactions
    if (await this.db.collection("comments").exists()) {
      console.log("📦 Migrating comments (edge) → comment + interactions...");
      const r = await this.db.query(`
          LET cnt = LENGTH(
            FOR doc IN comments
              FILTER doc.comment_id != null AND doc.from_id != null
              LET createdAt = doc.date != null ? DATE_ISO8601(TO_NUMBER(doc.date) * 1000) : null
              LET ck = CONCAT(doc.owner_id, "_", doc.post_id, "_", doc.comment_id)
              UPSERT { _key: ck }
              INSERT { _key: ck, owner_id: doc.owner_id, post_id: doc.post_id,
                       comment_id: doc.comment_id, from_id: doc.from_id,
                       text: doc.text != null ? doc.text : "",
                       date: TO_NUMBER(doc.date), created_at: createdAt }
              UPDATE { text: doc.text != null ? doc.text : "" }
              IN comment
              LET ek = CONCAT("comment_", doc.from_id, "_", doc.owner_id, "_", doc.post_id, "_", doc.comment_id)
              UPSERT { _key: ek }
              INSERT {
                _key: ek,
                _from: CONCAT("users/", doc.from_id),
                _to: CONCAT("posts/", doc.owner_id, "_", doc.post_id),
                type: "comment",
                comment_id: doc.comment_id,
                created_at: createdAt
              }
              UPDATE {}
              IN interactions
              RETURN 1
          )
          RETURN cnt
        `);
      console.log(
        `  ✅ Migrated ${await r.next()} comments from comments edge`,
      );
    }

    // 5. Write-рёбра: posts → interactions (автор написал пост)
    console.log("📦 Creating write edges from posts...");
    const r = await this.db.query(`
        LET cnt = LENGTH(
          FOR p IN posts
            FILTER p.from_id != null AND p.from_id != ""
            LET fromId    = TO_STRING(p.from_id)
            LET createdAt = p.date != null ? DATE_ISO8601(TO_NUMBER(p.date) * 1000) : null
            LET ek = CONCAT("write_", fromId, "_", p._key)
            UPSERT { _key: ek }
            INSERT {
              _key: ek,
              _from: CONCAT("users/", fromId),
              _to: CONCAT("posts/", p._key),
              type: "write",
              created_at: createdAt
            }
            UPDATE {}
            IN interactions
            RETURN 1
        )
        RETURN cnt
      `);
    console.log(`  ✅ Created ${await r.next()} write edges`);

    // 6. Удаляем старую коллекцию likes
    const likesCol = this.db.collection("likes");
    if (await likesCol.exists()) {
      await likesCol.drop();
      console.log("🗑️  Dropped old 'likes' edge collection");
    }

    console.log("✅ RefactorInteractions migration complete");
  }

  async down(): Promise<void> {
    console.log("🔄 Running RefactorInteractions down...");

    for (const name of ["interactions", "comment"]) {
      const col = this.db.collection(name);
      if (await col.exists()) {
        await col.drop();
        console.log(`🗑️  Dropped '${name}'`);
      }
    }

    // Восстанавливаем likes
    await this.ensureEdgeCollection("likes");
    console.log(
      "✅ Rollback complete (interactions/comment dropped, likes restored)",
    );
  }

  private async ensureEdgeCollection(name: string): Promise<void> {
    const col = this.db.collection(name);
    if (!(await col.exists())) {
      await this.db.createEdgeCollection(name);
      console.log(`✅ Edge collection '${name}' created`);
    } else {
      console.log(`ℹ️  Edge collection '${name}' already exists`);
    }
  }

  private async ensureDocumentCollection(name: string): Promise<void> {
    const col = this.db.collection(name);
    if (!(await col.exists())) {
      await this.db.createCollection(name);
      console.log(`✅ Document collection '${name}' created`);
    } else {
      console.log(`ℹ️  Document collection '${name}' already exists`);
    }
  }
}
