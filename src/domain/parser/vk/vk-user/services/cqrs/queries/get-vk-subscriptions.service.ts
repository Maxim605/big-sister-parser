import { Injectable, Inject } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { Database, aql } from "arangojs";

export interface GetSubscriptionsDto {
  count: number;
  items: Array<number>;
}

@Injectable()
export class GetVkSubscriptionsService implements CQRSService {
  constructor(@Inject("ARANGODB_CLIENT") private readonly db: Database) {}

  public async execute(
    user_id: number,
    limit = 20,
    offset = 0,
  ): Promise<GetSubscriptionsDto> {
    const startVertex = `users/${user_id}`;
    const countCursor = await this.db.query(aql`
      RETURN LENGTH(FOR v IN 1..1 OUTBOUND ${startVertex} subscriptions RETURN 1)
    `);
    const [count] = await countCursor.all();

    const cursor = await this.db.query(aql`
      FOR v IN 1..1 OUTBOUND ${startVertex} subscriptions
        LIMIT ${offset}, ${limit}
        RETURN v._key
    `);
    const items = await cursor.all();
    return { count: count || 0, items };
  }
}
