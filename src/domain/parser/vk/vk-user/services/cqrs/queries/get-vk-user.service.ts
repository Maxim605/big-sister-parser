import { Injectable } from "@nestjs/common";
import { CQRSService } from "src/common/interfaces";
import { ThriftArangoService } from "src/thrift/services/thrift-arango.service";

@Injectable()
export class GetVkUserService implements CQRSService {
  private readonly USERS = "users";
  constructor(private readonly thriftArangoService: ThriftArangoService) {}
  public async execute(user_id: number): Promise<any> {
    return await this.thriftArangoService.get(this.USERS, String(user_id));
  }
}
