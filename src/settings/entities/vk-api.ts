import { IsString, IsUrl } from "class-validator";

export class VkApi {
  @IsUrl({ require_tld: false })
  public baseUrl: string;

  @IsString()
  public version: string;
}
