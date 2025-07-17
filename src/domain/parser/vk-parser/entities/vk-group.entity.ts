import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
} from "class-validator";

export class VkGroup {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  screen_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsInt()
  city_id?: number;

  @IsOptional()
  @IsInt()
  country_id?: number;

  @IsOptional()
  @IsInt()
  photo?: string;

  @IsOptional()
  @IsNumber()
  prominence?: number;
}
