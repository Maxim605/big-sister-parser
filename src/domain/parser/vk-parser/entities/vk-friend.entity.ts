import { IsString, IsInt, IsOptional, IsNumber } from "class-validator";

export class VkFriendEntity {
  @IsInt()
  id: number;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsInt()
  sex: number;

  @IsString()
  bdate: string;

  @IsInt()
  city_id: number;

  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsInt()
  country_id?: number;

  @IsOptional()
  @IsInt()
  school_id?: number;

  @IsOptional()
  @IsInt()
  univercity_id?: number;

  @IsString()
  last_seen?: string;

  @IsInt()
  deactivated?: number;

  @IsInt()
  is_closen?: number;

  @IsOptional()
  @IsNumber()
  prominence?: number;

  @IsInt()
  owner_user_id: number;
}
