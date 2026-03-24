import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from "class-validator";

export class VkApi {
  @IsUrl({ require_tld: false })
  public baseUrl: string;

  @IsString()
  public version: string;

  @IsNumber()
  @IsNotEmpty()
  public defaultStartId: number;

  @IsOptional()
  @IsNumber()
  public defaultGroupId?: number;
}
