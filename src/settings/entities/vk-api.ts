import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class VkApi {
  @IsUrl({ require_tld: false })
  public baseUrl: string;

  @IsString()
  public version: string;

  @IsNumber()
  @IsNotEmpty()
  public defaultStartId: number;

  /** ID группы по умолчанию (используется как дефолтный параметр в Swagger) */
  @IsNumber()
  @IsOptional()
  public defaultGroupId?: number;

  /** ID поста по умолчанию (используется как дефолтный параметр в Swagger) */
  @IsNumber()
  @IsOptional()
  public defaultPostId?: number;
}
