import { IsString, IsInt, IsOptional } from "class-validator";

export class VkUserEntity {
  @IsInt()
  id: number;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  domain?: string;
}
