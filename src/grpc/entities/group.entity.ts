import { IsString, IsNumber, IsOptional } from "class-validator";

export class Group {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  prominence?: number;

  [key: string]: any;
}
