import { IsString, IsOptional, IsNumber } from "class-validator";

export class Subscription {
  @IsNumber()
  _from: number;

  @IsNumber()
  _to: number;

  @IsOptional()
  @IsNumber()
  similarity?: number;

  [key: string]: any;
}
