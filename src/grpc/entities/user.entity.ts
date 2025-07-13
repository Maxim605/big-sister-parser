import { IsString, IsInt, IsOptional, IsNumber } from "class-validator";

export class UserEntity {
  @IsNumber()
  id: number;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsInt()
  sex: number;

  @IsString()
  bdate: string;
  
  @IsOptional()
  @IsNumber()
  prominence?: number;

  [key: string]: any;
}
