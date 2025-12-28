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
    const friendsAdded =
      doc.friends_added !== undefined && doc.friends_added !== null
        ? typeof doc.friends_added === "number"
          ? doc.friends_added
          : typeof doc.friends_added === "string" &&
            doc.friends_added.startsWith("err:")
          ? doc.friends_added
          : new Date(doc.friends_added)
        : undefined;
    return new VkUser(
      doc.id,
      doc.first_name,
      doc.last_name,
      doc.domain,
      friendsAdded,
    );
  }

  async findManyByIds(ids: number[]): Promise<VkUser[]> {
    if (!ids.length) return [];
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id IN ${ids}
        RETURN d
    `);
    const docs: any[] = await cursor.all();
    return docs.map((d) => {
      const friendsAdded =
        d.friends_added !== undefined && d.friends_added !== null
          ? typeof d.friends_added === "number"
            ? d.friends_added
            : typeof d.friends_added === "string" &&
              d.friends_added.startsWith("err:")
            ? d.friends_added
            : new Date(d.friends_added)
          : undefined;
      return new VkUser(
        d.id,
        d.first_name,
        d.last_name,
        d.domain,
        friendsAdded,
      );
    });
  }

  async save(user: VkUser): Promise<void> {
    const friendsAddedValue =
      user.friends_added instanceof Date
        ? user.friends_added.toISOString()
        : user.friends_added;
    await this.db.query(aql`
      UPSERT { _key: ${String(user.id)} }
      INSERT { _key: ${String(user.id)}, id: ${user.id}, first_name: ${
        user.first_name
      }, last_name: ${user.last_name}, domain: ${
        user.domain ?? null
      }, friends_added: ${friendsAddedValue ?? null} }
      UPDATE { id: ${user.id}, first_name: ${user.first_name}, last_name: ${
        user.last_name
      }, domain: ${user.domain ?? null}, friends_added: ${
        friendsAddedValue ?? null
      } }
      IN ${this.db.collection(this.users)}
    `);
  }

  async saveMany(users: VkUser[] | Array<VkUser & Record<string, any>>): Promise<void> {
    if (!users?.length) return;
    const payload = users.map((u) => {
      const baseFields = {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        domain: u.domain ?? null,
        friends_added:
          u.friends_added instanceof Date
            ? u.friends_added.toISOString()
            : u.friends_added ?? null,
      };
      
      // Сохраняем все дополнительные поля из объекта (кроме служебных)
      const additionalFields: Record<string, any> = {};
      for (const key in u) {
        if (
          key !== "id" &&
          key !== "first_name" &&
          key !== "last_name" &&
          key !== "domain" &&
          key !== "friends_added" &&
          u.hasOwnProperty(key)
        ) {
          const value = (u as any)[key];
          if (value !== undefined && typeof value !== "function") {
            if (key === "city" && value !== null && typeof value === "object" && !Array.isArray(value) && "id" in value) {
              additionalFields["city"] = value.id;
            } else if (key === "schools" && Array.isArray(value)) {
              additionalFields["schools"] = value
                .filter((item) => item !== null && typeof item === "object" && "id" in item)
                .map((item) => item.id);
            } else if (key === "universities" && Array.isArray(value)) {
              additionalFields["universities"] = value
                .filter((item) => item !== null && typeof item === "object" && "id" in item)
                .map((item) => item.id);
            } else if (value !== null && typeof value === "object") {
              additionalFields[key] = value;
            } else {
              additionalFields[key] = value;
            }
          }
        }
      }
      
      return { ...baseFields, ...additionalFields };
    });
    await this.db.query(aql`
      FOR u IN ${payload}
        UPSERT { _key: TO_STRING(u.id) }
          INSERT MERGE({ _key: TO_STRING(u.id) }, u)
          UPDATE MERGE(u, { _key: TO_STRING(u.id) })
          IN ${this.db.collection(this.users)}
    `);
  }

  async updateFriendsAdded(
    userId: number,
    value: Date | number | string,
  ): Promise<void> {
    const valueToSave =
      value instanceof Date
        ? value.toISOString()
        : typeof value === "string"
        ? value
        : value;
    await this.db.query(aql`
      FOR u IN ${this.db.collection(this.users)}
        FILTER u._key == ${String(userId)}
        UPDATE u WITH { friends_added: ${valueToSave} } IN ${this.db.collection(
          this.users,
        )}
    `);
  }

  async deleteById(id: number): Promise<void> {
    await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id == ${id}
        REMOVE d IN ${this.db.collection(this.users)}
    `);
  }

  async findFriendsStatusByIds(
    ids: number[],
  ): Promise<
    Map<
      number,
      { status: "ok" | "error" | "unknown"; errorCode?: string; lastUpdated?: Date }
    >
  > {
    if (!ids.length) return new Map();
    const cursor = await this.db.query(aql`
      FOR d IN ${this.db.collection(this.users)}
        FILTER d.id IN ${ids}
        RETURN { id: d.id, friends_added: d.friends_added }
    `);
    const docs: any[] = await cursor.all();
    const result = new Map<
      number,
      { status: "ok" | "error" | "unknown"; errorCode?: string; lastUpdated?: Date }
    >();

    for (const doc of docs) {
      const friendsAdded = doc.friends_added;
      let status: "ok" | "error" | "unknown" = "unknown";
      let errorCode: string | undefined;
      let lastUpdated: Date | undefined;

      if (friendsAdded !== undefined && friendsAdded !== null) {
        if (typeof friendsAdded === "string" && friendsAdded.startsWith("err:")) {
          status = "error";
          errorCode = friendsAdded.substring(4);
        } else {
          status = "ok";
          lastUpdated =
            typeof friendsAdded === "string"
              ? new Date(friendsAdded)
              : typeof friendsAdded === "number"
              ? new Date(friendsAdded * 1000)
              : friendsAdded instanceof Date
              ? friendsAdded
              : undefined;
        }
      }

      result.set(doc.id, { status, errorCode, lastUpdated });
    }

    // Добавляем unknown для отсутствующих пользователей
    for (const id of ids) {
      if (!result.has(id)) {
        result.set(id, { status: "unknown" });
      }
    }

    return result;
  }

  async updateFriendsAddedMany(
    updates: Array<{ userId: number; value: Date | number | string }>,
  ): Promise<void> {
    if (!updates.length) return;

    for (const { userId, value } of updates) {
      const valueToSave =
        value instanceof Date
          ? value.toISOString()
          : typeof value === "string"
          ? value
          : value;
      await this.db.query(aql`
        FOR u IN ${this.db.collection(this.users)}
          FILTER u._key == ${String(userId)}
          UPDATE u WITH { friends_added: ${valueToSave} } IN ${this.db.collection(
        this.users,
      )}
      `);
    }
  }
}
