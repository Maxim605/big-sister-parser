import { Injectable } from "@nestjs/common";
import { ThriftArangoService } from "../../../../../../thrift/services/thrift-arango.service";

@Injectable()
export class TestSaveService {
  constructor(private readonly thriftArangoService: ThriftArangoService) {}

  async saveTestDocument() {
    const doc = {
      id: 1,
      first_name: "Test",
      last_name: "User",
      sex: 2,
      bdate: "01.01.2000",
      city_id: 1,
      domain: "testuser",
      owner_user_id: 123,
    };
    const collection = "users";

    const result = await this.thriftArangoService.save(collection, doc);

    if (result.success) {
      console.log("Документ успешно сохранён, ключ:", result.key);
    } else {
      console.error("Ошибка сохранения:", result.error);
    }
    return result;
  }
}
