import { IsInt, IsOptional, IsNumber } from "class-validator";

export class Subscription {
  @IsInt()
  _from: number;

  @IsInt()
  _to: number;

  @IsOptional()
  @IsNumber()
  similarity?: number;
}
