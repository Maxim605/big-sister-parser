import { Injectable, Inject } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { Database, aql } from "arangojs";
import { VkFriendsGetResponseDto } from "../../../dto/vk-friends-get-response.dto";

@Injectable()
export class GetVkFriendsService implements CQRSService {
  constructor(@Inject("ARANGODB_CLIENT") private readonly db: Database) {}

  public async execute(
    user_id: number,
    count?: number,
    offset?: number,
  ): Promise<VkFriendsGetResponseDto> {
    const startVertex = `users/${user_id}`;
    const countCursor = await this.db.query(aql`
      RETURN LENGTH(FOR v IN 1..1 OUTBOUND ${startVertex} friendships RETURN 1)
    `);
    const [total] = await countCursor.all();

    if (typeof count === "number") {
      const safeOffset = typeof offset === "number" ? offset : 0;
      const cursor = await this.db.query(aql`
        FOR v IN 1..1 OUTBOUND ${startVertex} friendships
          LIMIT ${safeOffset}, ${count}
          RETURN v._key
      `);
      const items = await cursor.all();
      return { count: total || 0, items };
    }

    const cursorAll = await this.db.query(aql`
      FOR v IN 1..1 OUTBOUND ${startVertex} friendships
        RETURN v._key
    `);
    const itemsAll = await cursorAll.all();
    return { count: total || 0, items: itemsAll };
  }
}
