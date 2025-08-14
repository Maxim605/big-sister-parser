import { Injectable, Inject } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { Database } from "arangojs";

@Injectable()
export class GetVkUserService implements CQRSService {
  private readonly USERS = "users";
  constructor(@Inject("ARANGODB_CLIENT") private readonly db: Database) {}
  public async execute(user_id: number): Promise<any> {
    const col = this.db.collection(this.USERS);
    try {
      const doc = await col.document(String(user_id));
      return { fields: doc };
    } catch (e) {
      return { error: e.message };
    }
  }
}
