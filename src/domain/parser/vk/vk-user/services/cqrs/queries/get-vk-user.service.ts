import { CQRSService } from "src/common/interfaces";

export class GetVkUserService implements CQRSService {
  public async execute(): Promise<never> {
    throw new Error(
      "GetVkUserService is deprecated. Create an application use-case and repository method to get user from DB.",
    );
  }
}
